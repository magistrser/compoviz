import { Position, type GetSmoothStepPathParams, type Node } from "@xyflow/react";
import {
    BUILDER_INPUT_POSITION,
    BUILDER_OUTPUT_POSITION,
    BUILDER_HANDLE_RADIUS,
    BUILDER_RELATIONSHIP_LANE_OFFSETS,
    type BuilderRelationshipLane,
} from "../../utils/builderConnectionGeometry";
import { dimensionsForBuilderNode } from "../../utils/builderLayout";

const CORNER_RADIUS = 12;
const BEND_PENALTY = 24;
const EPSILON = 0.001;

export type RelationshipLane = BuilderRelationshipLane;

export interface OrthogonalPoint {
    readonly x: number;
    readonly y: number;
}

export interface OrthogonalObstacle extends OrthogonalPoint {
    readonly id: string;
    readonly width: number;
    readonly height: number;
}

export interface OrthogonalRoutingContext {
    readonly obstacles: readonly OrthogonalObstacle[];
    readonly sourceNodeId: string;
    readonly targetNodeId: string;
    readonly networkBundleTargetNodeIds?: readonly string[];
}

export interface OrthogonalEdgeRoutingData extends Record<string, unknown> {
    routing?: OrthogonalRoutingContext;
}

const RELATIONSHIP_CLEARANCES: Record<RelationshipLane, number> = {
    dependency: 18,
    network: 33,
    volume: 48,
};

type RoundedOrthogonalPathParams = Omit<GetSmoothStepPathParams, "borderRadius" | "offset">;
type Heading = 0 | 1 | 2;

interface SearchItem {
    readonly state: number;
    readonly pointIndex: number;
    readonly heading: Heading;
    readonly cost: number;
    readonly sequence: number;
}

class MinQueue {
    readonly #items: SearchItem[] = [];

    get size(): number {
        return this.#items.length;
    }

    push(item: SearchItem): void {
        this.#items.push(item);
        let index = this.#items.length - 1;
        while (index > 0) {
            const parent = Math.floor((index - 1) / 2);
            const parentItem = this.#items[parent];
            if (!parentItem || compareSearchItems(parentItem, item) <= 0) break;
            this.#items[index] = parentItem;
            index = parent;
        }
        this.#items[index] = item;
    }

