import { Graph, layout, type EdgeLabel, type GraphLabel, type NodeLabel } from "@dagrejs/dagre";
import type { Edge, Node, XYPosition } from "@xyflow/react";
import { BUILDER_LAYOUT_RANK_SEPARATION } from "./builderConnectionGeometry";

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
const LANE_GAP = 90;
const LAYOUT_MARGIN = 30;

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

interface LayoutNode {
    readonly node: Node;
    readonly dimensions: BuilderNodeDimensions;
    readonly position: XYPosition;
    readonly centerX: number;
}

const compactVerticalLanes = (layoutNodes: readonly LayoutNode[], edges: readonly Edge[]): Map<string, number> => {
    const columns = new Map<number, LayoutNode[]>();
    for (const layoutNode of layoutNodes) {
        const column = columns.get(layoutNode.centerX) ?? [];
        column.push(layoutNode);
        columns.set(layoutNode.centerX, column);
    }

    const orderedColumns = [...columns.entries()].sort(([left], [right]) => left - right);
    const columnByNode = new Map<string, number>();
    orderedColumns.forEach(([, column], columnIndex) => {
        column.forEach(({ node }) => columnByNode.set(node.id, columnIndex));
    });

    const predecessors = new Map<string, string[]>();
    const successors = new Map<string, string[]>();
    for (const edge of [...edges].sort((left, right) => left.id.localeCompare(right.id))) {
        const sourceColumn = columnByNode.get(edge.source);
        const targetColumn = columnByNode.get(edge.target);
        if (sourceColumn === undefined || targetColumn === undefined || sourceColumn >= targetColumn) continue;
        predecessors.set(edge.target, [...(predecessors.get(edge.target) ?? []), edge.source]);
        successors.set(edge.source, [...(successors.get(edge.source) ?? []), edge.target]);
    }

    const depthByNode = new Map<string, number>();
    const downstreamDepth = (nodeId: string): number => {
        const cached = depthByNode.get(nodeId);
        if (cached !== undefined) return cached;
        const depth = Math.max(0, ...(successors.get(nodeId) ?? []).map((targetId) => downstreamDepth(targetId) + 1));
        depthByNode.set(nodeId, depth);
        return depth;
    };

    const laneByNode = new Map<string, number>();
    for (const [, column] of orderedColumns) {
        const occupied = new Set<number>();
        const orderedNodes = [...column].sort(
            (left, right) =>
                downstreamDepth(right.node.id) - downstreamDepth(left.node.id) ||
                left.node.id.localeCompare(right.node.id),
        );

        for (const { node } of orderedNodes) {
            const preferredLanes = (predecessors.get(node.id) ?? [])
                .map((sourceId) => laneByNode.get(sourceId))
                .filter((lane): lane is number => lane !== undefined);
            const highestCandidate = Math.max(column.length - 1, ...preferredLanes);
            let selectedLane = 0;
            let selectedCost = Number.POSITIVE_INFINITY;
            for (let lane = 0; lane <= highestCandidate; lane++) {
                if (occupied.has(lane)) continue;
                const cost = preferredLanes.reduce((total, preferred) => total + Math.abs(lane - preferred), 0);
                if (cost < selectedCost) {
                    selectedLane = lane;
                    selectedCost = cost;
                }
            }
            occupied.add(selectedLane);
            laneByNode.set(node.id, selectedLane);
        }
    }

    return laneByNode;
};

export function layoutBuilderGraph(nodes: readonly Node[], edges: readonly Edge[]): Node[] {
    if (nodes.length === 0) return [];

    const graph = new Graph<GraphLabel, NodeLabel, EdgeLabel>({ multigraph: true });
    graph.setGraph({
        rankdir: "LR",
        ranker: "network-simplex",
        acyclicer: "greedy",
        ranksep: BUILDER_LAYOUT_RANK_SEPARATION,
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
        graph.setEdge(edge.source, edge.target, { minlen: 1, weight: 2 }, edge.id);
    }

    layout(graph);

    const layoutNodes = nodes.map((node): LayoutNode => {
        const dimensions = dimensionsForBuilderNode(node);
        const label = graph.node(node.id);
        const position = positionFor(label, dimensions);
        if (typeof label.x !== "number") throw new Error("Dagre did not rank every builder node");
        return { node, dimensions, position, centerX: snap(label.x) };
    });
    const laneByNode = compactVerticalLanes(layoutNodes, edges);
    const tallestNode = Math.max(...layoutNodes.map(({ dimensions }) => dimensions.height));
    const laneHeight = tallestNode + LANE_GAP;
    const firstLaneCenter = LAYOUT_MARGIN + tallestNode / 2;

    return layoutNodes.map(({ node, dimensions, position }) => ({
        ...node,
        position: {
            x: position.x,
            y: snap(firstLaneCenter + (laneByNode.get(node.id) ?? 0) * laneHeight - dimensions.height / 2),
        },
    }));
}
