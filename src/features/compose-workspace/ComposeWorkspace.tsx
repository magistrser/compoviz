/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { PropsWithChildren } from "react";
import { useHistoryReducer } from "../../hooks/useHistory";
import { normalizeToAST } from "../../models";
import type {
    ComposeState,
    ParserIssue,
    ParseComposeResult,
    ValidationIssue,
    WorkerParseResult,
} from "../../models/composeTypes";
import { parseCompose } from "../../utils/composeParser";
import { enrichComposeState } from "../../utils/dockerfileEnricher";
import { normalizePath } from "../../utils/pathResolver";
import { generateSuggestions } from "../../utils/suggestions";
import { validateState } from "../../utils/validation";
import { mergeEnv, parseEnvFile } from "../../utils/variableInterpolator";
import { createParserWorker } from "../../utils/workerManager";
import { generateYaml } from "../../utils/yaml";
import type {
    ComposeWorkspaceConfiguration,
    ComposeWorkspaceFile,
    ComposeWorkspaceOutcome,
    ComposeWorkspaceSnapshot,
    ComposeWorkspaceSource,
    ComposeWorkspaceSourceDescriptor,
    ComposeWorkspaceValue,
} from "./types";

const STATE_STORAGE_KEY = "docker-compose-state";
const PROFILES_STORAGE_KEY = "docker-compose-active-profiles";
const ENVIRONMENT_STORAGE_KEY = "docker-compose-environment";

interface WorkspaceConfigurationState {
    activeProfiles: string[];
    environment: Record<string, string>;
}

interface ResolvedSource {
    kind: ComposeWorkspaceSource["kind"];
    yaml: string;
    importedFilename: string;
    basePath: string;
    fileMap: Record<string, string>;
    environmentFromFiles: Record<string, string>;
    exampleDir: string | null;
}

interface ProjectMetadata {
    profiles: string[];
    profileCounts: Record<string, number>;
    variables: string[];
    undefinedVariables: string[];
    parserIssues: ParserIssue[];
    source: ComposeWorkspaceSourceDescriptor | null;
    processing: ComposeWorkspaceSnapshot["processing"];
}

interface ParsedCandidate {
    state: ComposeState;
    metadata: Omit<ProjectMetadata, "source">;
    adapter: "worker" | "fallback";
}

interface ComposeWorkspaceInternalValue extends ComposeWorkspaceValue {
    readonly getState: () => ComposeState;
    readonly commitState: (state: ComposeState) => void;
    readonly undo: () => void;
    readonly redo: () => void;
    readonly canUndo: boolean;
    readonly canRedo: boolean;
}

const EMPTY_CONFIGURATION: WorkspaceConfigurationState = {
    activeProfiles: [],
    environment: {},
};

const INITIAL_STATE: ComposeState = {
    name: "",
    services: {},
    networks: {},
    volumes: {},
    secrets: {},
    configs: {},
};

const EMPTY_METADATA: ProjectMetadata = {
    profiles: [],
    profileCounts: {},
    variables: [],
    undefinedVariables: [],
    parserIssues: [],
    source: null,
    processing: { generation: 0, adapter: null, enrichment: "skipped" },
};

const WorkspaceContext = createContext<ComposeWorkspaceValue | null>(null);
const WorkspaceInternalContext = createContext<ComposeWorkspaceInternalValue | null>(null);

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeItems(value: unknown): Record<string, Record<string, unknown>> {
    if (!isRecord(value)) return {};
    return Object.fromEntries(Object.entries(value).map(([name, entry]) => [name, isRecord(entry) ? entry : {}]));
}

function normalizeState(value: unknown): ComposeState {
    const state = isRecord(value) ? value : {};
    return {
        name: typeof state.name === "string" ? state.name : "",
        services: normalizeItems(state.services),
        networks: normalizeItems(state.networks),
        volumes: normalizeItems(state.volumes),
        secrets: normalizeItems(state.secrets),
        configs: normalizeItems(state.configs),
    };
}

