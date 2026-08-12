import type { Connection } from "@xyflow/react";

export interface BuilderTerminal {
    nodeId: string;
    handleId: string;
    handleType: "source" | "target";
    label: string;
}

export function connectionForTerminals(first: BuilderTerminal, second: BuilderTerminal): Connection | null {
    if (first.handleType === second.handleType) return null;

    const source = first.handleType === "source" ? first : second;
    const target = first.handleType === "target" ? first : second;
    return {
        source: source.nodeId,
        sourceHandle: source.handleId,
        target: target.nodeId,
        targetHandle: target.handleId,
    };
}