    pop(): SearchItem | undefined {
        const first = this.#items[0];
        const last = this.#items.pop();
        if (!first || !last || this.#items.length === 0) return first;

        let index = 0;
        while (true) {
            const left = index * 2 + 1;
            const right = left + 1;
            if (left >= this.#items.length) break;
            let child = left;
            if (
                right < this.#items.length &&
                this.#items[right] &&
                this.#items[left] &&
                compareSearchItems(this.#items[right], this.#items[left]) < 0
            ) {
                child = right;
            }
            const childItem = this.#items[child];
            if (!childItem || compareSearchItems(last, childItem) <= 0) break;
            this.#items[index] = childItem;
            index = child;
        }
        this.#items[index] = last;
        return first;
    }
}

const compareSearchItems = (left: SearchItem, right: SearchItem): number =>
    left.cost - right.cost || left.sequence - right.sequence;

const moveFromTerminal = (point: OrthogonalPoint, position: Position, distance: number): OrthogonalPoint => {
    switch (position) {
        case Position.Left:
            return { x: point.x - distance, y: point.y };
        case Position.Top:
            return { x: point.x, y: point.y - distance };
        case Position.Bottom:
            return { x: point.x, y: point.y + distance };
        case Position.Right:
        default:
            return { x: point.x + distance, y: point.y };
    }
};

const uniqueSorted = (values: readonly number[]): number[] => [...new Set(values)].sort((left, right) => left - right);

const isInside = (point: OrthogonalPoint, obstacle: OrthogonalObstacle): boolean =>
    point.x > obstacle.x + EPSILON &&
    point.x < obstacle.x + obstacle.width - EPSILON &&
    point.y > obstacle.y + EPSILON &&
    point.y < obstacle.y + obstacle.height - EPSILON;

const segmentEnters = (start: OrthogonalPoint, end: OrthogonalPoint, obstacle: OrthogonalObstacle): boolean => {
    const right = obstacle.x + obstacle.width;
    const bottom = obstacle.y + obstacle.height;
    if (Math.abs(start.y - end.y) < EPSILON) {
        return (
            start.y > obstacle.y + EPSILON &&
            start.y < bottom - EPSILON &&
            Math.max(Math.min(start.x, end.x), obstacle.x) + EPSILON < Math.min(Math.max(start.x, end.x), right)
        );
    }

    return (
        start.x > obstacle.x + EPSILON &&
        start.x < right - EPSILON &&
        Math.max(Math.min(start.y, end.y), obstacle.y) + EPSILON < Math.min(Math.max(start.y, end.y), bottom)
    );
};

const segmentIsClear = (
    start: OrthogonalPoint,
    end: OrthogonalPoint,
    obstacles: readonly OrthogonalObstacle[],
): boolean => obstacles.every((obstacle) => !segmentEnters(start, end, obstacle));

const routeIsClear = (points: readonly OrthogonalPoint[], obstacles: readonly OrthogonalObstacle[]): boolean => {
    for (let index = 1; index < points.length; index++) {
        const start = points[index - 1];
        const end = points[index];
        if (!start || !end || !segmentIsClear(start, end, obstacles)) return false;
    }
    return true;
};

const expandObstacle = (
    obstacle: OrthogonalObstacle,
    relationship: RelationshipLane,
    routing: OrthogonalRoutingContext,
): OrthogonalObstacle => {
    const isEndpoint = obstacle.id === routing.sourceNodeId || obstacle.id === routing.targetNodeId;
    const clearance = isEndpoint ? 0 : RELATIONSHIP_CLEARANCES[relationship];
    return {
        ...obstacle,
        x: obstacle.x - clearance,
        y: obstacle.y - clearance,
        width: obstacle.width + clearance * 2,
        height: obstacle.height + clearance * 2,
    };
};

const bundledNetworkRoute = (
    source: OrthogonalPoint,
    target: OrthogonalPoint,
    sourceLead: OrthogonalPoint,
    targetLead: OrthogonalPoint,
    sourcePosition: Position,
    targetPosition: Position,
    routing: OrthogonalRoutingContext,
    expandedObstacles: readonly OrthogonalObstacle[],
): OrthogonalPoint[] | null => {
    const targetNodeIds = routing.networkBundleTargetNodeIds;
    if (
        !targetNodeIds ||
        targetNodeIds.length < 2 ||
        sourcePosition !== Position.Right ||
        targetPosition !== Position.Left ||
        !targetNodeIds.includes(routing.targetNodeId)
    ) {
        return null;
    }

    const sourceObstacle = routing.obstacles.find((obstacle) => obstacle.id === routing.sourceNodeId);
    const targetObstacles = targetNodeIds.map((targetId) =>
        routing.obstacles.find((obstacle) => obstacle.id === targetId),
    );
    const minimumBundleGap = BUILDER_RELATIONSHIP_LANE_OFFSETS.network * 2;
    if (
        !sourceObstacle ||
        targetObstacles.some(
            (obstacle) => !obstacle || obstacle.x - (sourceObstacle.x + sourceObstacle.width) < minimumBundleGap,
        )
    ) {
        return null;
    }

    const top = Math.min(...routing.obstacles.map((obstacle) => obstacle.y));
    const trunkY = top - RELATIONSHIP_CLEARANCES.network - CORNER_RADIUS;
    const candidate = [
        source,
        sourceLead,
        { x: sourceLead.x, y: trunkY },
        { x: targetLead.x, y: trunkY },
        targetLead,
        target,
    ];
    const unrelatedObstacles = expandedObstacles.filter(
        (obstacle) => obstacle.id !== routing.sourceNodeId && obstacle.id !== routing.targetNodeId,
    );
    return routeIsClear(candidate, unrelatedObstacles) ? candidate : null;
};

const findMiddleRoute = (
    start: OrthogonalPoint,
    end: OrthogonalPoint,
    obstacles: readonly OrthogonalObstacle[],
    outerMargin: number,
): OrthogonalPoint[] | null => {
    const left = Math.min(start.x, end.x, ...obstacles.map((obstacle) => obstacle.x)) - outerMargin;
    const right = Math.max(start.x, end.x, ...obstacles.map((obstacle) => obstacle.x + obstacle.width)) + outerMargin;
    const top = Math.min(start.y, end.y, ...obstacles.map((obstacle) => obstacle.y)) - outerMargin;
    const bottom = Math.max(start.y, end.y, ...obstacles.map((obstacle) => obstacle.y + obstacle.height)) + outerMargin;

    const xs = uniqueSorted([
        left,
        right,
        start.x,
        end.x,
        ...obstacles.flatMap((obstacle) => [obstacle.x, obstacle.x + obstacle.width]),
    ]);
    const ys = uniqueSorted([
        top,
        bottom,
        start.y,
        end.y,
        ...obstacles.flatMap((obstacle) => [obstacle.y, obstacle.y + obstacle.height]),
    ]);

    const grid: number[][] = Array.from({ length: ys.length }, () => Array<number>(xs.length).fill(-1));
    const points: OrthogonalPoint[] = [];
    for (let yIndex = 0; yIndex < ys.length; yIndex++) {
        const y = ys[yIndex];
        if (y === undefined) continue;
        for (let xIndex = 0; xIndex < xs.length; xIndex++) {
            const x = xs[xIndex];
            if (x === undefined) continue;
            const point = { x, y };
            if (obstacles.some((obstacle) => isInside(point, obstacle))) continue;
            const pointIndex = points.length;
            points.push(point);
            const row = grid[yIndex];
            if (row) row[xIndex] = pointIndex;
        }
    }

    const startX = xs.indexOf(start.x);
    const startY = ys.indexOf(start.y);
    const endX = xs.indexOf(end.x);
    const endY = ys.indexOf(end.y);
    const startIndex = grid[startY]?.[startX] ?? -1;
    const endIndex = grid[endY]?.[endX] ?? -1;
    if (startIndex < 0 || endIndex < 0) return null;

    const stateCount = points.length * 3;
    const distance = Array<number>(stateCount).fill(Number.POSITIVE_INFINITY);
    const previous = Array<number>(stateCount).fill(-1);
    const queue = new MinQueue();
    const startState = startIndex * 3;
    let sequence = 0;
    distance[startState] = 0;
    queue.push({ state: startState, pointIndex: startIndex, heading: 0, cost: 0, sequence: sequence++ });

    let finalState = -1;
    while (queue.size > 0) {
        const current = queue.pop();
        if (!current || current.cost !== distance[current.state]) continue;
        if (current.pointIndex === endIndex) {
            finalState = current.state;
            break;
        }

        const point = points[current.pointIndex];
        if (!point) continue;
        const xIndex = xs.indexOf(point.x);
        const yIndex = ys.indexOf(point.y);
        const candidates: Array<{ pointIndex: number; heading: Heading }> = [];

        for (const step of [-1, 1]) {
            for (let nextX = xIndex + step; nextX >= 0 && nextX < xs.length; nextX += step) {
                const nextIndex = grid[yIndex]?.[nextX] ?? -1;
                if (nextIndex < 0) continue;
                candidates.push({ pointIndex: nextIndex, heading: 1 });
                break;
            }
            for (let nextY = yIndex + step; nextY >= 0 && nextY < ys.length; nextY += step) {
                const nextIndex = grid[nextY]?.[xIndex] ?? -1;
                if (nextIndex < 0) continue;
                candidates.push({ pointIndex: nextIndex, heading: 2 });
                break;
            }
        }

        for (const candidate of candidates) {
            const nextPoint = points[candidate.pointIndex];
            if (!nextPoint || !segmentIsClear(point, nextPoint, obstacles)) continue;
            const length = Math.abs(nextPoint.x - point.x) + Math.abs(nextPoint.y - point.y);
            const bend = current.heading !== 0 && current.heading !== candidate.heading ? BEND_PENALTY : 0;
            const nextCost = current.cost + length + bend;
            const nextState = candidate.pointIndex * 3 + candidate.heading;
            if (nextCost >= (distance[nextState] ?? Number.POSITIVE_INFINITY) - EPSILON) continue;
            distance[nextState] = nextCost;
            previous[nextState] = current.state;
            queue.push({
                state: nextState,
                pointIndex: candidate.pointIndex,
                heading: candidate.heading,
                cost: nextCost,
                sequence: sequence++,
            });
        }
    }

    if (finalState < 0) return null;
    const route: OrthogonalPoint[] = [];
    for (let state = finalState; state >= 0; state = previous[state] ?? -1) {
        const point = points[Math.floor(state / 3)];
        if (point) route.push(point);
    }
    return route.reverse();
};

const simplifyPoints = (points: readonly OrthogonalPoint[]): OrthogonalPoint[] => {
    const result: OrthogonalPoint[] = [];
    for (const point of points) {
        const last = result[result.length - 1];
        if (last && Math.abs(last.x - point.x) < EPSILON && Math.abs(last.y - point.y) < EPSILON) continue;
        const previous = result[result.length - 2];
        if (
            previous &&
            last &&
            ((Math.abs(previous.x - last.x) < EPSILON && Math.abs(last.x - point.x) < EPSILON) ||
                (Math.abs(previous.y - last.y) < EPSILON && Math.abs(last.y - point.y) < EPSILON))
        ) {
            result[result.length - 1] = point;
        } else {
            result.push(point);
        }
    }
    return result;
};

const formatCoordinate = (coordinate: number): string => Number(coordinate.toFixed(3)).toString();

const pointToward = (from: OrthogonalPoint, to: OrthogonalPoint, distance: number): OrthogonalPoint => {
    const total = Math.abs(to.x - from.x) + Math.abs(to.y - from.y);
    if (total === 0) return to;
    const ratio = distance / total;
    return {
        x: from.x + (to.x - from.x) * ratio,
        y: from.y + (to.y - from.y) * ratio,
    };
};

const roundedPath = (points: readonly OrthogonalPoint[]): string => {
    const first = points[0];
    if (!first) return "";
    let path = `M${formatCoordinate(first.x)} ${formatCoordinate(first.y)}`;
    for (let index = 1; index < points.length - 1; index++) {
        const previous = points[index - 1];
        const corner = points[index];
        const next = points[index + 1];
        if (!previous || !corner || !next) continue;
        const incoming = Math.abs(corner.x - previous.x) + Math.abs(corner.y - previous.y);
        const outgoing = Math.abs(next.x - corner.x) + Math.abs(next.y - corner.y);
        const radius = Math.min(CORNER_RADIUS, incoming / 2, outgoing / 2);
        const before = pointToward(corner, previous, radius);
        const after = pointToward(corner, next, radius);
        path += `L${formatCoordinate(before.x)} ${formatCoordinate(before.y)}`;
        path += `Q${formatCoordinate(corner.x)} ${formatCoordinate(corner.y)} ${formatCoordinate(after.x)} ${formatCoordinate(after.y)}`;
    }
    const last = points[points.length - 1];
    if (last) path += `L${formatCoordinate(last.x)} ${formatCoordinate(last.y)}`;
    return path;
};

const midpoint = (points: readonly OrthogonalPoint[]): OrthogonalPoint => {
    let length = 0;
    for (let index = 1; index < points.length; index++) {
        const previous = points[index - 1];
        const point = points[index];
        if (previous && point) length += Math.abs(point.x - previous.x) + Math.abs(point.y - previous.y);
    }

    let remaining = length / 2;
    for (let index = 1; index < points.length; index++) {
        const previous = points[index - 1];
        const point = points[index];
        if (!previous || !point) continue;
        const segmentLength = Math.abs(point.x - previous.x) + Math.abs(point.y - previous.y);
        if (remaining <= segmentLength) return pointToward(previous, point, remaining);
        remaining -= segmentLength;
    }
    return points[0] ?? { x: 0, y: 0 };
};

export const routingObstaclesForNodes = (nodes: readonly Node[]): OrthogonalObstacle[] =>
    nodes
        .filter((node) => !node.hidden)
        .map((node) => {
            const fallback = dimensionsForBuilderNode(node);
            return {
                id: node.id,
                x: node.position.x,
                y: node.position.y,
                width: node.measured?.width ?? node.width ?? fallback.width,
                height: node.measured?.height ?? node.height ?? fallback.height,
            };
        })
        .sort((left, right) => left.id.localeCompare(right.id));

export const getOrthogonalRoutePoints = (
    params: RoundedOrthogonalPathParams,
    relationship: RelationshipLane = "dependency",
    routing?: OrthogonalRoutingContext,
): OrthogonalPoint[] => {
    const sourcePosition = params.sourcePosition ?? BUILDER_OUTPUT_POSITION;
    const targetPosition = params.targetPosition ?? BUILDER_INPUT_POSITION;
    const source = moveFromTerminal({ x: params.sourceX, y: params.sourceY }, sourcePosition, -BUILDER_HANDLE_RADIUS);
    const target = moveFromTerminal({ x: params.targetX, y: params.targetY }, targetPosition, -BUILDER_HANDLE_RADIUS);
    const laneOffset = BUILDER_RELATIONSHIP_LANE_OFFSETS[relationship];
    const sourceLead = moveFromTerminal(source, sourcePosition, laneOffset);
    const targetLead = moveFromTerminal(target, targetPosition, laneOffset);
    const expandedObstacles = routing
        ? [...routing.obstacles]
              .sort((left, right) => left.id.localeCompare(right.id))
              .map((obstacle) => expandObstacle(obstacle, relationship, routing))
        : [];
    if (relationship === "network" && routing) {
        const bundled = bundledNetworkRoute(
            source,
            target,
            sourceLead,
            targetLead,
            sourcePosition,
            targetPosition,
            routing,
            expandedObstacles,
        );
        if (bundled) return bundled;
    }
    const middle = findMiddleRoute(sourceLead, targetLead, expandedObstacles, laneOffset + CORNER_RADIUS + 30);
    if (middle) return [source, ...middle, target];

    // Very close blocks can consume a preferred clearance lane. Retry against
    // the actual block rectangles from the terminals before accepting that the
    // geometry is physically unroutable (for example, overlapping blocks).
    const rawObstacles = routing ? [...routing.obstacles].sort((left, right) => left.id.localeCompare(right.id)) : [];
    return findMiddleRoute(source, target, rawObstacles, laneOffset + CORNER_RADIUS + 30) ?? [source, target];
};

export const getRoundedOrthogonalPath = (
    params: RoundedOrthogonalPathParams,
    relationship: RelationshipLane = "dependency",
    routing?: OrthogonalRoutingContext,
): [path: string, labelX: number, labelY: number, offsetX: number, offsetY: number] => {
    const points = simplifyPoints(getOrthogonalRoutePoints(params, relationship, routing));
    const label = midpoint(points);
    return [
        roundedPath(points),
        label.x,
        label.y,
        Math.abs(label.x - params.sourceX),
        Math.abs(label.y - params.sourceY),
    ];
};
