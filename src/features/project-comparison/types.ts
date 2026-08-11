import type { ComposeDocument } from "../../models/composeTypes";

export interface ComparisonProject {
    readonly id: string;
    readonly name: string;
    readonly content: ComposeDocument;
}

export interface ComparisonFinding {
    readonly type: "conflict" | "shared";
    readonly category: "port" | "volume" | "network" | "container_name" | "service_name" | "env_file";
    readonly severity: "error" | "warning" | "info";
    readonly message: string;
    readonly projects: string[];
    readonly details: unknown;
}

export interface ComparisonSeverityCounts {
    readonly errors: number;
    readonly warnings: number;
    readonly info: number;
}

export interface ProjectComparisonSnapshot {
    readonly projects: readonly ComparisonProject[];
    readonly findings: readonly ComparisonFinding[];
    readonly severityCounts: ComparisonSeverityCounts;
    readonly summary: string;
    readonly diagramDot: string;
}

export interface ProjectAdmission {
    readonly yaml: string;
    readonly importedFilename?: string;
}

export type ProjectAdmissionOutcome =
    | { readonly status: "accepted"; readonly project: ComparisonProject }
    | { readonly status: "rejected"; readonly reason: "capacity" }
    | { readonly status: "rejected"; readonly reason: "parsing"; readonly error: string };

export interface ProjectComparisonValue {
    readonly snapshot: ProjectComparisonSnapshot;
    admit(admission: ProjectAdmission): ProjectAdmissionOutcome;
    remove(id: string): void;
    clear(): void;
}
