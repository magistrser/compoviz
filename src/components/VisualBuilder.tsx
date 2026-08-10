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
    type OnNodeDrag,
    type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { nodeTypes } from "./nodes";
import { edgeTypes } from "./edges";
import BuilderToolbar from "./BuilderToolbar";
import NodeConfigPanel from "./NodeConfigPanel";
import { stateToFlow, handleEdgeConnect, handleEdgeDelete, parseNodeId } from "../utils/flowConverter";
import { mergeFlowElements } from "../utils/objectUtils";
import { Download, Lightbulb, LightbulbOff } from "lucide-react";
import { useCompose } from "../hooks/useCompose";
import { useUI } from "../context/UIContext";
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

/**
 * Visual Builder component using React Flow for interactive compose creation.
 * Allows drag-and-drop creation and connection of Docker resources.
 * Now includes NodeConfigPanel for full configuration of each node.
 */
export default function VisualBuilder() {
    // Get compose state from context
    const { state, dispatch, suggestions = [] } = useCompose();
    const { suggestionsEnabled, setSuggestionsEnabled } = useUI();
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance<Node, Edge> | null>(null);
    const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);

    const addResource = useCallback(
        (type: ResourceType, name: string, position?: Position) => {
            const positionData = position ? { position } : {};
            switch (type) {
                case "services":
                    dispatch({ type: "ADD_SERVICE", name, ...positionData });
                    break;
                case "networks":
                    dispatch({ type: "ADD_NETWORK", name, ...positionData });
                    break;
                case "volumes":
                    dispatch({ type: "ADD_VOLUME", name, ...positionData });
                    break;
                case "secrets":
                    dispatch({ type: "ADD_SECRET", name, ...positionData });
                    break;
                case "configs":
                    dispatch({ type: "ADD_CONFIG", name, ...positionData });
                    break;
            }
        },
        [dispatch],
    );

    const updateResource = useCallback(
        (type: BuilderNodeType, name: string, data: Record<string, unknown>) => {
            switch (type) {
                case "service":
                    dispatch({ type: "UPDATE_SERVICE", name, data });
                    break;
                case "network":
                    dispatch({ type: "UPDATE_NETWORK", name, data });
                    break;
                case "volume":
                    dispatch({ type: "UPDATE_VOLUME", name, data });
                    break;
                case "secret":
                    dispatch({ type: "UPDATE_SECRET", name, data });
                    break;
                case "config":
                    dispatch({ type: "UPDATE_CONFIG", name, data });
                    break;
            }
        },
        [dispatch],
    );

    const handleDeleteResource = useCallback(
        (type: BuilderNodeType, name: string) => {
            switch (type) {
                case "service":
                    dispatch({ type: "DELETE_SERVICE", name });
                    break;
                case "network":
                    dispatch({ type: "DELETE_NETWORK", name });
                    break;
                case "volume":
                    dispatch({ type: "DELETE_VOLUME", name });
                    break;
                case "secret":
                    dispatch({ type: "DELETE_SECRET", name });
                    break;
                case "config":
                    dispatch({ type: "DELETE_CONFIG", name });
                    break;
            }
        },
        [dispatch],
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
            handleEdgeConnect(connection, state, dispatch);
        },
        [state, dispatch],
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
            for (const edge of deletedEdges) {
                handleEdgeDelete(edge, state, dispatch);
            }
        },
        [state, dispatch],
    );

    // Handle node deletion
    const onNodesDelete = useCallback(
        (deletedNodes: Node[]) => {
            for (const node of deletedNodes) {
                const { type, name } = parseNodeId(node.id);
                if (isBuilderNodeType(type)) handleDeleteResource(type, name);
            }
            setSelectedNode(null);
        },
        [handleDeleteResource],
    );

    // Handle node drag stop - persist position
    const onNodeDragStop = useCallback<OnNodeDrag<Node>>(
        (_event, node) => {
            const { type, name } = parseNodeId(node.id);
            if (!isBuilderNodeType(type)) return;
            updateResource(type, name, { _position: node.position });
        },
        [updateResource],
    );

    // Handle drop from toolbar
    const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
    }, []);

    const onDrop = useCallback(
        (event: DragEvent<HTMLDivElement>) => {
            event.preventDefault();

            const type = event.dataTransfer.getData("application/reactflow");
            if (!isResourceType(type) || !reactFlowInstance) return;

            const position = reactFlowInstance.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            // Prompt for name and add
            const typeSingular = singularResourceTypes[type];
            const name = prompt(`Enter ${typeSingular} name:`);
            if (name?.trim()) {
                addResource(type, name.trim(), position);

                // Automatically open config panel for new node
                const nodeType = singularResourceTypes[type];
                setSelectedNode({ type: nodeType, name: name.trim(), id: `${nodeType}-${name.trim()}` });
            }
        },
        [reactFlowInstance, addResource],
    );

    // Handle add from toolbar click
    const handleAdd = useCallback(
        (type: ResourceType) => {
            const typeSingular = singularResourceTypes[type];
            const name = prompt(`Enter ${typeSingular} name:`);
            if (name?.trim()) {
                addResource(type, name.trim());

                // Automatically open config panel for new node
                const nodeType = singularResourceTypes[type];
                setSelectedNode({ type: nodeType, name: name.trim(), id: `${nodeType}-${name.trim()}` });
            }
        },
        [addResource],
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
        (type: BuilderNodeType, name: string) => {
            if (confirm(`Delete ${name}?`)) {
                handleDeleteResource(type, name);
                setSelectedNode(null);
            }
        },
        [handleDeleteResource],
    );

    // Handle rename from config panel
    const handleRename = useCallback(
        (newName: string) => {
            if (!selectedNode) return;
            const { type, name } = selectedNode;
            // For now, we need to transfer data manually (since reducer doesn't have RENAME for all types)
            // Get current data
            const stateKey = pluralResourceTypes[type];
            const currentData = state[stateKey]?.[name];
            if (currentData) {
                // Delete old
                addResource(stateKey, newName);
                updateResource(type, newName, currentData);
                handleDeleteResource(type, name);

                setSelectedNode({ type, name: newName, id: `${type}-${newName}` });
            }
        },
        [selectedNode, state, addResource, updateResource, handleDeleteResource],
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
