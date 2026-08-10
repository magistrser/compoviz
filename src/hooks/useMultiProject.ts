import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import { parseYaml } from "../utils/yaml";
import type { ComposeDocument, ComposeState } from "../models/composeTypes";
import type { ComparisonProject } from "../utils/comparison";

export interface AddProjectResult {
    success: boolean;
    project?: ComparisonProject;
    error?: string;
}

interface MultiProjectResult {
    projects: ComparisonProject[];
    activeProject: ComparisonProject | null;
    activeProjectId: string | null;
    setActiveProjectId: Dispatch<SetStateAction<string | null>>;
    compareMode: boolean;
    setCompareMode: Dispatch<SetStateAction<boolean>>;
    addProject: (yamlContent: string, fileName?: string) => AddProjectResult;
    removeProject: (projectId: string) => void;
    updateProject: (projectId: string, content: ComposeState) => void;
    clearAllProjects: () => void;
}

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

const generateId = () => `project-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

export function useMultiProject(): MultiProjectResult {
    const [projects, setProjects] = useState<ComparisonProject[]>([]);
    const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
    const [compareMode, setCompareMode] = useState(false);

    const addProject = useCallback((yamlContent: string, fileName = "Untitled"): AddProjectResult => {
        try {
            const parsed = parseYaml(yamlContent);
            if (!isComposeDocument(parsed)) {
                return { success: false, error: "Compose YAML must contain an object" };
            }
            const name =
                (typeof parsed.name === "string" && parsed.name) || fileName.replace(/\.ya?ml$/i, "") || "Untitled";
            const project: ComparisonProject = {
                id: generateId(),
                name,
                content: toProjectState(parsed),
            };
            setProjects((current) => (current.length >= 3 ? [...current.slice(1), project] : [...current, project]));
            setActiveProjectId(project.id);
            return { success: true, project };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }, []);

    const removeProject = useCallback((projectId: string) => {
        setProjects((current) => {
            const remaining = current.filter((project) => project.id !== projectId);
            setActiveProjectId((activeId) => (activeId === projectId ? (remaining[0]?.id ?? null) : activeId));
            return remaining;
        });
    }, []);

    const updateProject = useCallback((projectId: string, content: ComposeState) => {
        setProjects((current) =>
            current.map((project) =>
                project.id === projectId ? { ...project, content, name: content.name || project.name } : project,
            ),
        );
    }, []);

    const activeProject = projects.find((project) => project.id === activeProjectId) ?? null;
    const clearAllProjects = useCallback(() => {
        setProjects([]);
        setActiveProjectId(null);
        setCompareMode(false);
    }, []);

    return {
        projects,
        activeProject,
        activeProjectId,
        setActiveProjectId,
        compareMode,
        setCompareMode,
        addProject,
        removeProject,
        updateProject,
        clearAllProjects,
    };
}