function replaceState(_current: ComposeState, next: ComposeState): ComposeState {
    return next;
}

function readStoredState(): ComposeState {
    const stored = localStorage.getItem(STATE_STORAGE_KEY);
    if (!stored) return INITIAL_STATE;
    try {
        return normalizeState(JSON.parse(stored));
    } catch {
        return INITIAL_STATE;
    }
}

function readStoredStringArray(key: string): string[] {
    const stored = localStorage.getItem(key);
    if (!stored) return [];
    try {
        const parsed: unknown = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
    } catch {
        return [];
    }
}

function readStoredEnvironment(): Record<string, string> {
    const stored = localStorage.getItem(ENVIRONMENT_STORAGE_KEY);
    if (!stored) return {};
    try {
        const parsed: unknown = JSON.parse(stored);
        if (!isRecord(parsed)) return {};
        return Object.fromEntries(
            Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
        );
    } catch {
        return {};
    }
}

function pathForFile(file: ComposeWorkspaceFile): string {
    return normalizePath(file.webkitRelativePath || file.name);
}

function isComposeYaml(file: ComposeWorkspaceFile): boolean {
    return /\.ya?ml$/i.test(file.name);
}

function isPreferredComposeFile(file: ComposeWorkspaceFile): boolean {
    return file.name === "docker-compose.yml" || file.name === "docker-compose.yaml";
}

function isFileEntry(entry: FileSystemEntry): entry is FileSystemFileEntry {
    return entry.isFile;
}

function isDirectoryEntry(entry: FileSystemEntry): entry is FileSystemDirectoryEntry {
    return entry.isDirectory;
}

function readFileEntry(entry: FileSystemFileEntry): Promise<File> {
    return new Promise((resolve, reject) => entry.file(resolve, reject));
}

async function readAllEntries(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
    const entries: FileSystemEntry[] = [];
    for (;;) {
        const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject));
        if (batch.length === 0) return entries;
        entries.push(...batch);
    }
}

