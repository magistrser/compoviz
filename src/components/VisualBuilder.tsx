import React, { useCallback, useMemo, useRef, useState, useEffect, type DragEvent } from "react";
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    Panel,
    BackgroundVariant,
    type Connection,
    type Edge,
    type Node,
    type OnBeforeDelete,
    type OnNodeDrag,
    type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { nodeTypes } from "./nodes";
import { DEPENDENCY_CONDITION_VISUALS, edgeTypes } from "./edges";
import { DependencyConditions, type DependencyCondition } from "../models";
import { routingObstaclesForNodes } from "./edges/orthogonalPath";
import BuilderToolbar from "./BuilderToolbar";
import NodeConfigPanel from "./NodeConfigPanel";
import { stateToFlow, parseNodeId, positionFromRaw } from "../utils/flowConverter";
import { layoutBuilderGraph } from "../utils/builderLayout";
import { mergeFlowElements } from "../utils/objectUtils";
import { Brush, Download, Lightbulb, LightbulbOff } from "lucide-react";
import { useComposeWorkspace } from "../features/compose-workspace";
import { useComposeEditing } from "../features/compose-editing";
import type { ComposeRelationshipChange, ComposeResourcePosition } from "../features/compose-editing";
import { useUI } from "../context/UIContext";
import { usePopup } from "./ui";
import type { ResourceType } from "../context/UIContext";
import type { Position } from "../models/composeTypes";

type BuilderNodeType = "service" | "network" | "volume" | "secret" | "config";

interface SelectedNode {
    type: BuilderNodeType;
    name: string;
    id: string;
}

type BuilderRelationshipTarget =
    | { relationship: "depends-on"; service: string; target: string }
    | { relationship: "network" | "volume"; service: string; target: string };

interface EditableDependency extends Omit<BuilderRelationshipTarget, "relationship"> {
    condition: DependencyCondition;
}

const singularResourceTypes: Record<ResourceType, BuilderNodeType> = {
    services: "service",
    networks: "network",
    volumes: "volume",
    secrets: "secret",
    configs: "config",
};

const pluralResourceTypes: Record<BuilderNodeType, ResourceType> = {
    service: "services",
    network: "networks",
    volume: "volumes",
    secret: "secrets",
    config: "configs",
};

const CLEAN_LAYOUT_VIEWPORT_PADDING = {
    top: "160px",
    right: "120px",
    bottom: "300px",
    left: "80px",
} as const;

function isResourceType(value: string): value is ResourceType {
    return value in singularResourceTypes;
}

function isBuilderNodeType(value: string): value is BuilderNodeType {
    return value in pluralResourceTypes;
}

const dependencyConditionChoices = DEPENDENCY_CONDITION_VISUALS.map((visual) => ({
    value: visual.condition,
    label: visual.label,
    color: visual.color,
}));

function dependencyConditionForValue(value: string | null): DependencyCondition | null {
    return DEPENDENCY_CONDITION_VISUALS.find((visual) => visual.condition === value)?.condition ?? null;
}

function relationshipForConnection(connection: Connection): BuilderRelationshipTarget | null {
    if (!connection.source || !connection.target) return null;
    const source = parseNodeId(connection.source);
    const target = parseNodeId(connection.target);
    if (source.type === "service" && target.type === "service") {
        return {
            relationship: "depends-on",
            service: target.name,
            target: source.name,
        };
    }
    if (source.type === "network" && target.type === "service") {
        return { relationship: "network", service: target.name, target: source.name };
    }
    if (source.type === "volume" && target.type === "service") {
        return { relationship: "volume", service: target.name, target: source.name };
    }
    return null;
}

function dependencyForEdge(edge: Edge): EditableDependency | null {
    if (edge.type !== "dependsOnEdge" && !edge.id.startsWith("dep-")) return null;
    const source = parseNodeId(edge.source);
    const target = parseNodeId(edge.target);
    if (source.type !== "service" || target.type !== "service") return null;
    const condition =
        dependencyConditionForValue(typeof edge.data?.condition === "string" ? edge.data.condition : null) ??
        DependencyConditions.STARTED;
    return { service: target.name, target: source.name, condition };
}

