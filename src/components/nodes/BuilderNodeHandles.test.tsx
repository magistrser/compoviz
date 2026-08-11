import { render, screen } from "@testing-library/react";
import type { HandleProps } from "@xyflow/react";
import type * as ReactFlowModule from "@xyflow/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import ConfigNode from "./ConfigNode";
import NetworkNode from "./NetworkNode";
import SecretNode from "./SecretNode";
import ServiceNode from "./ServiceNode";
import VolumeNode from "./VolumeNode";

vi.mock("@xyflow/react", async (importOriginal) => {
    const actual = await importOriginal<typeof ReactFlowModule>();
    return {
        ...actual,
        Handle: ({ id, position, type }: HandleProps) => (
            <span
                data-testid={`handle-${id ?? type}`}
                data-position={position}
                data-type={type}
            />
        ),
    };
});

const commonProps = {
    dragging: false,
    zIndex: 0,
    selectable: true,
    deletable: true,
    selected: false,
    draggable: true,
    isConnectable: true,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
};

const serviceProps: ComponentProps<typeof ServiceNode> = {
    ...commonProps,
    id: "service-api",
    type: "serviceNode",
    data: { name: "api", image: null },
};

describe("builder node connection handles", () => {
    it("renders every service input on the left and every service output on the right", () => {
        render(<ServiceNode {...serviceProps} />);

        for (const input of ["deps-in", "network-in", "volume-in"]) {
            expect(screen.getByTestId(`handle-${input}`)).toHaveAttribute("data-type", "target");
            expect(screen.getByTestId(`handle-${input}`)).toHaveAttribute("data-position", "left");
        }
        expect(screen.getByTestId("handle-deps-out")).toHaveAttribute("data-type", "source");
        expect(screen.getByTestId("handle-deps-out")).toHaveAttribute("data-position", "right");
    });

    it.each([
        [
            "network",
            NetworkNode,
            { ...commonProps, id: "network-backend", type: "networkNode", data: { name: "backend" } },
            "network-out",
        ],
        [
            "volume",
            VolumeNode,
            { ...commonProps, id: "volume-data", type: "volumeNode", data: { name: "data" } },
            "volume-out",
        ],
        [
            "secret",
            SecretNode,
            { ...commonProps, id: "secret-token", type: "secretNode", data: { name: "token" } },
            "services",
        ],
        [
            "config",
            ConfigNode,
            { ...commonProps, id: "config-settings", type: "configNode", data: { name: "settings" } },
            "services",
        ],
    ] as const)("renders the %s output on the right", (_resource, NodeComponent, props, handleId) => {
        render(<NodeComponent {...props} />);

        expect(screen.getByTestId(`handle-${handleId}`)).toHaveAttribute("data-type", "source");
        expect(screen.getByTestId(`handle-${handleId}`)).toHaveAttribute("data-position", "right");
    });
});
