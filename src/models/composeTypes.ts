import type { Dispatch, ReactNode } from "react";
import type { ComposeAST } from "./ComposeAST";

export interface Position {
    x: number;
    y: number;
}

export interface MetadataValue<T = unknown> {
    _value: T;
    _variable?: string;
}

export type StringLike = string | number | boolean | MetadataValue;
export type StringList = StringLike[];
export type StringRecord = Record<string, StringLike | null>;

export interface ComposePortLongSyntax extends Record<string, unknown> {
    host_ip?: string;
    published?: string | number;
    target?: string | number;
    protocol?: string;
}

export interface ComposeVolumeLongSyntax extends Record<string, unknown> {
    type?: string;
    source?: string;
    target?: string;
    read_only?: boolean;
}

export interface ComposeDependencyConfig extends Record<string, unknown> {
    condition?: string;
    restart?: boolean;
}

export interface ComposeNetworkAttachment extends Record<string, unknown> {
    aliases?: string[];
    ipv4_address?: string;
    ipv6_address?: string;
    priority?: number;
}

export interface ComposeBuild extends Record<string, unknown> {
    context?: string;
    dockerfile?: string;
    target?: string;
    args?: StringRecord;
    cache_from?: string[];
}

export interface ComposeHealthcheck extends Record<string, unknown> {
    test?: string | string[];
    interval?: string;
    timeout?: string;
    retries?: number;
    start_period?: string;
    disable?: boolean;
}

export interface ComposeResourcePair extends Record<string, unknown> {
    cpus?: string | number;
    memory?: string;
}

export interface ComposeDeploy extends Record<string, unknown> {
    replicas?: number;
    restart_policy?: { condition?: string };
    resources?: {
        limits?: ComposeResourcePair;
        reservations?: ComposeResourcePair;
    };
}

export interface ResolvedPort extends Record<string, unknown> {
    port: string | number;
    protocol?: string;
}

export interface ComposeService extends Record<string, unknown> {
    image?: string | MetadataValue<string>;
    build?: string | ComposeBuild;
    container_name?: string;
    ports?: Array<string | ComposePortLongSyntax | MetadataValue>;
    expose?: StringList;
    depends_on?: string[] | Record<string, ComposeDependencyConfig | null>;
    networks?: string[] | Record<string, ComposeNetworkAttachment | null>;
    volumes?: Array<string | ComposeVolumeLongSyntax | MetadataValue>;
    secrets?: Array<string | { source?: string } | MetadataValue>;
    configs?: Array<string | { source?: string } | MetadataValue>;
    environment?: StringList | StringRecord;
    env_file?: string | Array<string | { path?: string } | MetadataValue>;
    profiles?: string | StringList;
    healthcheck?: ComposeHealthcheck;
    deploy?: ComposeDeploy;
    restart?: string;
    user?: string;
    privileged?: boolean;
    labels?: StringList | StringRecord;
    command?: string | string[];
    entrypoint?: string | string[];
    working_dir?: string;
    extends?: string | { service?: string; file?: string };
    _position?: Position;
    _resolvedImage?: string;
    _resolvedPorts?: ResolvedPort[];
}

export interface ComposeResource extends Record<string, unknown> {
    driver?: string;
    driver_opts?: Record<string, string>;
    external?: boolean | Record<string, unknown>;
    internal?: boolean;
    attachable?: boolean;
    labels?: StringList | StringRecord;
    file?: string;
    _position?: Position;
}

export interface ComposeDocument extends Record<string, unknown> {
    name?: string;
    services?: Record<string, ComposeService>;
    networks?: Record<string, ComposeResource>;
    volumes?: Record<string, ComposeResource>;
    secrets?: Record<string, ComposeResource>;
    configs?: Record<string, ComposeResource>;
    include?: unknown;
}

export interface ComposeState extends ComposeDocument {
    name: string;
    services: Record<string, ComposeService>;
    networks: Record<string, ComposeResource>;
    volumes: Record<string, ComposeResource>;
    secrets: Record<string, ComposeResource>;
    configs: Record<string, ComposeResource>;
}

export type ComposeStateSection = Exclude<keyof ComposeState, "name">;

