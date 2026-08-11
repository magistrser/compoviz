import { Position, type BaseEdgeProps, type EdgeProps } from "@xyflow/react";
import type * as ReactFlowModule from "@xyflow/react";
import type { PropsWithChildren } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "../../test/utils";
import DependsOnEdge from "./DependsOnEdge";
import NetworkEdge from "./NetworkEdge";
import VolumeEdge from "./VolumeEdge";

vi.mock("@xyflow/react", async (importOriginal) => {
    const actual = await importOriginal<typeof ReactFlowModule>();
    return {
        ...actual,
        BaseEdge: ({ id, path, className, style }: BaseEdgeProps) => (
            <svg>
                <path
                    data-testid={`edge-${id}`}
                    d={path}
                    className={className}
                    style={style}
                />
            </svg>
        ),
        EdgeLabelRenderer: ({ children }: PropsWithChildren) => <>{children}</>,
    };
});

const edgeProps = (id: string): EdgeProps => ({
    id,
    source: "service-api",
    target: "service-db",
    sourceX: 0,
    sourceY: 0,
    targetX: 300,
    targetY: 150,
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
});

const expectOrthogonalPath = (id: string) => {
    const path = screen.getByTestId(`edge-${id}`);
    expect(path.getAttribute("d")).toContain("Q");
    expect(path.getAttribute("d")).not.toContain("C");
    return path;
};

describe("builder relationship edges", () => {
    it.each([
        ["service_started", "#E06C9A"],
        ["service_healthy", "#C084FC"],
        ["service_completed_successfully", "#818CF8"],
    ])("colors %s dependencies without an inline label", (condition, stroke) => {
        const { container } = render(
            <DependsOnEdge
                {...edgeProps(condition)}
                data={{ condition }}
            />,
        );

        const path = expectOrthogonalPath(condition);
        expect(path).toHaveClass("depends-on-edge");
        expect(path).toHaveStyle({ stroke, strokeWidth: 2 });
        expect(container.querySelector(".depends-on-label")).not.toBeInTheDocument();
    });

    it("falls back to a started dependency and keeps selected emphasis", () => {
        render(
            <DependsOnEdge
                {...edgeProps("dependency-fallback")}
                selected
            />,
        );

        const path = expectOrthogonalPath("dependency-fallback");
        expect(path).toHaveClass("depends-on-edge", "selected");
        expect(path).toHaveStyle({ stroke: "#E06C9A", strokeWidth: 3 });
    });

    it("keeps the network dash pattern on a rounded orthogonal path", () => {
        render(<NetworkEdge {...edgeProps("network")} />);

        const path = expectOrthogonalPath("network");
        expect(path).toHaveClass("network-edge");
        expect(path).toHaveStyle({ stroke: "#56D4DD", strokeDasharray: "5 3" });
    });

    it("keeps volume labels and dash pattern on a rounded orthogonal path", () => {
        render(
            <VolumeEdge
                {...edgeProps("volume")}
                data={{ mountPath: "/var/lib/api" }}
            />,
        );

        const path = expectOrthogonalPath("volume");
        expect(path).toHaveClass("volume-edge");
        expect(path).toHaveStyle({ stroke: "#EAB354", strokeDasharray: "2 2" });
        expect(screen.getByText("/var/lib/api")).toHaveClass("volume-label");
    });
});
