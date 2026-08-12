import { Position } from "@xyflow/react";
import { describe, expect, it } from "vitest";
import {
    getOrthogonalRoutePoints,
    getRoundedOrthogonalPath,
    routingObstaclesForNodes,
    type OrthogonalObstacle,
    type OrthogonalPoint,
    type OrthogonalRoutingContext,
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
    it("anchors both path endpoints at the centers of the builder handles", () => {
        const points = getOrthogonalRoutePoints(geometry, "dependency");
        const path = getRoundedOrthogonalPath(geometry, "dependency")[0];

        expect(points[0]).toEqual({ x: 97, y: 50 });
        expect(points.at(-1)).toEqual({ x: 503, y: 50 });
        expect(path).toMatch(/^M97 50/);
        expect(path).toMatch(/L503 50$/);
    });

    it("falls back to a right-side output and left-side input when positions are omitted", () => {
        const points = getOrthogonalRoutePoints(
            {
                sourceX: 100,
                sourceY: 50,
                targetX: 500,
                targetY: 50,
            },
            "volume",
        );

        expect(points[1]).toEqual({ x: 157, y: 50 });
        expect(points.at(-2)).toEqual({ x: 443, y: 50 });
    });

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

        expect(dependencyPath).toContain("627");
        expect(networkPath).toContain("642");
        expect(volumePath).toContain("657");
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

        expect(dependency[1]?.x).toBe(127);
        expect(network[1]?.x).toBe(142);
        expect(volume[1]?.x).toBe(157);
        expect(dependency).not.toEqual(network);
        expect(network).not.toEqual(volume);
        expectRouteToAvoid(dependency, blocker);
        expectRouteToAvoid(network, blocker);
        expectRouteToAvoid(volume, blocker);
    });

    it("routes services on one network through a shared trunk before branching", () => {
        const network: OrthogonalObstacle = { id: "network-shared", x: 0, y: 45, width: 120, height: 120 };
        const serviceA: OrthogonalObstacle = { id: "service-a", x: 450, y: 30, width: 240, height: 150 };
        const serviceB: OrthogonalObstacle = { id: "service-b", x: 870, y: 270, width: 240, height: 150 };
        const obstacles = [network, serviceA, serviceB];
        const bundleTargetNodeIds = [serviceA.id, serviceB.id];
        const routingFor = (targetNodeId: string) =>
            ({
                obstacles,
                sourceNodeId: network.id,
                targetNodeId,
                networkBundleTargetNodeIds: bundleTargetNodeIds,
            }) as OrthogonalRoutingContext;

        const first = getOrthogonalRoutePoints(
            {
                sourceX: 120,
                sourceY: 105,
                targetX: 450,
                targetY: 105,
                sourcePosition: Position.Right,
                targetPosition: Position.Left,
            },
            "network",
            routingFor(serviceA.id),
        );
        const second = getOrthogonalRoutePoints(
            {
                sourceX: 120,
                sourceY: 105,
                targetX: 870,
                targetY: 345,
                sourcePosition: Position.Right,
                targetPosition: Position.Left,
            },
            "network",
            routingFor(serviceB.id),
        );

        expect(first.slice(0, 3)).toEqual(second.slice(0, 3));
        expect(first[2]?.y).toBeLessThan(network.y);
        expect(first.at(-1)).toEqual({ x: 453, y: 105 });
        expect(second.at(-1)).toEqual({ x: 873, y: 345 });
        expectRouteToAvoid(first, serviceB);
        expectRouteToAvoid(second, serviceA);
    });

    it("falls back to an individual route when a network target is not to the right", () => {
        const network: OrthogonalObstacle = { id: "network-shared", x: 0, y: 45, width: 120, height: 120 };
        const leftTarget: OrthogonalObstacle = { id: "service-left", x: -400, y: 30, width: 240, height: 150 };
        const rightTarget: OrthogonalObstacle = { id: "service-right", x: 450, y: 270, width: 240, height: 150 };
        const obstacles = [network, leftTarget, rightTarget];
        const individualRouting: OrthogonalRoutingContext = {
            obstacles,
            sourceNodeId: network.id,
            targetNodeId: leftTarget.id,
        };
        const bundledRouting = {
            ...individualRouting,
            networkBundleTargetNodeIds: [leftTarget.id, rightTarget.id],
        } as OrthogonalRoutingContext;
        const leftGeometry = {
            sourceX: 120,
            sourceY: 105,
            targetX: -400,
            targetY: 105,
            sourcePosition: Position.Right,
            targetPosition: Position.Left,
        };

        expect(getOrthogonalRoutePoints(leftGeometry, "network", bundledRouting)).toEqual(
            getOrthogonalRoutePoints(leftGeometry, "network", individualRouting),
        );
    });

    it("falls back when a network target has no room for opposing terminal leads", () => {
        const network: OrthogonalObstacle = { id: "network-shared", x: 0, y: 45, width: 120, height: 120 };
        const closeTarget: OrthogonalObstacle = { id: "service-close", x: 170, y: 30, width: 240, height: 150 };
        const farTarget: OrthogonalObstacle = { id: "service-far", x: 600, y: 270, width: 240, height: 150 };
        const obstacles = [network, closeTarget, farTarget];
        const individualRouting: OrthogonalRoutingContext = {
            obstacles,
            sourceNodeId: network.id,
            targetNodeId: closeTarget.id,
        };
        const bundledRouting: OrthogonalRoutingContext = {
            ...individualRouting,
            networkBundleTargetNodeIds: [closeTarget.id, farTarget.id],
        };
        const closeGeometry = {
            sourceX: 120,
            sourceY: 105,
            targetX: 170,
            targetY: 105,
            sourcePosition: Position.Right,
            targetPosition: Position.Left,
        };

        expect(getOrthogonalRoutePoints(closeGeometry, "network", bundledRouting)).toEqual(
            getOrthogonalRoutePoints(closeGeometry, "network", individualRouting),
        );
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
