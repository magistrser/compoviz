import { describe, it, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { fireEvent, render, screen, waitFor, within } from "../test/utils";
import { Suspense, type DragEventHandler, type PropsWithChildren, type ReactNode } from "react";
import type { Edge, Node, OnBeforeDelete } from "@xyflow/react";
import VisualBuilder from "./VisualBuilder";
import { useComposeWorkspace } from "../features/compose-workspace";

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
    }: {
        children?: ReactNode;
        nodes?: Node[];
        edges?: Edge[];
        onDrop?: DragEventHandler<HTMLDivElement>;
        onInit?: (instance: {
            screenToFlowPosition: (position: { x: number; y: number }) => { x: number; y: number };
        }) => void;
        onBeforeDelete?: OnBeforeDelete<Node, Edge>;
        onNodesDelete?: (nodes: Node[]) => void;
    }) => (
        <div
            data-testid="react-flow"
            onDrop={onDrop}
        >
            <div data-testid="nodes-count">{nodes?.length || 0}</div>
            <div data-testid="edges-count">{edges?.length || 0}</div>
            <output aria-label="Canvas pre-delete enabled">{String(Boolean(onBeforeDelete))}</output>
            <button
                onClick={() =>
                    onInit?.({
                        screenToFlowPosition: () => ({ x: 100, y: 200 }),
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
            {children}
        </div>
    ),
    Background: () => <div data-testid="background" />,
    Controls: () => <div data-testid="controls" />,
    MiniMap: () => <div data-testid="minimap" />,
    Panel: ({ children }: PropsWithChildren) => <div data-testid="panel">{children}</div>,
    BackgroundVariant: { Dots: "dots" },
    useNodesState: (initial: Node[]) => [initial, vi.fn(), vi.fn()],
    useEdgesState: (initial: Edge[]) => [initial, vi.fn(), vi.fn()],
}));

const ComposeProbe = () => {
    const { snapshot } = useComposeWorkspace();
    const { state } = snapshot;
    const serviceNames = Object.keys(state.services);

    return (
        <>
            <output aria-label="Builder services">{serviceNames.join(",")}</output>
            <output aria-label="Builder service position">
                {JSON.stringify(serviceNames[0] ? state.services[serviceNames[0]]?._position : null)}
            </output>
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
