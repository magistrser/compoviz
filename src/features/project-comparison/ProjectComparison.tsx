/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useRef, useState, type PropsWithChildren } from "react";
import { normalizeToAST } from "../../models/normalizeToAST";
import type { ComposeDocument, ComposeState } from "../../models/composeTypes";
import { compareProjects, getComparisonSummary } from "../../utils/comparison";
import { generateMultiProjectGraphviz } from "../../utils/graphviz";
import { parseYaml } from "../../utils/yaml";
import type { AdmittedComparisonProject } from "./internalTypes";
import type {
    ComparisonProject,
    ComparisonSeverityCounts,
    ProjectAdmission,
    ProjectAdmissionOutcome,
    ProjectComparisonSnapshot,
    ProjectComparisonValue,
} from "./types";

const MAX_PROJECTS = 3;

function isComposeDocument(value: unknown): value is ComposeDocument {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toProjectState(document: ComposeDocument): ComposeState {
    return {
        name: typeof document.name === "string" ? document.name : "",
        services: document.services ?? {},
        networks: document.networks ?? {},
        volumes: document.volumes ?? {},
        secrets: document.secrets ?? {},
        configs: document.configs ?? {},
    };
}

function summaryText(summary: ComparisonSeverityCounts): string {
    const parts: string[] = [];
    if (summary.errors) parts.push(`${summary.errors} error${summary.errors === 1 ? "" : "s"}`);
    if (summary.warnings) parts.push(`${summary.warnings} warning${summary.warnings === 1 ? "" : "s"}`);
    if (summary.info) parts.push(`${summary.info} info item${summary.info === 1 ? "" : "s"}`);
    return parts.length === 0
        ? "No conflicts or overlaps detected across projects."
        : `${parts.join(", ")} found across projects.`;
}

function createSnapshot(records: readonly AdmittedComparisonProject[]): ProjectComparisonSnapshot {
    const projects = records.map((record) => record.project);
    const findings = records.length >= 2 ? compareProjects(records) : [];
    const severityCounts = getComparisonSummary(findings);
    const diagramDot = generateMultiProjectGraphviz(
        records,
        findings.filter((finding) => finding.severity === "error"),
    );
    return {
        projects,
        findings,
        severityCounts,
        summary: summaryText(severityCounts),
        diagramDot,
    };
}

function importedName(filename: string | undefined): string {
    const trimmed = filename?.trim() ?? "";
    return trimmed.replace(/\.[^./\\]+$/, "") || "Untitled";
}

const EMPTY_SNAPSHOT = createSnapshot([]);
const ProjectComparisonContext = createContext<ProjectComparisonValue | null>(null);

export function ProjectComparisonProvider({ children }: PropsWithChildren) {
    const [snapshot, setSnapshot] = useState<ProjectComparisonSnapshot>(EMPTY_SNAPSHOT);
    const recordsRef = useRef<readonly AdmittedComparisonProject[]>([]);
    const nextIdRef = useRef(1);

    const replaceProjects = useCallback((records: readonly AdmittedComparisonProject[]) => {
        const nextSnapshot = createSnapshot(records);
        recordsRef.current = records;
        setSnapshot(nextSnapshot);
    }, []);

    const admit = useCallback(
        ({ yaml, importedFilename }: ProjectAdmission): ProjectAdmissionOutcome => {
            if (recordsRef.current.length >= MAX_PROJECTS) {
                return { status: "rejected", reason: "capacity" };
            }

            try {
                const document = parseYaml(yaml);
                if (!isComposeDocument(document)) {
                    return {
                        status: "rejected",
                        reason: "parsing",
                        error: "Compose YAML must contain an object",
                    };
                }

                const composeName = typeof document.name === "string" ? document.name.trim() : "";
                const project: ComparisonProject = {
                    id: `project-${nextIdRef.current}`,
                    name: composeName || importedName(importedFilename),
                    content: toProjectState(document),
                };
                const record: AdmittedComparisonProject = {
                    project,
                    ast: normalizeToAST(project.content),
                };
                nextIdRef.current += 1;
                replaceProjects([...recordsRef.current, record]);
                return { status: "accepted", project };
            } catch (error) {
                return {
                    status: "rejected",
                    reason: "parsing",
                    error: error instanceof Error ? error.message : String(error),
                };
            }
        },
        [replaceProjects],
    );

    const remove = useCallback(
        (id: string) => {
            const records = recordsRef.current.filter((record) => record.project.id !== id);
            if (records.length !== recordsRef.current.length) replaceProjects(records);
        },
        [replaceProjects],
    );

    const clear = useCallback(() => {
        if (recordsRef.current.length > 0) replaceProjects([]);
    }, [replaceProjects]);

    const value = useMemo<ProjectComparisonValue>(
        () => ({ snapshot, admit, remove, clear }),
        [admit, clear, remove, snapshot],
    );
    return <ProjectComparisonContext.Provider value={value}>{children}</ProjectComparisonContext.Provider>;
}

export function useProjectComparison(): ProjectComparisonValue {
    const context = useContext(ProjectComparisonContext);
    if (!context) throw new Error("useProjectComparison must be used within ProjectComparisonProvider");
    return context;
}
