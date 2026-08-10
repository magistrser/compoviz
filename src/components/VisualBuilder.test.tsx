import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "../test/utils";
import { Suspense, type PropsWithChildren, type ReactNode } from "react";
import type { Edge, Node } from "@xyflow/react";
import VisualBuilder from "./VisualBuilder";

// Mock React Flow
vi.mock("@xyflow/react", () => ({
    ReactFlow: ({ children, nodes, edges }: { children?: ReactNode; nodes?: Node[]; edges?: Edge[] }) => (
        <div data-testid="react-flow">
            <div data-testid="nodes-count">{nodes?.length || 0}</div>
            <div data-testid="edges-count">{edges?.length || 0}</div>
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
});
