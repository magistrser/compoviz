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
import { edgeTypes } from "./edges";
import BuilderToolbar from "./BuilderToolbar";
import NodeConfigPanel from "./NodeConfigPanel";
import { stateToFlow, parseNodeId } from "../utils/flowConverter";
import { mergeFlowElements } from "../utils/objectUtils";
import { Download, Lightbulb, LightbulbOff } from "lucide-react";
import { useComposeWorkspace } from "../features/compose-workspace";
import { useComposeEditing } from "../features/compose-editing";
import type { ComposeRelationshipChange } from "../features/compose-editing";
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

function isResourceType(value: string): value is ResourceType {
    return value in singularResourceTypes;
}

function isBuilderNodeType(value: string): value is BuilderNodeType {
    return value in pluralResourceTypes;
}

function relationshipForConnection(connection: Connection): ComposeRelationshipChange | null {
    if (!connection.source || !connection.target) return null;
    const source = parseNodeId(connection.source);
    const target = parseNodeId(connection.target);
    if (source.type === "service" && target.type === "service") {
        return { action: "connect", relationship: "depends-on", service: target.name, target: source.name };
    }
    if (source.type === "service" && target.type === "network") {
        return { action: "connect", relationship: "network", service: source.name, target: target.name };
    }
    if (source.type === "service" && target.type === "volume") {
        return { action: "connect", relationship: "volume", service: source.name, target: target.name };
    }
    return null;
}

function relationshipForEdge(edge: Edge): ComposeRelationshipChange | null {
    const [edgeType] = edge.id.split("-");
    const source = parseNodeId(edge.source);
    const target = parseNodeId(edge.target);
    if (edgeType === "dep") {
        return { action: "disconnect", relationship: "depends-on", service: target.name, target: source.name };
    }
    if (edgeType === "net") {
        return { action: "disconnect", relationship: "network", service: source.name, target: target.name };
    }
    if (edgeType === "vol") {
        return { action: "disconnect", relationship: "volume", service: source.name, target: target.name };
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
    const { state } = snapshot;
    const suggestions = useMemo(() => [...snapshot.suggestions], [snapshot.suggestions]);
    const { commit } = useComposeEditing();
    const { suggestionsEnabled, setSuggestionsEnabled } = useUI();
    const popup = usePopup();
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
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
        () => stateToFlow(state, suggestionsEnabled ? suggestions : []),
        [state, suggestions, suggestionsEnabled],
    );

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    // Sync nodes when state changes externally
    React.useEffect(() => {
        const { nodes: newNodes, edges: newEdges } = stateToFlow(state, suggestionsEnabled ? suggestions : []);

        setNodes((prevNodes) => mergeFlowElements(prevNodes, newNodes));
        setEdges((prevEdges) => mergeFlowElements(prevEdges, newEdges));
    }, [state, suggestions, suggestionsEnabled, setNodes, setEdges]);

    // Handle new edge connections
    const onConnect = useCallback(
        (connection: Connection) => {
            const relationship = relationshipForConnection(connection);
            if (relationship) commit({ type: "change-relationships", changes: [relationship] });
        },
        [commit],
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
            >
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onNodeClick={onNodeClick}
                    onNodeDoubleClick={onNodeDoubleClick}
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
                        <div className="builder-legend">
                            <div className="legend-title">Connection Types</div>
                            <div className="legend-item">
                                <div className="legend-line depends-on"></div>
                                <span>Depends On</span>
                            </div>
                            <div className="legend-item">
                                <div className="legend-line network"></div>
                                <span>Network</span>
                            </div>
                            <div className="legend-item">
                                <div className="legend-line volume"></div>
                                <span>Volume</span>
                            </div>
                        </div>
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
