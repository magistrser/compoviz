import type { ComposeAST } from "../../models";
import type { ComposeState, ParserIssue, Suggestion, ValidationIssue } from "../../models/composeTypes";

export interface ComposeWorkspaceFile {
    readonly name: string;
    readonly webkitRelativePath?: string;
    text(): Promise<string>;
}

export type ComposeWorkspaceSource =
    | {
          readonly kind: "yaml";
          readonly yaml: string;
          readonly importedFilename?: string;
          readonly basePath?: string;
          readonly files?: readonly ComposeWorkspaceFile[];
          readonly fileMap?: Readonly<Record<string, string>>;
          readonly exampleDir?: string | null;
      }
    | {
          readonly kind: "files";
          readonly files: readonly ComposeWorkspaceFile[];
          readonly primaryPath?: string;
          readonly exampleDir?: string | null;
      }
    | {
          readonly kind: "drop";
          readonly dataTransfer: DataTransfer;
          readonly primaryPath?: string;
          readonly exampleDir?: string | null;
      };

export interface ComposeWorkspaceConfiguration {
    readonly activeProfiles?: readonly string[];
    readonly environment?: Readonly<Record<string, string>>;
}

export interface ComposeWorkspaceSourceDescriptor {
    readonly kind: ComposeWorkspaceSource["kind"];
    readonly importedFilename: string;
    readonly basePath: string;
}

export type ComposeWorkspaceAdapter = "worker" | "fallback" | "none";

export interface ComposeWorkspaceAcceptedOutcome {
    readonly status: "accepted";
    readonly generation: number;
    readonly adapter: ComposeWorkspaceAdapter;
}

export interface ComposeWorkspaceRejectedOutcome {
    readonly status: "rejected";
    readonly generation: number;
    readonly reason: "invalid-source" | "parse";
    readonly error: string;
}

export interface ComposeWorkspaceSupersededOutcome {
    readonly status: "superseded";
    readonly generation: number;
}

export type ComposeWorkspaceOutcome =
    | ComposeWorkspaceAcceptedOutcome
    | ComposeWorkspaceRejectedOutcome
    | ComposeWorkspaceSupersededOutcome;

export interface ComposeWorkspaceSnapshot {
    readonly state: ComposeState;
    readonly ast: ComposeAST;
    readonly yaml: string;
    readonly issues: readonly ValidationIssue[];
    readonly suggestions: readonly Suggestion[];
    readonly profiles: readonly string[];
    readonly activeProfiles: readonly string[];
    readonly profileCounts: Readonly<Record<string, number>>;
    readonly environment: Readonly<Record<string, string>>;
    readonly variables: readonly string[];
    readonly undefinedVariables: readonly string[];
    readonly parserIssues: readonly ParserIssue[];
    readonly source: ComposeWorkspaceSourceDescriptor | null;
    readonly processing: {
        readonly generation: number;
        readonly adapter: Exclude<ComposeWorkspaceAdapter, "none"> | null;
        readonly enrichment: "completed" | "failed" | "skipped";
    };
    readonly activity:
        | { readonly status: "idle" }
        | {
              readonly status: "processing";
              readonly generation: number;
              readonly intent: "replace" | "configure";
          };
}

export interface ComposeWorkspaceValue {
    readonly snapshot: ComposeWorkspaceSnapshot;
    replace(source: ComposeWorkspaceSource): Promise<ComposeWorkspaceOutcome>;
    configure(configuration: ComposeWorkspaceConfiguration): Promise<ComposeWorkspaceOutcome>;
    clear(): void;
    downloadYaml(): void;
}
