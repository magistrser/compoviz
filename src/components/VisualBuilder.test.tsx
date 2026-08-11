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
import type { Connection, Edge, Node, OnBeforeDelete } from "@xyflow/react";
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
        onEdgeDoubleClick,
        onEdgesDelete,
        minZoom,
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
        onEdgeDoubleClick?: (event: ReactMouseEvent, edge: Edge) => void;
        onEdgesDelete?: (edges: Edge[]) => void;
        minZoom?: number;
    }) => {
        const dependencyEdge = edges?.find((edge) => edge.id.startsWith("dep-"));
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
    const { snapshot } = useComposeWorkspace();
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

    it("changes an existing dependency condition by double-clicking its edge", async () => {
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
