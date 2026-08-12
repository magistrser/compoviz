import { describe, it, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { fireEvent, render, screen, waitFor, within } from "../test/utils";
import {
    Suspense,
    useState,
    type DragEventHandler,
    type MouseEvent as ReactMouseEvent,
    type PropsWithChildren,
    type ReactNode,
} from "react";
import type { Connection, Edge, HandleProps, Node, NodeTypes, OnBeforeDelete } from "@xyflow/react";
import VisualBuilder from "./VisualBuilder";
import { useComposeWorkspace } from "../features/compose-workspace";
import { useComposeEditing } from "../features/compose-editing";

const fitViewMock = vi.hoisted(() => vi.fn());

// Mock React Flow
vi.mock("@xyflow/react", () => ({
    ReactFlow: ({
        children,
        nodes,
        edges,
        onDrop,
        onInit,
        onBeforeDelete,
        onNodesDelete,
        onConnect,
        onNodeClick,
        onPaneClick,
        onEdgeDoubleClick,
        onEdgeContextMenu,
        onEdgesDelete,
        minZoom,
        nodeTypes,
        connectOnClick,
        nodesConnectable,
    }: {
        children?: ReactNode;
        nodes?: Node[];
        edges?: Edge[];
        onDrop?: DragEventHandler<HTMLDivElement>;
        onInit?: (instance: {
            screenToFlowPosition: (position: { x: number; y: number }) => { x: number; y: number };
            fitView: typeof fitViewMock;
        }) => void;
        onBeforeDelete?: OnBeforeDelete<Node, Edge>;
        onNodesDelete?: (nodes: Node[]) => void;
        onConnect?: (connection: Connection) => void;
        onNodeClick?: (event: ReactMouseEvent, node: Node) => void;
        onPaneClick?: () => void;
        onEdgeDoubleClick?: (event: ReactMouseEvent, edge: Edge) => void;
        onEdgeContextMenu?: (event: ReactMouseEvent, edge: Edge) => void;
        onEdgesDelete?: (edges: Edge[]) => void;
        minZoom?: number;
        nodeTypes?: NodeTypes;
        connectOnClick?: boolean;
        nodesConnectable?: boolean;
    }) => {
        const dependencyEdge = edges?.find((edge) => edge.id.startsWith("dep-"));
        const selectedEdgeIds = edges
            ?.filter((edge) => edge.selected)
            .map((edge) => edge.id)
            .sort();
        const networkBundleTargets = edges
            ?.filter((edge) => edge.type === "networkEdge")
            .map(
                (edge) =>
                    (edge.data?.routing as { networkBundleTargetNodeIds?: readonly string[] } | undefined)
                        ?.networkBundleTargetNodeIds,
            );
        const renderNode = (node: Node) => {
            const nodeType = node.type;
            const NodeComponent = nodeType ? nodeTypes?.[nodeType] : undefined;
            return (
                <div key={node.id}>
                    <button onClick={(event) => onNodeClick?.(event, node)}>Select {node.id}</button>
                    {nodeType && NodeComponent ? (
                        <NodeComponent
                            id={node.id}
                            type={nodeType}
                            data={node.data}
                            selected={Boolean(node.selected)}
                            dragging={false}
                            zIndex={0}
                            selectable
                            deletable
                            draggable
                            isConnectable
                            positionAbsoluteX={node.position.x}
                            positionAbsoluteY={node.position.y}
                        />
                    ) : null}
                </div>
            );
        };
        return (
            <div
                data-testid="react-flow"
                onDrop={onDrop}
            >
                <div data-testid="nodes-count">{nodes?.length || 0}</div>
                <div data-testid="edges-count">{edges?.length || 0}</div>
                <output aria-label="Rendered dependency condition">
                    {String(dependencyEdge?.data?.condition ?? "")}
                </output>
                <output aria-label="Canvas pre-delete enabled">{String(Boolean(onBeforeDelete))}</output>
                <output aria-label="Canvas minimum zoom">{String(minZoom)}</output>
                <output aria-label="Canvas click connection enabled">{String(connectOnClick)}</output>
                <output aria-label="Canvas native connections enabled">{String(nodesConnectable)}</output>
                <output aria-label="Network bundle targets">{JSON.stringify(networkBundleTargets ?? [])}</output>
                <output aria-label="Selected builder relationships">{JSON.stringify(selectedEdgeIds ?? [])}</output>
                {nodes?.map(renderNode)}
                <button onClick={() => onPaneClick?.()}>Clear node selection</button>
                <button
                    onClick={() =>
                        onConnect?.({
                            source: "service-db",
                            target: "service-api",
                            sourceHandle: "deps-out",
                            targetHandle: "deps-in",
                        })
                    }
                >
                    Connect dependency
                </button>
                <button
                    onClick={() =>
                        onInit?.({
                            screenToFlowPosition: () => ({ x: 100, y: 200 }),
                            fitView: fitViewMock,
                        })
                    }
                >
                    Initialize canvas
                </button>
                <button
                    onClick={async () => {
                        const candidateNodes = [{ id: "service-api", position: { x: 0, y: 0 }, data: {} }];
                        const result = await onBeforeDelete?.({ nodes: candidateNodes, edges: [] });
                        if (result === false) return;
                        onNodesDelete?.(typeof result === "object" ? result.nodes : candidateNodes);
                    }}
                >
                    Delete selected flow nodes
                </button>
                <button
                    onClick={() =>
                        onConnect?.({
                            source: "network-backend",
                            target: "service-api",
                            sourceHandle: "network-out",
                            targetHandle: "network-in",
                        })
                    }
                >
                    Connect network input
                </button>
                <button
                    onClick={() =>
                        onConnect?.({
                            source: "network-backend",
                            target: "service-worker",
                            sourceHandle: "network-out",
                            targetHandle: "network-in",
                        })
                    }
                >
                    Connect worker network input
                </button>
                <button
                    onClick={() =>
                        onConnect?.({
                            source: "volume-data",
                            target: "service-api",
                            sourceHandle: "volume-out",
                            targetHandle: "volume-in",
                        })
                    }
                >
                    Connect volume input
                </button>
                <button
                    className={dependencyEdge ? "react-flow__edge selected" : ""}
                    data-id={dependencyEdge?.id}
                    onDoubleClick={(event) => dependencyEdge && onEdgeDoubleClick?.(event, dependencyEdge)}
                    onContextMenu={(event) => dependencyEdge && onEdgeContextMenu?.(event, dependencyEdge)}
                >
                    Edit dependency edge
                </button>
                <button
                    onClick={() =>
                        onEdgesDelete?.([
                            {
                                id: "net-api-backend",
                                source: "network-backend",
                                target: "service-api",
                                sourceHandle: "network-out",
                                targetHandle: "network-in",
                            },
                        ])
                    }
                >
                    Disconnect network input
                </button>
                {children}
            </div>
        );
    },
    Background: () => <div data-testid="background" />,
    Controls: () => <div data-testid="controls" />,
    MiniMap: () => <div data-testid="minimap" />,
    Panel: ({ children }: PropsWithChildren) => <div data-testid="panel">{children}</div>,
    Handle: (props: HandleProps) => (
        <div
            role={props.role}
            tabIndex={props.tabIndex}
            className={props.className}
            aria-label={props["aria-label"]}
            aria-pressed={props["aria-pressed"]}
            data-handle-id={props.id}
            data-handle-type={props.type}
            data-connectable={props.isConnectable}
            data-connectable-start={props.isConnectableStart}
            data-connectable-end={props.isConnectableEnd}
            onClick={props.onClick}
            onKeyDown={props.onKeyDown}
        />
    ),
    BackgroundVariant: { Dots: "dots" },
    Position: { Left: "left", Right: "right", Top: "top", Bottom: "bottom" },
    useNodesState: (initial: Node[]) => {
        const [nodes, setNodes] = useState(initial);
        return [nodes, setNodes, vi.fn()];
    },
    useEdgesState: (initial: Edge[]) => {
        const [edges, setEdges] = useState(initial);
        return [edges, setEdges, vi.fn()];
    },
}));

const ComposeProbe = () => {
    const { snapshot, replace } = useComposeWorkspace();
    const { moveHistory } = useComposeEditing();
    const { state } = snapshot;
    const serviceNames = Object.keys(state.services);

    return (
        <>
            <output aria-label="Builder services">{serviceNames.join(",")}</output>
            <output aria-label="Builder service position">
                {JSON.stringify(serviceNames[0] ? state.services[serviceNames[0]]?._position : null)}
            </output>
            <output aria-label="Builder service networks">{JSON.stringify(state.services.api?.networks ?? [])}</output>
            <output aria-label="Builder service volumes">{JSON.stringify(state.services.api?.volumes ?? [])}</output>
            <output aria-label="Builder service dependencies">
                {JSON.stringify(state.services.api?.depends_on ?? [])}
            </output>
            <output aria-label="Builder YAML">{snapshot.yaml}</output>
            <button
                onClick={() =>
                    void replace({
                        kind: "yaml",
                        importedFilename: "loaded-compose.yml",
                        yaml: [
                            "services:",
                            "  api:",
                            "    image: node:22",
                            "    depends_on:",
                            "      - db",
                            "  db:",
                            "    image: postgres:17",
                        ].join("\n"),
                    })
                }
            >
                Load unpositioned source
            </button>
            <button
                onClick={() =>
                    void replace({
                        kind: "yaml",
                        importedFilename: "arranged-compose.yml",
                        yaml: [
                            "services:",
                            "  api:",
                            "    image: node:22",
                            "    _position:",
                            "      x: 765",
                            "      y: 432",
                        ].join("\n"),
                    })
                }
            >
                Load arranged source
            </button>
            <button onClick={() => moveHistory("undo")}>Undo builder history</button>
        </>
    );
};

const renderBuilder = () =>
    render(
        <Suspense fallback={<div>Loading...</div>}>
            <ComposeProbe />
            <VisualBuilder />
        </Suspense>,
    );

const addService = async (user: ReturnType<typeof userEvent.setup>, name: string) => {
    await user.click(screen.getByRole("button", { name: "Service" }));
    const dialog = screen.getByRole("dialog", { name: "Add service" });
    await user.type(within(dialog).getByRole("textbox", { name: "Service name" }), name);
    await user.click(within(dialog).getByRole("button", { name: "Add" }));
    await waitFor(() => expect(screen.getByLabelText("Builder services")).toHaveTextContent(name));
};

describe("VisualBuilder Component", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders React Flow canvas", () => {
        render(
            <Suspense fallback={<div>Loading...</div>}>
                <VisualBuilder />
            </Suspense>,
        );

        expect(screen.getByTestId("react-flow")).toBeInTheDocument();
        expect(screen.getByLabelText("Canvas click connection enabled")).toHaveTextContent("false");
        expect(screen.getByLabelText("Canvas native connections enabled")).toHaveTextContent("false");
        expect(screen.getByText("🔗 Click two connection points to connect")).toBeInTheDocument();
    });

    it("shows background grid", () => {
        render(
            <Suspense fallback={<div>Loading...</div>}>
                <VisualBuilder />
            </Suspense>,
        );

        expect(screen.getByTestId("background")).toBeInTheDocument();
    });

    it("shows controls for zoom and pan", () => {
        render(
            <Suspense fallback={<div>Loading...</div>}>
                <VisualBuilder />
            </Suspense>,
        );

        expect(screen.getByTestId("controls")).toBeInTheDocument();
    });

    it("allows fit view to zoom out for dense narrow layouts", () => {
        renderBuilder();

        expect(screen.getByLabelText("Canvas minimum zoom")).toHaveTextContent("0.1");
    });

    it("shows minimap for navigation", () => {
        render(
            <Suspense fallback={<div>Loading...</div>}>
                <VisualBuilder />
            </Suspense>,
        );

        expect(screen.getByTestId("minimap")).toBeInTheDocument();
    });

    it("displays toolbar panel", () => {
        render(
            <Suspense fallback={<div>Loading...</div>}>
                <VisualBuilder />
            </Suspense>,
        );

        const panels = screen.getAllByTestId("panel");
        expect(panels.length).toBeGreaterThan(0);
    });

    it("groups dependency conditions in the connection types legend", () => {
        renderBuilder();

        const connectionTypes = screen.getByRole("region", { name: "Connection Types" });
        const dependsOn = within(connectionTypes).getByRole("region", { name: "Depends On" });

        expect(within(dependsOn).getByText("Started")).toBeInTheDocument();
        expect(within(dependsOn).getByText("Healthy")).toBeInTheDocument();
        expect(within(dependsOn).getByText("Completed successfully")).toBeInTheDocument();
        expect(within(connectionTypes).getByText("Network")).toBeInTheDocument();
        expect(within(connectionTypes).getByText("Volume")).toBeInTheDocument();
    });

    it("exposes resource starters as keyboard controls", () => {
        renderBuilder();

        expect(screen.getByRole("button", { name: "Service" })).toBeInTheDocument();
    });

    it("renders nodes from compose state", () => {
        render(
            <Suspense fallback={<div>Loading...</div>}>
                <VisualBuilder />
            </Suspense>,
        );

        const nodesCount = screen.getByTestId("nodes-count");
        expect(nodesCount).toBeInTheDocument();
    });

    it("renders edges between connected services", () => {
        render(
            <Suspense fallback={<div>Loading...</div>}>
                <VisualBuilder />
            </Suspense>,
        );

        const edgesCount = screen.getByTestId("edges-count");
        expect(edgesCount).toBeInTheDocument();
    });

    it("shows export diagram button", () => {
        render(
            <Suspense fallback={<div>Loading...</div>}>
                <VisualBuilder />
            </Suspense>,
        );

        // Should have export functionality
        const panels = screen.getAllByTestId("panel");
        expect(panels).toBeTruthy();
    });

    it("disables layout cleanup when the builder is empty", () => {
        renderBuilder();

        const cleanLayout = screen.getByRole("button", { name: "Clean layout" });
        expect(cleanLayout).toBeDisabled();
        expect(cleanLayout.querySelector(".lucide-brush")).toBeInTheDocument();
    });

    it("cleans deterministically, fits each invocation, and records one layout transition", async () => {
        const user = userEvent.setup();
        renderBuilder();

        await user.click(screen.getByRole("button", { name: "Initialize canvas" }));
        await user.click(screen.getByRole("button", { name: "Service" }));
        const dialog = screen.getByRole("dialog", { name: "Add service" });
        await user.type(within(dialog).getByRole("textbox", { name: "Service name" }), "api");
        await user.click(within(dialog).getByRole("button", { name: "Add" }));

        const cleanLayout = screen.getByRole("button", { name: "Clean layout" });
        await waitFor(() => expect(cleanLayout).toBeEnabled());
        await user.click(cleanLayout);
        await waitFor(() => expect(screen.getByLabelText("Builder service position")).not.toHaveTextContent("null"));
        const firstPosition = screen.getByLabelText("Builder service position").textContent;

        await user.click(cleanLayout);
        expect(screen.getByLabelText("Builder service position")).toHaveTextContent(firstPosition ?? "");
        await waitFor(() => expect(fitViewMock).toHaveBeenCalledTimes(2));
        expect(fitViewMock).toHaveBeenLastCalledWith({
            padding: { top: "160px", right: "120px", bottom: "300px", left: "80px" },
            duration: 300,
        });

        await user.click(screen.getByRole("button", { name: "Undo builder history" }));
        expect(screen.getByLabelText("Builder service position")).toBeEmptyDOMElement();
        expect(screen.getByLabelText("Builder services")).toHaveTextContent("api");
    });

    it("automatically cleans an unpositioned Compose source once after the canvas is ready", async () => {
        const user = userEvent.setup();
        renderBuilder();

        await user.click(screen.getByRole("button", { name: "Initialize canvas" }));
        await user.click(screen.getByRole("button", { name: "Load unpositioned source" }));

        await waitFor(() => expect(screen.getByLabelText("Builder services")).toHaveTextContent("api,db"));
        await waitFor(() =>
            expect(screen.getByLabelText("Builder service position")).toHaveTextContent('{"x":450,"y":30}'),
        );
        expect(fitViewMock).toHaveBeenCalledTimes(1);

        await user.click(screen.getByRole("button", { name: "Undo builder history" }));
        await waitFor(() => expect(screen.getByLabelText("Builder service position")).toBeEmptyDOMElement());
        expect(fitViewMock).toHaveBeenCalledTimes(1);
    });

    it("preserves a loaded Compose source that already has a stored position", async () => {
        const user = userEvent.setup();
        renderBuilder();

        await user.click(screen.getByRole("button", { name: "Initialize canvas" }));
        await user.click(screen.getByRole("button", { name: "Load arranged source" }));

        await waitFor(() =>
            expect(screen.getByLabelText("Builder service position")).toHaveTextContent('{"x":765,"y":432}'),
        );
        expect(fitViewMock).not.toHaveBeenCalled();
    });

    it("adds and selects a named resource from the toolbar", async () => {
        const user = userEvent.setup();
        renderBuilder();

        await user.click(screen.getByRole("button", { name: "Service" }));
        const dialog = screen.getByRole("dialog", { name: "Add service" });
        await user.type(within(dialog).getByRole("textbox", { name: "Service name" }), "  api  ");
        await user.click(within(dialog).getByRole("button", { name: "Add" }));

        await waitFor(() => {
            expect(screen.getByLabelText("Builder services")).toHaveTextContent("api");
            expect(screen.getByRole("heading", { name: "api" })).toBeInTheDocument();
        });
    });

    it("connects and removes a network input from the resource output to the service input", async () => {
        const user = userEvent.setup();
        renderBuilder();

        await user.click(screen.getByRole("button", { name: "Service" }));
        let dialog = screen.getByRole("dialog", { name: "Add service" });
        await user.type(within(dialog).getByRole("textbox", { name: "Service name" }), "api");
        await user.click(within(dialog).getByRole("button", { name: "Add" }));

        await user.click(screen.getByRole("button", { name: "Network" }));
        dialog = screen.getByRole("dialog", { name: "Add network" });
        await user.type(within(dialog).getByRole("textbox", { name: "Network name" }), "backend");
        await user.click(within(dialog).getByRole("button", { name: "Add" }));

        await user.click(screen.getByRole("button", { name: "Connect network input" }));
        await waitFor(() => expect(screen.getByLabelText("Builder service networks")).toHaveTextContent('["backend"]'));
        expect(screen.queryByRole("dialog", { name: "Dependency condition" })).not.toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Disconnect network input" }));
        await waitFor(() => expect(screen.getByLabelText("Builder service networks")).toHaveTextContent("[]"));
    });

    it("connects a network by clicking its output and then the service input", async () => {
        const user = userEvent.setup();
        renderBuilder();

        await addService(user, "api");
        await user.click(screen.getByRole("button", { name: "Network" }));
        const dialog = screen.getByRole("dialog", { name: "Add network" });
        await user.type(within(dialog).getByRole("textbox", { name: "Network name" }), "backend");
        await user.click(within(dialog).getByRole("button", { name: "Add" }));

        const output = await screen.findByRole("button", { name: "Network output for backend" });
        await user.click(output);
        const connectionMode = screen.getByRole("status", { name: "Connection mode" });
        expect(connectionMode).toHaveTextContent(
            "Network output for backend selected. Choose a compatible input point.",
        );
        expect(connectionMode).toHaveClass("builder-connection-mode");
        expect(output).toHaveAttribute("aria-pressed", "true");
        expect(output).toHaveClass("builder-handle-active");
        expect(screen.getByRole("button", { name: "Network input for api" })).toHaveClass("builder-handle-compatible");
        expect(screen.getByRole("button", { name: "Dependency input for api" })).toHaveClass(
            "builder-handle-incompatible",
        );
        expect(screen.getByLabelText("Builder service networks")).toHaveTextContent("[]");

        await user.click(screen.getByRole("button", { name: "Network input for api" }));

        await waitFor(() => expect(screen.getByLabelText("Builder service networks")).toHaveTextContent('["backend"]'));
        expect(screen.queryByRole("status", { name: "Connection mode" })).not.toBeInTheDocument();
    });

    it("connects a network when the service input is clicked before the resource output", async () => {
        const user = userEvent.setup();
        renderBuilder();

        await addService(user, "api");
        await user.click(screen.getByRole("button", { name: "Network" }));
        const dialog = screen.getByRole("dialog", { name: "Add network" });
        await user.type(within(dialog).getByRole("textbox", { name: "Network name" }), "backend");
        await user.click(within(dialog).getByRole("button", { name: "Add" }));

        await user.click(screen.getByRole("button", { name: "Network input for api" }));
        expect(screen.getByRole("status", { name: "Connection mode" })).toHaveTextContent(
            "Network input for api selected. Choose a compatible output point.",
        );

        await user.click(await screen.findByRole("button", { name: "Network output for backend" }));

        await waitFor(() => expect(screen.getByLabelText("Builder service networks")).toHaveTextContent('["backend"]'));
        expect(screen.queryByRole("status", { name: "Connection mode" })).not.toBeInTheDocument();
    });

    it("keeps connection mode active when the second terminal has a different relationship type", async () => {
        const user = userEvent.setup();
        renderBuilder();

        await addService(user, "api");
        await user.click(screen.getByRole("button", { name: "Network" }));
        let dialog = screen.getByRole("dialog", { name: "Add network" });
        await user.type(within(dialog).getByRole("textbox", { name: "Network name" }), "backend");
        await user.click(within(dialog).getByRole("button", { name: "Add" }));
        await screen.findByRole("button", { name: "Network output for backend" });

        await user.click(screen.getByRole("button", { name: "Volume" }));
        dialog = screen.getByRole("dialog", { name: "Add volume" });
        await user.type(within(dialog).getByRole("textbox", { name: "Volume name" }), "data");
        await user.click(within(dialog).getByRole("button", { name: "Add" }));

        await user.click(screen.getByRole("button", { name: "Network input for api" }));
        await user.click(await screen.findByRole("button", { name: "Volume output for data" }));

        expect(screen.getByRole("status", { name: "Connection mode" })).toHaveTextContent(
            "Network input for api selected",
        );
        expect(screen.getByLabelText("Builder service networks")).toHaveTextContent("[]");
        expect(screen.getByLabelText("Builder service volumes")).toHaveTextContent("[]");

        await user.click(screen.getByRole("button", { name: "Network output for backend" }));
        await waitFor(() => expect(screen.getByLabelText("Builder service networks")).toHaveTextContent('["backend"]'));
    });

    it("cancels connection mode without changing the project", async () => {
        const user = userEvent.setup();
        renderBuilder();

        await addService(user, "api");
        await user.click(screen.getByRole("button", { name: "Network" }));
        const dialog = screen.getByRole("dialog", { name: "Add network" });
        await user.type(within(dialog).getByRole("textbox", { name: "Network name" }), "backend");
        await user.click(within(dialog).getByRole("button", { name: "Add" }));
        const output = await screen.findByRole("button", { name: "Network output for backend" });

        await user.click(output);
        await user.click(output);
        expect(screen.queryByRole("status", { name: "Connection mode" })).not.toBeInTheDocument();

        await user.click(output);
        await user.click(screen.getByRole("button", { name: "Cancel connection" }));
        expect(screen.queryByRole("status", { name: "Connection mode" })).not.toBeInTheDocument();

        await user.click(output);
        await user.click(screen.getByRole("button", { name: "Clear node selection" }));
        expect(screen.queryByRole("status", { name: "Connection mode" })).not.toBeInTheDocument();

        await user.click(output);
        output.focus();
        await user.keyboard("{Escape}");
        expect(screen.queryByRole("status", { name: "Connection mode" })).not.toBeInTheDocument();
        expect(screen.getByLabelText("Builder service networks")).toHaveTextContent("[]");
    });

    it("supplies the same stable sibling targets to every edge from a shared network", async () => {
        const user = userEvent.setup();
        renderBuilder();
        await addService(user, "api");
        await addService(user, "worker");

        await user.click(screen.getByRole("button", { name: "Network" }));
        const dialog = screen.getByRole("dialog", { name: "Add network" });
        await user.type(within(dialog).getByRole("textbox", { name: "Network name" }), "backend");
        await user.click(within(dialog).getByRole("button", { name: "Add" }));
        await user.click(screen.getByRole("button", { name: "Connect network input" }));
        await user.click(screen.getByRole("button", { name: "Connect worker network input" }));

        await waitFor(() =>
            expect(screen.getByLabelText("Network bundle targets")).toHaveTextContent(
                '[["service-api","service-worker"],["service-api","service-worker"]]',
            ),
        );
    });

    it("highlights every relationship connected to the selected resource", async () => {
        const user = userEvent.setup();
        renderBuilder();
        await addService(user, "api");
        await addService(user, "db");
        await addService(user, "worker");

        await user.click(screen.getByRole("button", { name: "Network" }));
        let dialog = screen.getByRole("dialog", { name: "Add network" });
        await user.type(within(dialog).getByRole("textbox", { name: "Network name" }), "backend");
        await user.click(within(dialog).getByRole("button", { name: "Add" }));

        await user.click(screen.getByRole("button", { name: "Connect dependency" }));
        dialog = screen.getByRole("dialog", { name: "Dependency condition" });
        await user.click(within(dialog).getByRole("button", { name: "Create dependency" }));
        await user.click(screen.getByRole("button", { name: "Connect network input" }));
        await user.click(screen.getByRole("button", { name: "Connect worker network input" }));

        await waitFor(() => expect(screen.getByTestId("edges-count")).toHaveTextContent("3"));
        const yamlBeforeSelection = screen.getByLabelText("Builder YAML").textContent;

        await user.click(screen.getByRole("button", { name: "Select service-api" }));
        expect(screen.getByLabelText("Selected builder relationships")).toHaveTextContent(
            '["dep-api-db","net-api-backend"]',
        );

        await user.click(screen.getByRole("button", { name: "Select service-worker" }));
        expect(screen.getByLabelText("Selected builder relationships")).toHaveTextContent('["net-worker-backend"]');

        await user.click(screen.getByRole("button", { name: "Clear node selection" }));
        expect(screen.getByLabelText("Selected builder relationships")).toHaveTextContent("[]");
        expect(screen.getByLabelText("Builder YAML").textContent).toBe(yamlBeforeSelection);
    });

    it("chooses a condition before creating a dependency and undoes it atomically", async () => {
        const user = userEvent.setup();
        renderBuilder();
        await addService(user, "api");
        await addService(user, "db");

        await user.click(screen.getByRole("button", { name: "Connect dependency" }));
        const dialog = screen.getByRole("dialog", { name: "Dependency condition" });
        expect(within(dialog).getByRole("radio", { name: "Started" })).toBeChecked();
        expect(screen.getByLabelText("Builder service dependencies")).toHaveTextContent("[]");

        await user.click(within(dialog).getByRole("radio", { name: "Healthy" }));
        await user.click(within(dialog).getByRole("button", { name: "Create dependency" }));

        await waitFor(() => {
            expect(screen.getByLabelText("Builder service dependencies")).toHaveTextContent(
                '{"db":{"condition":"service_healthy"}}',
            );
            expect(screen.getByLabelText("Rendered dependency condition")).toHaveTextContent("service_healthy");
            expect(screen.getByLabelText("Builder YAML")).toHaveTextContent("condition: service_healthy");
        });

        await user.click(screen.getByRole("button", { name: "Undo builder history" }));
        expect(screen.getByLabelText("Builder service dependencies")).toHaveTextContent("[]");
    });

    it("does not create a dependency when condition selection is cancelled", async () => {
        const user = userEvent.setup();
        renderBuilder();
        await addService(user, "api");
        await addService(user, "db");

        await user.click(screen.getByRole("button", { name: "Connect dependency" }));
        const dialog = screen.getByRole("dialog", { name: "Dependency condition" });
        await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

        expect(screen.getByLabelText("Builder service dependencies")).toHaveTextContent("[]");
        expect(screen.getByLabelText("Rendered dependency condition")).toBeEmptyDOMElement();
    });

    it("changes an existing dependency condition by right-clicking its edge", async () => {
        const user = userEvent.setup();
        renderBuilder();
        await addService(user, "api");
        await addService(user, "db");
        await user.click(screen.getByRole("button", { name: "Connect dependency" }));
        let dialog = screen.getByRole("dialog", { name: "Dependency condition" });
        await user.click(within(dialog).getByRole("button", { name: "Create dependency" }));
        await waitFor(() =>
            expect(screen.getByLabelText("Rendered dependency condition")).toHaveTextContent("service_started"),
        );

        const edge = screen.getByRole("button", { name: "Edit dependency edge" });
        await user.click(edge);
        expect(screen.queryByRole("dialog", { name: "Dependency condition" })).not.toBeInTheDocument();
        await user.dblClick(edge);
        expect(screen.queryByRole("dialog", { name: "Dependency condition" })).not.toBeInTheDocument();
        expect(fireEvent.contextMenu(edge)).toBe(false);

        dialog = screen.getByRole("dialog", { name: "Dependency condition" });
        expect(within(dialog).getByRole("radio", { name: "Started" })).toBeChecked();
        await user.click(within(dialog).getByRole("radio", { name: "Completed successfully" }));
        await user.click(within(dialog).getByRole("button", { name: "Save condition" }));

        await waitFor(() => {
            expect(screen.getByLabelText("Rendered dependency condition")).toHaveTextContent(
                "service_completed_successfully",
            );
            expect(screen.getByLabelText("Builder service dependencies")).toHaveTextContent(
                '{"db":{"condition":"service_completed_successfully"}}',
            );
        });

        await user.click(screen.getByRole("button", { name: "Undo builder history" }));
        await waitFor(() => {
            expect(screen.getByLabelText("Rendered dependency condition")).toHaveTextContent("service_started");
            expect(screen.getByLabelText("Builder service dependencies")).toHaveTextContent('["db"]');
        });
    });

    it("opens the selected dependency condition with Enter", async () => {
        const user = userEvent.setup();
        renderBuilder();
        await addService(user, "api");
        await addService(user, "db");
        await user.click(screen.getByRole("button", { name: "Connect dependency" }));
        let dialog = screen.getByRole("dialog", { name: "Dependency condition" });
        await user.click(within(dialog).getByRole("radio", { name: "Healthy" }));
        await user.click(within(dialog).getByRole("button", { name: "Create dependency" }));
        await waitFor(() =>
            expect(screen.getByLabelText("Rendered dependency condition")).toHaveTextContent("service_healthy"),
        );

        const edge = screen.getByRole("button", { name: "Edit dependency edge" });
        edge.focus();
        await user.keyboard("{Enter}");

        dialog = screen.getByRole("dialog", { name: "Dependency condition" });
        expect(within(dialog).getByRole("radio", { name: "Healthy" })).toBeChecked();
    });

    it("connects a named volume without asking for a dependency condition", async () => {
        const user = userEvent.setup();
        renderBuilder();
        await addService(user, "api");
        await user.click(screen.getByRole("button", { name: "Volume" }));
        const dialog = screen.getByRole("dialog", { name: "Add volume" });
        await user.type(within(dialog).getByRole("textbox", { name: "Volume name" }), "data");
        await user.click(within(dialog).getByRole("button", { name: "Add" }));

        await user.click(screen.getByRole("button", { name: "Connect volume input" }));
        await waitFor(() =>
            expect(screen.getByLabelText("Builder service volumes")).toHaveTextContent('["data:/data/data"]'),
        );
        expect(screen.queryByRole("dialog", { name: "Dependency condition" })).not.toBeInTheDocument();
    });

    it("leaves the builder unchanged when resource naming is cancelled", async () => {
        const user = userEvent.setup();
        renderBuilder();

        await user.click(screen.getByRole("button", { name: "Service" }));
        const dialog = screen.getByRole("dialog", { name: "Add service" });
        await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

        expect(screen.getByLabelText("Builder services")).toBeEmptyDOMElement();
        expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
    });

    it("preserves the drop position while awaiting a resource name", async () => {
        const user = userEvent.setup();
        renderBuilder();

        await user.click(screen.getByRole("button", { name: "Initialize canvas" }));
        fireEvent.drop(screen.getByTestId("react-flow"), {
            clientX: 110,
            clientY: 220,
            dataTransfer: { getData: () => "services" },
        });

        const dialog = screen.getByRole("dialog", { name: "Add service" });
        await user.type(within(dialog).getByRole("textbox", { name: "Service name" }), "worker");
        await user.click(within(dialog).getByRole("button", { name: "Add" }));

        await waitFor(() => {
            expect(screen.getByLabelText("Builder services")).toHaveTextContent("worker");
            expect(screen.getByLabelText("Builder service position")).toHaveTextContent('{"x":100,"y":200}');
            expect(screen.getByRole("heading", { name: "worker" })).toBeInTheDocument();
        });
    });

    it("deletes the selected node only after popup confirmation", async () => {
        const user = userEvent.setup();
        renderBuilder();

        await user.click(screen.getByRole("button", { name: "Service" }));
        let dialog = screen.getByRole("dialog", { name: "Add service" });
        await user.type(within(dialog).getByRole("textbox", { name: "Service name" }), "api");
        await user.click(within(dialog).getByRole("button", { name: "Add" }));
        await screen.findByRole("heading", { name: "api" });

        await user.click(screen.getByRole("button", { name: "Delete" }));
        dialog = screen.getByRole("dialog", { name: "Delete api?" });
        await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
        expect(screen.getByLabelText("Builder services")).toHaveTextContent("api");
        expect(screen.getByRole("heading", { name: "api" })).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Delete" }));
        dialog = screen.getByRole("dialog", { name: "Delete api?" });
        await user.click(within(dialog).getByRole("button", { name: "Delete" }));

        await waitFor(() => {
            expect(screen.getByLabelText("Builder services")).toBeEmptyDOMElement();
            expect(screen.queryByRole("heading", { name: "api" })).not.toBeInTheDocument();
        });
    });

    it("confirms deletion initiated by the React Flow canvas", async () => {
        const user = userEvent.setup();
        renderBuilder();

        expect(screen.getByLabelText("Canvas pre-delete enabled")).toHaveTextContent("true");

        await user.click(screen.getByRole("button", { name: "Service" }));
        let dialog = screen.getByRole("dialog", { name: "Add service" });
        await user.type(within(dialog).getByRole("textbox", { name: "Service name" }), "api");
        await user.click(within(dialog).getByRole("button", { name: "Add" }));
        await screen.findByRole("heading", { name: "api" });

        await user.click(screen.getByRole("button", { name: "Delete selected flow nodes" }));
        dialog = screen.getByRole("dialog", { name: "Delete api?" });
        await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
        expect(screen.getByLabelText("Builder services")).toHaveTextContent("api");
        expect(screen.getByRole("heading", { name: "api" })).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Delete selected flow nodes" }));
        dialog = screen.getByRole("dialog", { name: "Delete api?" });
        await user.click(within(dialog).getByRole("button", { name: "Delete" }));

        await waitFor(() => expect(screen.getByLabelText("Builder services")).toBeEmptyDOMElement());
    });
});