async function collectDroppedFiles(dataTransfer: DataTransfer): Promise<ComposeWorkspaceFile[]> {
    const files: ComposeWorkspaceFile[] = [];
    const walk = async (entry: FileSystemEntry): Promise<void> => {
        if (isFileEntry(entry)) {
            const file = await readFileEntry(entry);
            files.push({
                name: file.name,
                webkitRelativePath: entry.fullPath.replace(/^\//, ""),
                text: () => file.text(),
            });
            return;
        }
        if (isDirectoryEntry(entry)) {
            for (const child of await readAllEntries(entry.createReader())) await walk(child);
        }
    };

    const entries = Array.from(dataTransfer.items)
        .map((item) => item.webkitGetAsEntry())
        .filter((entry): entry is FileSystemEntry => entry !== null);
    if (entries.length > 0) {
        for (const entry of entries) await walk(entry);
        return files;
    }
    return Array.from(dataTransfer.files);
}

async function readFiles(files: readonly ComposeWorkspaceFile[]): Promise<{
    fileMap: Record<string, string>;
    environmentFromFiles: Record<string, string>;
}> {
    const fileMap: Record<string, string> = {};
    const environmentFromFiles: Record<string, string> = {};
    const unnamedCounts = new Map<string, number>();

    for (const file of files) {
        const content = await file.text();
        let path = pathForFile(file);
        if (!file.webkitRelativePath && Object.hasOwn(fileMap, path)) {
            const count = unnamedCounts.get(file.name) ?? 1;
            path = `upload-${count}/${file.name}`;
            unnamedCounts.set(file.name, count + 1);
        } else if (!file.webkitRelativePath) {
            unnamedCounts.set(file.name, 1);
        }
        fileMap[path] = content;
        if (file.name === ".env" || path.endsWith("/.env")) {
            Object.assign(environmentFromFiles, parseEnvFile(content));
        }
    }

    return { fileMap, environmentFromFiles };
}

async function resolveSource(source: ComposeWorkspaceSource): Promise<ResolvedSource | null> {
    if (source.kind === "yaml") {
        const read = await readFiles(source.files ?? []);
        const fileMap = Object.fromEntries(
            Object.entries({ ...read.fileMap, ...source.fileMap }).map(([path, content]) => [
                normalizePath(path),
                content,
            ]),
        );
        const importedFilename = source.importedFilename || "docker-compose.yml";
        const matchingFile = source.files?.find(
            (file) => pathForFile(file) === normalizePath(source.basePath || importedFilename),
        );
        const basePath = normalizePath(
            source.basePath || (matchingFile ? pathForFile(matchingFile) : importedFilename),
        );
        return {
            kind: source.kind,
            yaml: source.yaml,
            importedFilename,
            basePath,
            fileMap,
            environmentFromFiles: read.environmentFromFiles,
            exampleDir: source.exampleDir ?? null,
        };
    }

    const files = source.kind === "drop" ? await collectDroppedFiles(source.dataTransfer) : source.files;
    const yamlFiles = files.filter(isComposeYaml);
    const requestedPath = source.primaryPath ? normalizePath(source.primaryPath) : null;
    const primary =
        (requestedPath ? yamlFiles.find((file) => pathForFile(file) === requestedPath) : undefined) ??
        yamlFiles.find(isPreferredComposeFile) ??
        yamlFiles[0];
    if (!primary) return null;

    const read = await readFiles(files);
    const basePath = pathForFile(primary);
    return {
        kind: source.kind,
        yaml: read.fileMap[basePath] ?? (await primary.text()),
        importedFilename: primary.name,
        basePath,
        fileMap: read.fileMap,
        environmentFromFiles: read.environmentFromFiles,
        exampleDir: source.exampleDir ?? null,
    };
}

function normalizeParsedState(value: unknown): ComposeState {
    return normalizeState(value);
}

function workerResultToParseResult(result: WorkerParseResult): ParseComposeResult {
    return { ...result, variables: new Set(result.variables) };
}

function fatalMessage(result: ParseComposeResult): string {
    return result.errors.find((issue) => issue.type === "fatal")?.message ?? "Unable to parse Compose YAML";
}

async function parseSource(
    source: ResolvedSource,
    configuration: WorkspaceConfigurationState,
    generation: number,
): Promise<ParsedCandidate | { error: string }> {
    const options = {
        environment: configuration.environment,
        activeProfiles: configuration.activeProfiles,
        basePath: source.basePath,
        fileMap: source.fileMap,
        enableIncludes: Object.keys(source.fileMap).length > 0,
        enableExtends: true,
        enableVariables: true,
        enableProfiles: true,
        addMetadata: false,
    };
    let result: ParseComposeResult;
    let adapter: "worker" | "fallback" = "worker";
    let worker: ReturnType<typeof createParserWorker> | null = null;

    try {
        worker = createParserWorker();
        result = workerResultToParseResult(await worker.parseAsync(source.yaml, options));
    } catch {
        adapter = "fallback";
        result = parseCompose(source.yaml, options);
    } finally {
        worker?.terminate();
    }

    if (!result.compose) return { error: fatalMessage(result) };

    let enrichment: "completed" | "failed" = "completed";
    let enriched = result.compose;
    try {
        enriched =
            (await enrichComposeState(result.compose, {
                fileMap: source.fileMap,
                exampleDir: source.exampleDir,
                timeout: 5000,
            })) ?? result.compose;
    } catch {
        enrichment = "failed";
    }

    return {
        state: normalizeParsedState(enriched),
        adapter,
        metadata: {
            profiles: [...result.profiles],
            profileCounts: { ...result.profileCounts },
            variables: [...result.variables],
            undefinedVariables: [...result.undefinedVariables],
            parserIssues: [...result.errors],
            processing: { generation, adapter, enrichment },
        },
    };
}

export function ComposeWorkspaceProvider({ children }: PropsWithChildren) {
    const initialConfiguration = useMemo<WorkspaceConfigurationState>(
        () => ({
            activeProfiles: readStoredStringArray(PROFILES_STORAGE_KEY),
            environment: readStoredEnvironment(),
        }),
        [],
    );
    const {
        state,
        dispatch: commitHistory,
        undo,
        redo,
        canUndo,
        canRedo,
    } = useHistoryReducer<ComposeState, ComposeState>(replaceState, readStoredState());
    const [configuration, setConfiguration] = useState(initialConfiguration);
    const [metadata, setMetadata] = useState<ProjectMetadata>(EMPTY_METADATA);
    const [activity, setActivity] = useState<ComposeWorkspaceSnapshot["activity"]>({ status: "idle" });
    const generationRef = useRef(0);
    const sourceRef = useRef<ResolvedSource | null>(null);
    const configurationRef = useRef(initialConfiguration);
    const stateRef = useRef(state);

    useEffect(() => {
        stateRef.current = state;
    }, [state]);

    const getState = useCallback(() => stateRef.current, []);
    const commitState = useCallback(
        (nextState: ComposeState) => {
            stateRef.current = nextState;
            commitHistory(nextState);
        },
        [commitHistory],
    );

    useEffect(() => {
        localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(state));
    }, [state]);
    useEffect(() => {
        localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(configuration.activeProfiles));
        localStorage.setItem(ENVIRONMENT_STORAGE_KEY, JSON.stringify(configuration.environment));
    }, [configuration]);

    const finishRejected = useCallback(
        (generation: number, reason: "invalid-source" | "parse", error: string): ComposeWorkspaceOutcome => {
            if (generation !== generationRef.current) return { status: "superseded", generation };
            setActivity({ status: "idle" });
            return { status: "rejected", generation, reason, error };
        },
        [],
    );

    const replace = useCallback(
        async (source: ComposeWorkspaceSource): Promise<ComposeWorkspaceOutcome> => {
            const generation = ++generationRef.current;
            setActivity({ status: "processing", generation, intent: "replace" });
            const resolved = await resolveSource(source);
            if (generation !== generationRef.current) return { status: "superseded", generation };
            if (!resolved) {
                return finishRejected(generation, "invalid-source", "No Compose YAML file was found");
            }

            const nextConfiguration = {
                activeProfiles: [...configurationRef.current.activeProfiles],
                environment: mergeEnv(resolved.environmentFromFiles, configurationRef.current.environment),
            };
            const candidate = await parseSource(resolved, nextConfiguration, generation);
            if (generation !== generationRef.current) return { status: "superseded", generation };
            if ("error" in candidate) return finishRejected(generation, "parse", candidate.error);

            sourceRef.current = resolved;
            configurationRef.current = nextConfiguration;
            commitState(candidate.state);
            setConfiguration(nextConfiguration);
            setMetadata({
                ...candidate.metadata,
                source: {
                    kind: resolved.kind,
                    importedFilename: resolved.importedFilename,
                    basePath: resolved.basePath,
                },
            });
            setActivity({ status: "idle" });
            return { status: "accepted", generation, adapter: candidate.adapter };
        },
        [commitState, finishRejected],
    );

    const configure = useCallback(
        async (updates: ComposeWorkspaceConfiguration): Promise<ComposeWorkspaceOutcome> => {
            const generation = ++generationRef.current;
            const current = configurationRef.current;
            const nextConfiguration: WorkspaceConfigurationState = {
                activeProfiles: updates.activeProfiles ? [...updates.activeProfiles] : [...current.activeProfiles],
                environment: updates.environment ? { ...updates.environment } : { ...current.environment },
            };
            configurationRef.current = nextConfiguration;
            setConfiguration(nextConfiguration);

            const source = sourceRef.current;
            if (!source) {
                setActivity({ status: "idle" });
                return { status: "accepted", generation, adapter: "none" };
            }

            setActivity({ status: "processing", generation, intent: "configure" });
            const effectiveConfiguration = {
                ...nextConfiguration,
                environment: mergeEnv(source.environmentFromFiles, nextConfiguration.environment),
            };
            const candidate = await parseSource(source, effectiveConfiguration, generation);
            if (generation !== generationRef.current) return { status: "superseded", generation };
            if ("error" in candidate) return finishRejected(generation, "parse", candidate.error);

            configurationRef.current = effectiveConfiguration;
            commitState(candidate.state);
            setConfiguration(effectiveConfiguration);
            setMetadata((currentMetadata) => ({
                ...candidate.metadata,
                source: currentMetadata.source,
            }));
            setActivity({ status: "idle" });
            return { status: "accepted", generation, adapter: candidate.adapter };
        },
        [commitState, finishRejected],
    );

    const clear = useCallback(() => {
        generationRef.current += 1;
        sourceRef.current = null;
        configurationRef.current = EMPTY_CONFIGURATION;
        commitState(INITIAL_STATE);
        setConfiguration(EMPTY_CONFIGURATION);
        setMetadata(EMPTY_METADATA);
        setActivity({ status: "idle" });
    }, [commitState]);

    const ast = useMemo(() => normalizeToAST(state), [state]);
    const yaml = useMemo(() => generateYaml(state), [state]);
    const issues = useMemo<ValidationIssue[]>(() => {
        const parserIssues: ValidationIssue[] = metadata.parserIssues.map((issue) => ({
            type: issue.type === "warning" ? "warning" : "error",
            entity: "parser",
            name: issue.stage || "compose",
            message: issue.message || "Parser error",
        }));
        return [...validateState(state), ...parserIssues];
    }, [metadata.parserIssues, state]);
    const suggestions = useMemo(() => generateSuggestions(state), [state]);
    const snapshot = useMemo<ComposeWorkspaceSnapshot>(
        () => ({
            state,
            ast,
            yaml,
            issues,
            suggestions,
            profiles: metadata.profiles,
            activeProfiles: configuration.activeProfiles,
            profileCounts: metadata.profileCounts,
            environment: configuration.environment,
            variables: metadata.variables,
            undefinedVariables: metadata.undefinedVariables,
            parserIssues: metadata.parserIssues,
            source: metadata.source,
            processing: metadata.processing,
            activity,
        }),
        [activity, ast, configuration, issues, metadata, state, suggestions, yaml],
    );

    const downloadYaml = useCallback(() => {
        const blob = new Blob([yaml], { type: "text/yaml" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "docker-compose.yml";
        anchor.click();
        URL.revokeObjectURL(url);
    }, [yaml]);

    const value = useMemo<ComposeWorkspaceInternalValue>(
        () => ({
            snapshot,
            replace,
            configure,
            clear,
            downloadYaml,
            getState,
            commitState,
            undo,
            redo,
            canUndo,
            canRedo,
        }),
        [canRedo, canUndo, clear, commitState, configure, downloadYaml, getState, redo, replace, snapshot, undo],
    );

    return (
        <WorkspaceContext.Provider value={value}>
            <WorkspaceInternalContext.Provider value={value}>{children}</WorkspaceInternalContext.Provider>
        </WorkspaceContext.Provider>
    );
}

export function useComposeWorkspace(): ComposeWorkspaceValue {
    const context = useContext(WorkspaceContext);
    if (!context) throw new Error("useComposeWorkspace must be used within ComposeWorkspaceProvider");
    return context;
}

export function useComposeWorkspaceInternal(): ComposeWorkspaceInternalValue {
    const context = useContext(WorkspaceInternalContext);
    if (!context) throw new Error("useComposeWorkspaceInternal must be used within ComposeWorkspaceProvider");
    return context;
}
