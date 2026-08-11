import { Position } from "@xyflow/react";
import { describe, expect, it } from "vitest";
import {
    getOrthogonalRoutePoints,
    getRoundedOrthogonalPath,
    routingObstaclesForNodes,
    type OrthogonalObstacle,
    type OrthogonalPoint,
} from "./orthogonalPath";

const segmentEntersRectangle = (start: OrthogonalPoint, end: OrthogonalPoint, obstacle: OrthogonalObstacle) => {
    const right = obstacle.x + obstacle.width;
    const bottom = obstacle.y + obstacle.height;
    if (start.y === end.y) {
        return (
            start.y > obstacle.y &&
            start.y < bottom &&
            Math.max(Math.min(start.x, end.x), obstacle.x) < Math.min(Math.max(start.x, end.x), right)
        );
    }

    return (
        start.x > obstacle.x &&
        start.x < right &&
        Math.max(Math.min(start.y, end.y), obstacle.y) < Math.min(Math.max(start.y, end.y), bottom)
    );
};

const expectRouteToAvoid = (points: readonly OrthogonalPoint[], obstacle: OrthogonalObstacle) => {
    for (let index = 1; index < points.length; index++) {
        const start = points[index - 1];
        const end = points[index];
        expect(start, `missing route point ${index - 1}`).toBeDefined();
        expect(end, `missing route point ${index}`).toBeDefined();
        if (!start || !end) continue;
        expect(start.x === end.x || start.y === end.y).toBe(true);
        expect(segmentEntersRectangle(start, end, obstacle)).toBe(false);
    }
};

const geometry = {
    sourceX: 100,
    sourceY: 50,
    targetX: 500,
    targetY: 50,
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
};

const source: OrthogonalObstacle = { id: "service-source", x: 0, y: 0, width: 100, height: 100 };
const blocker: OrthogonalObstacle = { id: "service-blocker", x: 220, y: -20, width: 80, height: 140 };
const target: OrthogonalObstacle = { id: "service-target", x: 500, y: 0, width: 100, height: 100 };

const routing = (obstacles: readonly OrthogonalObstacle[]) => ({
    obstacles,
    sourceNodeId: source.id,
    targetNodeId: target.id,
});

describe("getRoundedOrthogonalPath", () => {
    it("recalculates straight segments and rounded corners when an endpoint moves", () => {
        const initial = getRoundedOrthogonalPath({
            sourceX: 0,
            sourceY: 0,
            targetX: 300,
            targetY: 150,
            sourcePosition: Position.Right,
            targetPosition: Position.Left,
        });
        const moved = getRoundedOrthogonalPath({
            sourceX: 0,
            sourceY: 0,
            targetX: 450,
            targetY: 300,
            sourcePosition: Position.Right,
            targetPosition: Position.Left,
        });

        expect(initial[0]).toMatch(/^M/);
        expect(initial[0]).toContain("L");
        expect(initial[0]).toContain("Q");
        expect(initial[0]).not.toContain("C");
        expect(moved[0]).not.toBe(initial[0]);
        expect(moved[0]).toContain("Q");
        expect(moved[0]).not.toContain("C");
    });

    it("assigns different relationship colors to separate outer routing lanes", () => {
        const geometry = {
            sourceX: 600,
            sourceY: 100,
            targetX: 0,
            targetY: 400,
            sourcePosition: Position.Right,
            targetPosition: Position.Left,
        };

        const dependencyPath = getRoundedOrthogonalPath(geometry, "dependency")[0];
        const networkPath = getRoundedOrthogonalPath(geometry, "network")[0];
        const volumePath = getRoundedOrthogonalPath(geometry, "volume")[0];

        expect(dependencyPath).toContain("630");
        expect(networkPath).toContain("645");
        expect(volumePath).toContain("660");
    });

    it("detours every orthogonal segment around an unrelated block", () => {
        const points = getOrthogonalRoutePoints(geometry, "dependency", routing([source, blocker, target]));
        const path = getRoundedOrthogonalPath(geometry, "dependency", routing([source, blocker, target]))[0];

        expectRouteToAvoid(points, blocker);
        expect(points.some((point) => point.y < blocker.y || point.y > blocker.y + blocker.height)).toBe(true);
        expect(path).toContain("Q");
        expect(path).not.toContain("C");
    });

    it("is deterministic for reordered obstacles and reroutes after an obstacle moves", () => {
        const initial = getOrthogonalRoutePoints(geometry, "network", routing([source, blocker, target]));
        const reordered = getOrthogonalRoutePoints(geometry, "network", routing([target, blocker, source]));
        const movedBlocker = { ...blocker, x: 220, y: 180 };
        const moved = getOrthogonalRoutePoints(geometry, "network", routing([target, movedBlocker, source]));

        expect(reordered).toEqual(initial);
        expect(moved).not.toEqual(initial);
        expectRouteToAvoid(moved, movedBlocker);
    });

    it("keeps relationship-specific lead points separate while avoiding the same block", () => {
        const context = routing([source, blocker, target]);
        const dependency = getOrthogonalRoutePoints(geometry, "dependency", context);
        const network = getOrthogonalRoutePoints(geometry, "network", context);
        const volume = getOrthogonalRoutePoints(geometry, "volume", context);

        expect(dependency[1]?.x).toBe(130);
        expect(network[1]?.x).toBe(145);
        expect(volume[1]?.x).toBe(160);
        expect(dependency).not.toEqual(network);
        expect(network).not.toEqual(volume);
        expectRouteToAvoid(dependency, blocker);
        expectRouteToAvoid(network, blocker);
        expectRouteToAvoid(volume, blocker);
    });

    it("derives obstacle rectangles from measured node dimensions with stable fallbacks", () => {
        const obstacles = routingObstaclesForNodes([
            {
                id: "service-api",
                type: "serviceNode",
                position: { x: 30, y: 45 },
                measured: { width: 260, height: 170 },
                data: {},
            },
            {
                id: "network-default",
                type: "networkNode",
                position: { x: 400, y: 90 },
                data: {},
            },
        ]);

        expect(obstacles).toEqual([
            { id: "network-default", x: 400, y: 90, width: 120, height: 120 },
            { id: "service-api", x: 30, y: 45, width: 260, height: 170 },
        ]);
    });
});
