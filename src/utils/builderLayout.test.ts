import type { Edge, Node } from "@xyflow/react";
import { describe, expect, it } from "vitest";
import { dimensionsForBuilderNode, layoutBuilderGraph } from "./builderLayout";

const positionsById = (nodes: readonly Node[]) =>
    Object.fromEntries(nodes.map((node) => [node.id, node.position] as const));

const centerY = (node: Node) => node.position.y + dimensionsForBuilderNode(node).height / 2;

describe("layoutBuilderGraph", () => {
    it("returns the same left-to-right placement when input order changes", () => {
        const nodes: Node[] = [
            { id: "service-db", type: "serviceNode", position: { x: 900, y: 900 }, data: {} },
            { id: "service-api", type: "serviceNode", position: { x: 0, y: 0 }, data: {} },
            { id: "network-backend", type: "networkNode", position: { x: 50, y: 50 }, data: {} },
        ];
        const edges: Edge[] = [
            { id: "dep-api-db", source: "service-db", target: "service-api" },
            { id: "net-api-backend", source: "network-backend", target: "service-api" },
        ];

        const forward = positionsById(layoutBuilderGraph(nodes, edges));
        const reversed = positionsById(layoutBuilderGraph([...nodes].reverse(), [...edges].reverse()));

        expect(reversed).toEqual(forward);
        expect(forward["service-db"]?.x).toBeLessThan(forward["service-api"]?.x ?? 0);
        expect(forward["network-backend"]?.x).toBeLessThan(forward["service-api"]?.x ?? 0);
    });

    it("reserves room for right-side output and left-side input leads between acyclic ranks", () => {
        const nodes: Node[] = [
            { id: "service-db", type: "serviceNode", position: { x: 0, y: 0 }, data: {} },
            { id: "service-api", type: "serviceNode", position: { x: 0, y: 0 }, data: {} },
            { id: "network-backend", type: "networkNode", position: { x: 0, y: 0 }, data: {} },
            { id: "volume-data", type: "volumeNode", position: { x: 0, y: 0 }, data: {} },
        ];
        const edges: Edge[] = [
            { id: "dep-api-db", source: "service-db", target: "service-api" },
            { id: "net-api-backend", source: "network-backend", target: "service-api" },
            { id: "vol-api-data", source: "volume-data", target: "service-api" },
        ];

        const result = new Map(layoutBuilderGraph(nodes, edges).map((node) => [node.id, node] as const));

        for (const edge of edges) {
            const source = result.get(edge.source);
            const target = result.get(edge.target);
            expect(source).toBeDefined();
            expect(target).toBeDefined();
            if (!source || !target) continue;

            const sourceWidth = source.type === "serviceNode" ? 240 : 180;
            expect(target.position.x - (source.position.x + sourceWidth)).toBeGreaterThanOrEqual(180);
        }
    });

    it("snaps cyclic and disconnected components to non-overlapping grid positions", () => {
        const nodes: Node[] = [
            { id: "service-a", type: "serviceNode", position: { x: 1, y: 2 }, data: {} },
            { id: "service-b", type: "serviceNode", position: { x: 3, y: 4 }, data: {} },
            { id: "secret-token", type: "secretNode", position: { x: 5, y: 6 }, data: {} },
            { id: "config-settings", type: "configNode", position: { x: 7, y: 8 }, data: {} },
        ];
        const edges: Edge[] = [
            { id: "a-b", source: "service-a", target: "service-b" },
            { id: "b-a", source: "service-b", target: "service-a" },
        ];
        const originalPositions = Object.fromEntries(nodes.map((node) => [node.id, { ...node.position }] as const));

        const result = layoutBuilderGraph(nodes, edges);
        const reordered = layoutBuilderGraph([...nodes].reverse(), [...edges].reverse());

        expect(result).toHaveLength(nodes.length);
        expect(positionsById(reordered)).toEqual(positionsById(result));
        expect(positionsById(nodes)).toEqual(originalPositions);
        expect(result.every((node) => node.position.x % 15 === 0 && node.position.y % 15 === 0)).toBe(true);

        const dimensions: Record<string, { width: number; height: number }> = {
            serviceNode: { width: 240, height: 150 },
            secretNode: { width: 180, height: 100 },
            configNode: { width: 180, height: 100 },
        };
        for (const [index, node] of result.entries()) {
            const size = dimensions[node.type ?? ""];
            expect(size).toBeDefined();
            if (!size) continue;

            for (const other of result.slice(index + 1)) {
                const otherSize = dimensions[other.type ?? ""];
                expect(otherSize).toBeDefined();
                if (!otherSize) continue;

                const separatedHorizontally =
                    node.position.x + size.width <= other.position.x ||
                    other.position.x + otherSize.width <= node.position.x;
                const separatedVertically =
                    node.position.y + size.height <= other.position.y ||
                    other.position.y + otherSize.height <= node.position.y;
                expect(separatedHorizontally || separatedVertically).toBe(true);
            }
        }
    });

    it("compacts a shared-network service graph into aligned horizontal lanes", () => {
        const serviceNames = [
            "file_storage",
            "document_storage",
            "street_falcon_db",
            "rabbitmq",
            "street_falcon_service",
            "street_falcon_dev_api",
            "spec_publisher",
            "local_complex_monitoring",
            "offence_collector",
            "local_complex_monitoring_listener",
        ];
        const nodes: Node[] = [
            ...serviceNames.map((name) => ({
                id: `service-${name}`,
                type: "serviceNode",
                position: { x: 0, y: 0 },
                data: {},
            })),
            { id: "network-owl_network", type: "networkNode", position: { x: 0, y: 0 }, data: {} },
        ];
        const networkServices = [
            "street_falcon_db",
            "rabbitmq",
            "street_falcon_service",
            "street_falcon_dev_api",
            "spec_publisher",
            "local_complex_monitoring",
            "offence_collector",
        ];
        const dependencies: Array<readonly [source: string, target: string]> = [
            ["street_falcon_db", "street_falcon_service"],
            ["rabbitmq", "street_falcon_service"],
            ["street_falcon_db", "street_falcon_dev_api"],
            ["rabbitmq", "street_falcon_dev_api"],
            ["street_falcon_service", "local_complex_monitoring"],
            ["street_falcon_db", "offence_collector"],
            ["rabbitmq", "offence_collector"],
            ["local_complex_monitoring", "local_complex_monitoring_listener"],
        ];
        const edges: Edge[] = [
            ...networkServices.map((name) => ({
                id: `net-${name}-owl_network`,
                source: "network-owl_network",
                target: `service-${name}`,
                type: "networkEdge",
            })),
            ...dependencies.map(([source, target]) => ({
                id: `dep-${target}-${source}`,
                source: `service-${source}`,
                target: `service-${target}`,
                type: "dependsOnEdge",
            })),
        ];

        const result = layoutBuilderGraph(nodes, edges);
        const byId = new Map(result.map((node) => [node.id, node] as const));
        const verticalLanes = new Set(result.map(centerY));
        const mainLane = centerY(byId.get("network-owl_network")!);

        expect(verticalLanes).toHaveLength(3);
        expect(centerY(byId.get("service-street_falcon_service")!)).toBe(mainLane);
        expect(centerY(byId.get("service-local_complex_monitoring")!)).toBe(mainLane);
        expect(centerY(byId.get("service-local_complex_monitoring_listener")!)).toBe(mainLane);
    });

    it("returns an empty layout for an empty builder", () => {
        expect(layoutBuilderGraph([], [])).toEqual([]);
    });
});