export type ComposeAction =
    | { type: "SET_STATE"; payload?: unknown }
    | { type: "ADD_SERVICE"; name: string; position?: Position }
    | { type: "UPDATE_SERVICE"; name: string; data: Partial<ComposeService> }
    | { type: "DELETE_SERVICE"; name: string }
    | { type: "RENAME_SERVICE"; oldName: string; newName: string }
    | { type: "ADD_NETWORK"; name: string; position?: Position }
    | { type: "UPDATE_NETWORK"; name: string; data: Partial<ComposeResource> }
    | { type: "DELETE_NETWORK"; name: string }
    | { type: "ADD_VOLUME"; name: string; position?: Position }
    | { type: "UPDATE_VOLUME"; name: string; data: Partial<ComposeResource> }
    | { type: "DELETE_VOLUME"; name: string }
    | { type: "ADD_SECRET"; name: string; position?: Position }
    | { type: "UPDATE_SECRET"; name: string; data: Partial<ComposeResource> }
    | { type: "DELETE_SECRET"; name: string }
    | { type: "ADD_CONFIG"; name: string; position?: Position }
    | { type: "UPDATE_CONFIG"; name: string; data: Partial<ComposeResource> }
    | { type: "DELETE_CONFIG"; name: string };

export type ComposeDispatch = Dispatch<ComposeAction>;

export interface ParserIssue {
    type: string;
    message: string;
    stage?: string;
    undefinedVariables?: string[];
    stack?: string;
    service?: string;
}

export interface ParserOptions {
    environment?: Record<string, string>;
    activeProfiles?: string[];
    basePath?: string;
    fileMap?: Record<string, string>;
    enableIncludes?: boolean;
    enableExtends?: boolean;
    enableVariables?: boolean;
    enableProfiles?: boolean;
    addMetadata?: boolean;
}

export interface ParseComposeResult {
    compose: ComposeDocument | null;
    profiles: string[];
    profileCounts: Record<string, number>;
    variables: Set<string>;
    undefinedVariables: string[];
    errors: ParserIssue[];
}

export interface WorkerParseResult extends Omit<ParseComposeResult, "variables"> {
    variables: string[];
}

export interface ParserWorkerClient {
    parseAsync: (yamlString: string, options?: ParserOptions) => Promise<WorkerParseResult>;
    terminate: () => void;
}

export interface LoadFilesOverrides {
    fileMap?: Record<string, string>;
    environment?: Record<string, string>;
    activeProfiles?: string[];
    exampleDir?: string | null;
}

export interface ImportFile {
    name: string;
    webkitRelativePath?: string;
    text: () => Promise<string>;
}

export interface LoadFilesResult {
    success: boolean;
    fallback?: boolean;
    profiles?: string[];
    undefinedVariables?: string[];
    error?: string;
}

export interface ValidationIssue {
    type: "error" | "warning";
    entity: string;
    name: string;
    message: string;
}

export type SuggestionCategoryValue = "security" | "performance" | "architecture" | "best-practice" | "spec-compliance";
export type SuggestionSeverityValue = "info" | "low" | "medium" | "high" | "critical";

export interface SuggestionAction extends Record<string, unknown> {
    type: string;
    entity?: string;
    name?: string;
    field?: string;
    value?: unknown;
}

export interface Suggestion {
    id: string;
    type: "suggestion";
    category: SuggestionCategoryValue;
    severity: SuggestionSeverityValue;
    entity: string;
    name: string;
    message: string;
    action: SuggestionAction | null;
}

export interface ComposeContextValue {
    state: ComposeState;
    ast: ComposeAST;
    yamlCode: string;
    errors: ValidationIssue[];
    suggestions: Suggestion[];
    profiles: string[];
    activeProfiles: string[];
    profileCounts: Record<string, number>;
    environment: Record<string, string>;
    variables: string[];
    undefinedVariables: string[];
    parserErrors: ParserIssue[];
    dispatch: ComposeDispatch;
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    loadFiles: (content: string, files?: ImportFile[], overrides?: LoadFilesOverrides) => Promise<LoadFilesResult>;
    resetProject: () => void;
    handleExport: () => void;
    handleYamlChange: (newYaml: string) => Promise<void>;
    setActiveProfiles: (profiles: string[]) => Promise<void>;
    updateEnvironment: (key: string, value: string | null) => Promise<void>;
    setEnvironment: (environment: Record<string, string>) => Promise<void>;
}

export interface ComposeProviderProps {
    children: ReactNode;
}
