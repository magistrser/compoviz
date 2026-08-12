import { getSuggestionCounts, getHighestSeverity } from "./suggestions";
import { MountTypes } from "../models/ComposeAST";
import type { Edge, Node } from "@xyflow/react";
import type { ComposeAST } from "../models/ComposeAST";
import type { Position, Suggestion } from "../models/composeTypes";
import { BUILDER_INPUT_POSITION, BUILDER_OUTPUT_POSITION } from "./builderConnectionGeometry";

export function positionFromRaw(value: unknown): Position | null {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
    if (!("_position" in value)) return null;
    const position = value._position;
    if (typeof position !== "object" || position === null || Array.isArray(position)) return null;
    if (!("x" in position) || !("y" in position)) return null;
    if (typeof position.x !== "number" || typeof position.y !== "number") return null;
    return { x: position.x, y: position.y };
}

/**
 * Converts the workspace AST to React Flow nodes and edges.
 * Uses retained raw resource metadata for UI positions.
 * @param {ComposeAST} ast - The canonical Compose read model
 * @param {Array} suggestions - List of suggestions from generateSuggestions
 * @returns {{ nodes: Array, edges: Array }}
 */
export function stateToFlow(
    ast: ComposeAST,
    suggestions: readonly Suggestion[] = [],
): { nodes: Node[]; edges: Edge[] } {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Layout constants
    const SERVICE_START_X = 300;
    const SERVICE_START_Y = 100;
    const SERVICE_SPACING_X = 280;
    const SERVICE_SPACING_Y = 200;
    const SERVICES_PER_ROW = 3;

    const NETWORK_START_X = 100;
    const NETWORK_START_Y = 500;
    const NETWORK_SPACING = 180;

    const VOLUME_START_X = 900;
    const VOLUME_START_Y = 500;
    const VOLUME_SPACING = 180;

    const SECRET_START_X = 100;
    const SECRET_START_Y = 700;
    const SECRET_SPACING = 180;

    const CONFIG_START_X = 500;
    const CONFIG_START_Y = 700;
    const CONFIG_SPACING = 180;

    // Services — normalized reads plus retained raw position metadata
    let serviceIndex = 0;
    for (const service of ast.services) {
        const name = service.id;
        const row = Math.floor(serviceIndex / SERVICES_PER_ROW);
        const col = serviceIndex % SERVICES_PER_ROW;

        const position = positionFromRaw(service._raw) ?? {
            x: SERVICE_START_X + col * SERVICE_SPACING_X,
            y: SERVICE_START_Y + row * SERVICE_SPACING_Y,
        };

        const suggestionCounts = getSuggestionCounts(suggestions, name);
        const suggestionSeverity = getHighestSeverity(suggestions, name);

        nodes.push({
            id: `service-${name}`,
            type: "serviceNode",
            position,
            sourcePosition: BUILDER_OUTPUT_POSITION,
            targetPosition: BUILDER_INPUT_POSITION,
            data: {
                name,
                image: service.image,
                ports: service.ports.map((p) => p.raw),
                hasHealthcheck:
                    service.healthcheck !== null &&
                    !service.healthcheck?.disabled &&
                    service.healthcheck?.test?.length > 0,
                hasEnvFile: service.envFiles.length > 0,
                networks: service.networks.map((n) => n.network),
                volumes: service.volumes.map((v) => v.raw),
                suggestionCount: suggestionCounts.total,
                suggestionSeverity,
            },
        });

        // Dependency edges — from AST's pre-normalized dependencies
        for (const dep of service.dependencies) {
            edges.push({
                id: `dep-${name}-${dep.service}`,
                source: `service-${dep.service}`,
                target: `service-${name}`,
                sourceHandle: "deps-out",
                targetHandle: "deps-in",
                type: "dependsOnEdge",
                data: { condition: dep.condition },
                animated: true,
            });
        }

        // Network edges
        for (const net of service.networks) {
            edges.push({
                id: `net-${name}-${net.network}`,
                source: `network-${net.network}`,
                target: `service-${name}`,
                sourceHandle: "network-out",
                targetHandle: "network-in",
                type: "networkEdge",
            });
        }

        // Volume edges — from AST's pre-parsed volume mounts
        for (const vol of service.volumes) {
            if (vol.type === MountTypes.VOLUME && ast.volumeMap.has(vol.source)) {
                edges.push({
                    id: `vol-${name}-${vol.source}`,
                    source: `volume-${vol.source}`,
                    target: `service-${name}`,
                    sourceHandle: "volume-out",
                    targetHandle: "volume-in",
                    type: "volumeEdge",
                    data: { mountPath: vol.target },
                });
            }
        }

        serviceIndex++;
    }

    // Networks
    let networkIndex = 0;
    for (const network of ast.networks) {
        const name = network.id;
        const position = positionFromRaw(network._raw) ?? {
            x: NETWORK_START_X + networkIndex * NETWORK_SPACING,
            y: NETWORK_START_Y,
        };

        const suggestionCounts = getSuggestionCounts(suggestions, name);
        const suggestionSeverity = getHighestSeverity(suggestions, name);

        nodes.push({
            id: `network-${name}`,
            type: "networkNode",
            position,
            sourcePosition: BUILDER_OUTPUT_POSITION,
            targetPosition: BUILDER_INPUT_POSITION,
            data: {
                name,
                driver: network.driver,
                external: network.external,
                suggestionCount: suggestionCounts.total,
                suggestionSeverity,
            },
        });
        networkIndex++;
    }

    // Volumes
    let volumeIndex = 0;
    for (const volume of ast.volumes) {
        const name = volume.id;
        const position = positionFromRaw(volume._raw) ?? {
            x: VOLUME_START_X + volumeIndex * VOLUME_SPACING,
            y: VOLUME_START_Y,
        };

        const suggestionCounts = getSuggestionCounts(suggestions, name);
        const suggestionSeverity = getHighestSeverity(suggestions, name);

        nodes.push({
            id: `volume-${name}`,
            type: "volumeNode",
            position,
            sourcePosition: BUILDER_OUTPUT_POSITION,
            targetPosition: BUILDER_INPUT_POSITION,
            data: {
                name,
                driver: volume.driver,
                external: volume.external,
                suggestionCount: suggestionCounts.total,
                suggestionSeverity,
            },
        });
        volumeIndex++;
    }

    // Secrets
    let secretIndex = 0;
    for (const secret of ast.secrets) {
        const name = secret.id;
        const position = positionFromRaw(secret._raw) ?? {
            x: SECRET_START_X + secretIndex * SECRET_SPACING,
            y: SECRET_START_Y,
        };

        nodes.push({
            id: `secret-${name}`,
            type: "secretNode",
            position,
            sourcePosition: BUILDER_OUTPUT_POSITION,
            targetPosition: BUILDER_INPUT_POSITION,
            data: {
                name,
                file: secret.file,
                external: secret.external,
            },
        });
        secretIndex++;
    }

    // Configs
    let configIndex = 0;
    for (const config of ast.configs) {
        const name = config.id;
        const position = positionFromRaw(config._raw) ?? {
            x: CONFIG_START_X + configIndex * CONFIG_SPACING,
            y: CONFIG_START_Y,
        };

        nodes.push({
            id: `config-${name}`,
            type: "configNode",
            position,
            sourcePosition: BUILDER_OUTPUT_POSITION,
            targetPosition: BUILDER_INPUT_POSITION,
            data: {
                name,
                file: config.file,
                external: config.external,
            },
        });
        configIndex++;
    }

    return { nodes, edges };
}

/**
 * Parse node ID to get type and name
 */
export function parseNodeId(nodeId: string): { type: string; name: string } {
    const [type, ...nameParts] = nodeId.split("-");
    return { type: type ?? "", name: nameParts.join("-") };
}
