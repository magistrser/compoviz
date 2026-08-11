import { Graph, layout, type EdgeLabel, type GraphLabel, type NodeLabel } from "@dagrejs/dagre";
import type { Edge, Node, XYPosition } from "@xyflow/react";

export interface BuilderNodeDimensions {
    readonly width: number;
    readonly height: number;
}

const DEFAULT_NODE_DIMENSIONS: BuilderNodeDimensions = { width: 180, height: 100 };

const NODE_DIMENSIONS: Readonly<Record<string, BuilderNodeDimensions>> = {
    serviceNode: { width: 240, height: 150 },
    networkNode: { width: 120, height: 120 },
    volumeNode: DEFAULT_NODE_DIMENSIONS,
    secretNode: DEFAULT_NODE_DIMENSIONS,
    configNode: DEFAULT_NODE_DIMENSIONS,
};

const SNAP_GRID_SIZE = 15;

export const dimensionsForBuilderNode = (node: Node): BuilderNodeDimensions =>
    (node.type ? NODE_DIMENSIONS[node.type] : undefined) ?? DEFAULT_NODE_DIMENSIONS;

const snap = (coordinate: number): number => Math.round(coordinate / SNAP_GRID_SIZE) * SNAP_GRID_SIZE;

const positionFor = (label: NodeLabel, dimensions: BuilderNodeDimensions): XYPosition => {
    if (typeof label.x !== "number" || typeof label.y !== "number") {
        throw new Error("Dagre did not position every builder node");
    }

    return {
        x: snap(label.x - dimensions.width / 2),
        y: snap(label.y - dimensions.height / 2),
    };
};

export function layoutBuilderGraph(nodes: readonly Node[], edges: readonly Edge[]): Node[] {
    if (nodes.length === 0) return [];

    const graph = new Graph<GraphLabel, NodeLabel, EdgeLabel>({ multigraph: true });
    graph.setGraph({
        rankdir: "LR",
        ranker: "network-simplex",
        acyclicer: "greedy",
        ranksep: 150,
        nodesep: 90,
        edgesep: 45,
        marginx: 30,
        marginy: 30,
    });
    graph.setDefaultEdgeLabel(() => ({}));

    for (const node of [...nodes].sort((left, right) => left.id.localeCompare(right.id))) {
        const dimensions = dimensionsForBuilderNode(node);
        graph.setNode(node.id, { width: dimensions.width, height: dimensions.height });
    }

    for (const edge of [...edges].sort((left, right) => left.id.localeCompare(right.id))) {
        if (!graph.hasNode(edge.source) || !graph.hasNode(edge.target)) continue;
        graph.setEdge(edge.source, edge.target, {}, edge.id);
    }

    layout(graph);

    return nodes.map((node) => ({
        ...node,
        position: positionFor(graph.node(node.id), dimensionsForBuilderNode(node)),
    }));
}
