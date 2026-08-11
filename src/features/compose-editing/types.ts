import type { ComposeResource, ComposeService, Position } from "../../models/composeTypes";
import type { DependencyCondition } from "../../models";

export type ComposeResourceKind = "service" | "network" | "volume" | "secret" | "config";

export interface ComposeResourceReference {
    readonly resource: ComposeResourceKind;
    readonly name: string;
}

export interface ComposeResourcePosition extends ComposeResourceReference {
    readonly position: Position;
}

interface ComposeRelationshipTarget {
    readonly service: string;
    readonly target: string;
}

export type ComposeRelationshipChange =
    | (ComposeRelationshipTarget & {
          readonly action: "connect" | "update";
          readonly relationship: "depends-on";
          readonly condition: DependencyCondition;
      })
    | (ComposeRelationshipTarget & {
          readonly action: "disconnect";
          readonly relationship: "depends-on";
      })
    | (ComposeRelationshipTarget & {
          readonly action: "connect" | "disconnect";
          readonly relationship: "network" | "volume";
      });

export type ComposeEdit =
    | { readonly type: "set-project-name"; readonly name: string }
    | {
          readonly type: "add-resource";
          readonly resource: ComposeResourceKind;
          readonly name: string;
          readonly position?: Position;
      }
    | {
          readonly type: "update-resource";
          readonly resource: ComposeResourceKind;
          readonly name: string;
          readonly data: Partial<ComposeService> | Partial<ComposeResource>;
      }
    | {
          readonly type: "remove-resources";
          readonly resources: readonly ComposeResourceReference[];
      }
    | {
          readonly type: "rename-resource";
          readonly resource: ComposeResourceKind;
          readonly oldName: string;
          readonly newName: string;
      }
    | {
          readonly type: "position-resource";
          readonly resource: ComposeResourceKind;
          readonly name: string;
          readonly position: Position;
      }
    | {
          readonly type: "position-resources";
          readonly positions: readonly ComposeResourcePosition[];
      }
    | {
          readonly type: "apply-template";
          readonly serviceName: string;
          readonly service: ComposeService;
          readonly suggestedVolume?: { readonly name: string; readonly config: ComposeResource };
      }
    | (ComposeRelationshipTarget & {
          readonly type: "connect-relationship";
          readonly relationship: "depends-on";
          readonly condition: DependencyCondition;
      })
    | (ComposeRelationshipTarget & {
          readonly type: "disconnect-relationship";
          readonly relationship: "depends-on";
      })
    | (ComposeRelationshipTarget & {
          readonly type: "connect-relationship" | "disconnect-relationship";
          readonly relationship: "network" | "volume";
      })
    | {
          readonly type: "change-relationships";
          readonly changes: readonly ComposeRelationshipChange[];
      };

export type ComposeEditOutcome =
    | { readonly status: "applied" }
    | { readonly status: "unchanged" }
    | {
          readonly status: "rejected";
          readonly reason: "invalid-name" | "missing-resource" | "invalid-relationship";
      };

export interface ComposeEditingValue {
    readonly commit: (edit: ComposeEdit) => ComposeEditOutcome;
    readonly moveHistory: (direction: "undo" | "redo") => void;
    readonly canUndo: boolean;
    readonly canRedo: boolean;
}