function relationshipForEdge(edge: Edge): ComposeRelationshipChange | null {
    const [edgeType] = edge.id.split("-");
    const source = parseNodeId(edge.source);
    const target = parseNodeId(edge.target);
    if (edgeType === "dep") {
        return { action: "disconnect", relationship: "depends-on", service: target.name, target: source.name };
    }
    if (edgeType === "net") {
        return { action: "disconnect", relationship: "network", service: target.name, target: source.name };
    }
    if (edgeType === "vol") {
        return { action: "disconnect", relationship: "volume", service: target.name, target: source.name };
    }
    return null;
}

/**
 * Visual Builder component using React Flow for interactive compose creation.
 * Allows drag-and-drop creation and connection of Docker resources.
 * Now includes NodeConfigPanel for full configuration of each node.
 */
export default function VisualBuilder() {
    const { snapshot } = useComposeWorkspace();
    const { ast, state } = snapshot;
    const suggestions = useMemo(() => [...snapshot.suggestions], [snapshot.suggestions]);
    const { commit } = useComposeEditing();
    const { suggestionsEnabled, setSuggestionsEnabled } = useUI();
    const popup = usePopup();
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const autoCleanedGenerationRef = useRef<number | null>(null);
    const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance<Node, Edge> | null>(null);
    const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);

    const addResource = useCallback(
        (type: ResourceType, name: string, position?: Position) => {
            commit({
                type: "add-resource",
                resource: singularResourceTypes[type],
                name,
                ...(position ? { position } : {}),
            });
        },
        [commit],
    );

    const updateResource = useCallback(
        (type: BuilderNodeType, name: string, data: Record<string, unknown>) => {
            commit({ type: "update-resource", resource: type, name, data });
        },
        [commit],
    );

    const handleDeleteResource = useCallback(
        (type: BuilderNodeType, name: string) => {
            commit({ type: "remove-resources", resources: [{ resource: type, name }] });
        },
        [commit],
    );

    // Handle window resize for mobile detection
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            // Auto-close config panel when switching to mobile
            if (mobile && selectedNode) {
                // Keep panel open but it will be full-screen via CSS
            }
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [selectedNode]);

    // Convert compose state to React Flow format
    const { nodes: initialNodes, edges: initialEdges } = useMemo(
        () => stateToFlow(ast, suggestionsEnabled ? suggestions : []),
        [ast, suggestions, suggestionsEnabled],
    );

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const hasStoredResourcePosition = useMemo(
        () =>
            initialNodes.some((node) => {
                const { type, name } = parseNodeId(node.id);
                if (!isBuilderNodeType(type)) return false;
                return positionFromRaw(state[pluralResourceTypes[type]][name]) !== null;
            }),
        [initialNodes, state],
    );

    const routingObstacles = useMemo(() => routingObstaclesForNodes(nodes), [nodes]);
    const networkBundleTargetsBySource = useMemo(() => {
        const targetsBySource = new Map<string, string[]>();
        for (const edge of edges) {
            if (edge.type !== "networkEdge") continue;
            targetsBySource.set(edge.source, [...(targetsBySource.get(edge.source) ?? []), edge.target]);
        }
        for (const targets of targetsBySource.values()) targets.sort((left, right) => left.localeCompare(right));
        return targetsBySource;
    }, [edges]);
    const routedEdges = useMemo(
        () =>
            edges.map((edge) => {
                const networkBundleTargetNodeIds = networkBundleTargetsBySource.get(edge.source);
                return {
                    ...edge,
                    selected:
                        edge.selected ||
                        (selectedNode !== null && (edge.source === selectedNode.id || edge.target === selectedNode.id)),
                    data: {
                        ...edge.data,
                        routing: {
                            obstacles: routingObstacles,
                            sourceNodeId: edge.source,
                            targetNodeId: edge.target,
                            ...(networkBundleTargetNodeIds && networkBundleTargetNodeIds.length > 1
                                ? { networkBundleTargetNodeIds }
                                : {}),
                        },
                    },
                };
            }),
        [edges, networkBundleTargetsBySource, routingObstacles, selectedNode],
    );

    // Sync nodes when state changes externally
    React.useEffect(() => {
        const { nodes: newNodes, edges: newEdges } = stateToFlow(ast, suggestionsEnabled ? suggestions : []);

        setNodes((prevNodes) => mergeFlowElements(prevNodes, newNodes));
        setEdges((prevEdges) => mergeFlowElements(prevEdges, newEdges));
    }, [ast, suggestions, suggestionsEnabled, setNodes, setEdges]);

    const chooseDependencyCondition = useCallback(
        async (
            dependency: Omit<EditableDependency, "condition">,
            initialValue: DependencyCondition,
            action: "connect" | "update",
        ) => {
            const selected = await popup.requestChoice({
                title: "Dependency condition",
                description: `Choose when ${dependency.service} may start after ${dependency.target}.`,
                label: "Condition",
                options: dependencyConditionChoices,
                initialValue,
                confirmLabel: action === "connect" ? "Create dependency" : "Save condition",
            });
            const condition = dependencyConditionForValue(selected);
            if (!condition) return;
            commit({
                type: "change-relationships",
                changes: [{ action, relationship: "depends-on", ...dependency, condition }],
            });
        },
        [commit, popup],
    );

    // Handle new edge connections
    const onConnect = useCallback(
        (connection: Connection) => {
            const relationship = relationshipForConnection(connection);
            if (!relationship) return;
            if (relationship.relationship === "depends-on") {
                void chooseDependencyCondition(relationship, DependencyConditions.STARTED, "connect");
                return;
            }
            commit({
                type: "change-relationships",
                changes: [{ action: "connect", ...relationship }],
            });
        },
        [chooseDependencyCondition, commit],
    );

    const editDependencyEdge = useCallback(
        (edge: Edge) => {
            const dependency = dependencyForEdge(edge);
            if (!dependency) return;
            const { condition, ...target } = dependency;
            void chooseDependencyCondition(target, condition, "update");
        },
        [chooseDependencyCondition],
    );

    const onEdgeContextMenu = useCallback(
        (event: React.MouseEvent, edge: Edge) => {
            if (!dependencyForEdge(edge)) return;
            event.preventDefault();
            editDependencyEdge(edge);
        },
        [editDependencyEdge],
    );

    const onBuilderKeyDown = useCallback(
        (event: React.KeyboardEvent<HTMLDivElement>) => {
            if (event.key !== "Enter" || event.defaultPrevented || !(event.target instanceof Element)) return;
            const edgeElement = event.target.closest(".react-flow__edge.selected[data-id]");
            const edgeId = edgeElement?.getAttribute("data-id");
            if (!edgeId) return;
            const edge = edges.find((candidate) => candidate.id === edgeId);
            if (!edge || !dependencyForEdge(edge)) return;
            event.preventDefault();
            editDependencyEdge(edge);
        },
        [edges, editDependencyEdge],
    );

    // Handle node click - open config panel
    const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
        const { type, name } = parseNodeId(node.id);
        if (!isBuilderNodeType(type)) return;
        setSelectedNode({ type, name, id: node.id });
    }, []);

    // Handle node double-click - also open config panel
    const onNodeDoubleClick = useCallback((_event: React.MouseEvent, node: Node) => {
        const { type, name } = parseNodeId(node.id);
        if (!isBuilderNodeType(type)) return;
        setSelectedNode({ type, name, id: node.id });
    }, []);

    // Handle pane click - close config panel
    const onPaneClick = useCallback(() => {
        setSelectedNode(null);
    }, []);

    // Handle edge deletion
    const onEdgesDelete = useCallback(
        (deletedEdges: Edge[]) => {
            const changes = deletedEdges
                .map(relationshipForEdge)
                .filter((change): change is ComposeRelationshipChange => change !== null);
            if (changes.length > 0) commit({ type: "change-relationships", changes });
        },
        [commit],
    );

    // Confirm node deletion before React Flow removes controlled canvas state
    const onBeforeDelete = useCallback<OnBeforeDelete<Node, Edge>>(
        async ({ nodes: nodesToDelete }) => {
            for (const node of nodesToDelete) {
                const { type, name } = parseNodeId(node.id);
                if (!isBuilderNodeType(type)) continue;

                const confirmed = await popup.requestConfirmation({
                    title: `Delete ${name}?`,
                    description: "This action cannot be undone.",
                    confirmLabel: "Delete",
                    tone: "danger",
                });
                if (!confirmed) return false;
            }

            return true;
        },
        [popup],
    );

    // Apply node deletion after React Flow's pre-delete confirmation succeeds
    const onNodesDelete = useCallback(
        (deletedNodes: Node[]) => {
            const resources = deletedNodes
                .map((node) => parseNodeId(node.id))
                .filter((resource): resource is { type: BuilderNodeType; name: string } =>
                    isBuilderNodeType(resource.type),
                )
                .map(({ type, name }) => ({ resource: type, name }));
            if (resources.length > 0) commit({ type: "remove-resources", resources });

            if (selectedNode && deletedNodes.some((node) => node.id === selectedNode.id)) setSelectedNode(null);
        },
        [commit, selectedNode],
    );

    // Handle node drag stop - persist position
    const onNodeDragStop = useCallback<OnNodeDrag<Node>>(
        (_event, node) => {
            const { type, name } = parseNodeId(node.id);
            if (!isBuilderNodeType(type)) return;
            commit({ type: "position-resource", resource: type, name, position: node.position });
        },
        [commit],
    );

    // Handle drop from toolbar
    const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
    }, []);

    const onDrop = useCallback(
        async (event: DragEvent<HTMLDivElement>) => {
            event.preventDefault();

            const type = event.dataTransfer.getData("application/reactflow");
            if (!isResourceType(type) || !reactFlowInstance) return;

            const position = reactFlowInstance.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            const typeSingular = singularResourceTypes[type];
            const displayType = `${typeSingular.charAt(0).toUpperCase()}${typeSingular.slice(1)}`;
            const name = await popup.requestText({
                title: `Add ${typeSingular}`,
                description: `Choose a name for the new ${typeSingular}.`,
                label: `${displayType} name`,
                confirmLabel: "Add",
            });
            if (!name) return;

            addResource(type, name, position);

            // Automatically open config panel for new node
            const nodeType = singularResourceTypes[type];
            setSelectedNode({ type: nodeType, name, id: `${nodeType}-${name}` });
        },
        [reactFlowInstance, addResource, popup],
    );

    // Handle add from toolbar click
    const handleAdd = useCallback(
        async (type: ResourceType) => {
            const typeSingular = singularResourceTypes[type];
            const displayType = `${typeSingular.charAt(0).toUpperCase()}${typeSingular.slice(1)}`;
            const name = await popup.requestText({
                title: `Add ${typeSingular}`,
                description: `Choose a name for the new ${typeSingular}.`,
                label: `${displayType} name`,
                confirmLabel: "Add",
            });
            if (!name) return;

            addResource(type, name);

            // Automatically open config panel for new node
            const nodeType = singularResourceTypes[type];
            setSelectedNode({ type: nodeType, name, id: `${nodeType}-${name}` });
        },
        [addResource, popup],
    );

    // Handle config panel update
    const handleConfigUpdate = useCallback(
        (data: Record<string, unknown>) => {
            if (!selectedNode) return;
            updateResource(selectedNode.type, selectedNode.name, data);
        },
        [selectedNode, updateResource],
    );

    // Handle delete from config panel
    const handleDelete = useCallback(
        async (type: BuilderNodeType, name: string) => {
            const confirmed = await popup.requestConfirmation({
                title: `Delete ${name}?`,
                description: "This action cannot be undone.",
                confirmLabel: "Delete",
                tone: "danger",
            });
            if (!confirmed) return;

            handleDeleteResource(type, name);
            setSelectedNode(null);
        },
        [handleDeleteResource, popup],
    );

    // Handle rename from config panel
    const handleRename = useCallback(
        (newName: string) => {
            if (!selectedNode) return;
            const { type, name } = selectedNode;
            const outcome = commit({ type: "rename-resource", resource: type, oldName: name, newName });
            if (outcome.status === "applied") {
                setSelectedNode({ type, name: newName, id: `${type}-${newName}` });
            }
        },
        [commit, selectedNode],
    );

    // Export diagram as SVG
    const handleExportSvg = useCallback(() => {
        const svg = document.querySelector<SVGElement>(".react-flow__viewport");
        if (!svg) return;

        const svgClone = svg.cloneNode(true) as SVGElement;
        const blob = new Blob([svgClone.outerHTML], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "docker-compose-builder.svg";
        a.click();
        URL.revokeObjectURL(url);
    }, []);

    const applyCleanLayout = useCallback(
        (nodesToLayout: Node[], edgesToLayout: Edge[]) => {
            if (nodesToLayout.length === 0 || !reactFlowInstance) return false;

            const laidOutNodes = layoutBuilderGraph(nodesToLayout, edgesToLayout);
            const positions: ComposeResourcePosition[] = [];
            for (const node of laidOutNodes) {
                const { type, name } = parseNodeId(node.id);
                if (!isBuilderNodeType(type)) continue;
                positions.push({ resource: type, name, position: node.position });
            }
            if (positions.length === 0) return false;

            const outcome = commit({ type: "position-resources", positions });
            if (outcome.status === "rejected") return false;

            setNodes(laidOutNodes);
            window.requestAnimationFrame(() => {
                void reactFlowInstance.fitView({ padding: CLEAN_LAYOUT_VIEWPORT_PADDING, duration: 300 });
            });
            return true;
        },
        [commit, reactFlowInstance, setNodes],
    );

    const handleCleanLayout = useCallback(() => {
        applyCleanLayout(nodes, edges);
    }, [applyCleanLayout, edges, nodes]);

    useEffect(() => {
        const generation = snapshot.processing.generation;
        if (
            snapshot.source === null ||
            initialNodes.length === 0 ||
            hasStoredResourcePosition ||
            autoCleanedGenerationRef.current === generation
        ) {
            return;
        }

        autoCleanedGenerationRef.current = generation;
        if (!applyCleanLayout(initialNodes, initialEdges)) {
            autoCleanedGenerationRef.current = null;
        }
    }, [
        applyCleanLayout,
        hasStoredResourcePosition,
        initialEdges,
        initialNodes,
        snapshot.processing.generation,
        snapshot.source,
    ]);

    // Mini-map node color
    const nodeColor = useCallback((node: Node) => {
        const colors: Record<string, string> = {
            serviceNode: "#3b82f6",
            networkNode: "#10b981",
            volumeNode: "#f59e0b",
            secretNode: "#8b5cf6",
            configNode: "#06b6d4",
        };
        return (node.type ? colors[node.type] : undefined) ?? "#64748b";
    }, []);

    // Get selected node data
    const getSelectedNodeData = (): Record<string, unknown> => {
        if (!selectedNode) return {};
        const stateKey = pluralResourceTypes[selectedNode.type];
        return state[stateKey][selectedNode.name] ?? {};
    };

    return (
        <div className="visual-builder-with-panel">
            <div
                className="visual-builder"
                ref={reactFlowWrapper}
                onKeyDown={onBuilderKeyDown}
            >
                <ReactFlow
                    nodes={nodes}
                    edges={routedEdges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onNodeClick={onNodeClick}
                    onNodeDoubleClick={onNodeDoubleClick}
                    onEdgeContextMenu={onEdgeContextMenu}
                    onBeforeDelete={onBeforeDelete}
                    onNodesDelete={onNodesDelete}
                    onEdgesDelete={onEdgesDelete}
                    onNodeDragStop={onNodeDragStop}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onPaneClick={onPaneClick}
                    onInit={setReactFlowInstance}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    fitView
                    minZoom={0.1}
                    snapToGrid
                    snapGrid={[15, 15]}
                    deleteKeyCode={["Backspace", "Delete"]}
                    multiSelectionKeyCode={["Control", "Meta"]}
                    connectionLineStyle={{ stroke: "#3b82f6", strokeWidth: 2 }}
                    defaultEdgeOptions={{
                        type: "smoothstep",
                        animated: true,
                    }}
                    proOptions={{ hideAttribution: true }}
                >
                    <Background
                        color="#1e293b"
                        gap={20}
                        size={1}
                        variant={BackgroundVariant.Dots}
                    />

                    <Controls
                        className="builder-controls"
                        showZoom={true}
                        showFitView={true}
                        showInteractive={false}
                    />

                    <MiniMap
                        className="builder-minimap"
                        nodeColor={nodeColor}
                        maskColor="rgba(0, 0, 0, 0.7)"
                        pannable
                        zoomable
                    />

                    {/* Top-left toolbar */}
                    <Panel position="top-left">
                        <BuilderToolbar onAdd={handleAdd} />
                    </Panel>

                    {/* Top-right actions */}
                    <Panel position="top-right">
                        <div className="builder-actions">
                            <button
                                type="button"
                                onClick={handleCleanLayout}
                                className="builder-action-btn"
                                title="Clean layout"
                                aria-label="Clean layout"
                                disabled={nodes.length === 0 || !reactFlowInstance}
                            >
                                <Brush size={16} />
                            </button>
                            <button
                                onClick={() => setSuggestionsEnabled(!suggestionsEnabled)}
                                className={`builder-action-btn ${suggestions.length > 0 ? "has-suggestions" : ""}`}
                                title={
                                    suggestionsEnabled
                                        ? `${suggestions.length} suggestions (click to hide)`
                                        : `${suggestions.length} suggestions (click to show)`
                                }
                            >
                                {suggestions.length > 0 ? <Lightbulb size={16} /> : <LightbulbOff size={16} />}
                            </button>
                            <button
                                onClick={handleExportSvg}
                                className="builder-action-btn"
                                title="Export Diagram"
                            >
                                <Download size={16} />
                            </button>
                        </div>
                    </Panel>

                    {/* Bottom legend */}
                    <Panel position="bottom-left">
                        <section
                            className="builder-legend connection-legend"
                            aria-labelledby="connection-types-title"
                        >
                            <h2
                                id="connection-types-title"
                                className="legend-title"
                            >
                                Connection Types
                            </h2>
                            <section
                                className="legend-group"
                                aria-labelledby="depends-on-title"
                            >
                                <h3
                                    id="depends-on-title"
                                    className="legend-group-title"
                                >
                                    Depends On
                                </h3>
                                <ul className="legend-list">
                                    {DEPENDENCY_CONDITION_VISUALS.map((visual) => (
                                        <li
                                            key={visual.condition}
                                            className="legend-item dependency-condition-item"
                                        >
                                            <span
                                                className="legend-line dependency"
                                                style={{
                                                    backgroundColor: visual.color,
                                                    color: visual.color,
                                                }}
                                                aria-hidden="true"
                                            />
                                            <span>{visual.label}</span>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                            <div
                                className="legend-divider"
                                aria-hidden="true"
                            />
                            <ul
                                className="legend-list legend-primary-list"
                                aria-label="Other connection types"
                            >
                                <li className="legend-item">
                                    <span
                                        className="legend-line network"
                                        aria-hidden="true"
                                    />
                                    <span>Network</span>
                                </li>
                                <li className="legend-item">
                                    <span
                                        className="legend-line volume"
                                        aria-hidden="true"
                                    />
                                    <span>Volume</span>
                                </li>
                            </ul>
                        </section>
                    </Panel>

                    {/* Help hint */}
                    <Panel position="bottom-right">
                        <div
                            className="builder-legend"
                            style={{ fontSize: "12px" }}
                        >
                            <p className="text-text-secondary">💡 Click a node to configure</p>
                            <p className="text-text-secondary">🔗 Drag between nodes to connect</p>
                        </div>
                    </Panel>
                </ReactFlow>
            </div>

            {/* Config Panel - slides in from right when a node is selected */}
            {selectedNode && (
                <NodeConfigPanel
                    key={`${selectedNode.type}-${selectedNode.name}`}
                    nodeType={selectedNode.type}
                    nodeName={selectedNode.name}
                    nodeData={getSelectedNodeData()}
                    allNetworks={state.networks || {}}
                    allServices={state.services || {}}
                    allVolumes={state.volumes || {}}
                    allSecrets={state.secrets || {}}
                    allConfigs={state.configs || {}}
                    suggestions={suggestions.filter((s) => s.name === selectedNode.name)}
                    suggestionsEnabled={suggestionsEnabled}
                    onUpdate={handleConfigUpdate}
                    onClose={() => setSelectedNode(null)}
                    onDelete={handleDelete}
                    onRename={handleRename}
                />
            )}
        </div>
    );
}
