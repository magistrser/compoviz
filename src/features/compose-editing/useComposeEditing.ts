import { useCallback, useMemo } from "react";
import { useComposeWorkspaceInternal } from "../compose-workspace/ComposeWorkspace";
import { applyComposeEdit } from "./transition";
import type { ComposeEdit, ComposeEditOutcome, ComposeEditingValue } from "./types";

export function useComposeEditing(): ComposeEditingValue {
    const { getState, commitState, undo, redo, canUndo, canRedo } = useComposeWorkspaceInternal();

    const commit = useCallback(
        (edit: ComposeEdit): ComposeEditOutcome => {
            const result = applyComposeEdit(getState(), edit);
            if (result.status !== "applied") return result;
            commitState(result.state);
            return { status: "applied" };
        },
        [commitState, getState],
    );
    const moveHistory = useCallback(
        (direction: "undo" | "redo") => {
            if (direction === "undo") undo();
            else redo();
        },
        [redo, undo],
    );

    return useMemo(() => ({ commit, moveHistory, canUndo, canRedo }), [canRedo, canUndo, commit, moveHistory]);
}
