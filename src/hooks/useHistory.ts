import { useCallback, useEffect, useReducer } from "react";

interface HistoryState<State> {
    past: State[];
    present: State;
    future: State[];
}

type HistoryAction<State, Action> =
    | { kind: "dispatch"; action: Action }
    | { kind: "undo" }
    | { kind: "redo" }
    | { kind: "reset"; state: State };

export interface HistoryResult<State, Action> {
    state: State;
    dispatch: (action: Action) => void;
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
}

export function useHistoryReducer<State, Action>(
    reducer: (state: State, action: Action) => State,
    initialState: State,
): HistoryResult<State, Action> {
    const historyReducer = (
        history: HistoryState<State>,
        action: HistoryAction<State, Action>,
    ): HistoryState<State> => {
        switch (action.kind) {
            case "undo": {
                const previous = history.past.at(-1);
                if (previous === undefined) return history;
                return {
                    past: history.past.slice(0, -1),
                    present: previous,
                    future: [history.present, ...history.future],
                };
            }
            case "redo": {
                const next = history.future[0];
                if (next === undefined) return history;
                return {
                    past: [...history.past, history.present],
                    present: next,
                    future: history.future.slice(1),
                };
            }
            case "reset":
                return { past: [], present: action.state, future: [] };
            case "dispatch": {
                const next = reducer(history.present, action.action);
                if (next === history.present) return history;
                return {
                    past: [...history.past, history.present].slice(-50),
                    present: next,
                    future: [],
                };
            }
        }
    };

    const [history, historyDispatch] = useReducer(historyReducer, {
        past: [],
        present: initialState,
        future: [],
    });

    const dispatch = useCallback((action: Action) => {
        historyDispatch({ kind: "dispatch", action });
    }, []);
    const undo = useCallback(() => historyDispatch({ kind: "undo" }), []);
    const redo = useCallback(() => historyDispatch({ kind: "redo" }), []);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "z") {
                event.preventDefault();
                if (event.shiftKey) redo();
                else undo();
            }
            if ((event.metaKey || event.ctrlKey) && event.key === "y") {
                event.preventDefault();
                redo();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [redo, undo]);

    return {
        state: history.present,
        dispatch,
        undo,
        redo,
        canUndo: history.past.length > 0,
        canRedo: history.future.length > 0,
    };
}
