/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useRef, useState, type PropsWithChildren } from "react";
import type { ComposeDocument, ComposeState } from "../../models/composeTypes";
import { compareProjects, getComparisonSummary } from "../../utils/comparison";
import { parseYaml } from "../../utils/yaml";
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

function createSnapshot(projects: readonly ComparisonProject[]): ProjectComparisonSnapshot {
    const findings = projects.length >= 2 ? compareProjects([...projects]) : [];
    const severityCounts = getComparisonSummary(findings);
    return {
        projects,
        findings,
        severityCounts,
        summary: summaryText(severityCounts),
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
    const snapshotRef = useRef(snapshot);
    const nextIdRef = useRef(1);

    const replaceProjects = useCallback((projects: readonly ComparisonProject[]) => {
        const nextSnapshot = createSnapshot(projects);
        snapshotRef.current = nextSnapshot;
        setSnapshot(nextSnapshot);
    }, []);

    const admit = useCallback(
        ({ yaml, importedFilename }: ProjectAdmission): ProjectAdmissionOutcome => {
            if (snapshotRef.current.projects.length >= MAX_PROJECTS) {
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
                nextIdRef.current += 1;
                replaceProjects([...snapshotRef.current.projects, project]);
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
            const projects = snapshotRef.current.projects.filter((project) => project.id !== id);
            if (projects.length !== snapshotRef.current.projects.length) replaceProjects(projects);
        },
        [replaceProjects],
    );

    const clear = useCallback(() => {
        if (snapshotRef.current.projects.length > 0) replaceProjects([]);
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
