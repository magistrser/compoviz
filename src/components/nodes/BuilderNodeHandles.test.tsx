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
import { BuilderConnectionProvider } from "./BuilderHandle";

vi.mock("@xyflow/react", async (importOriginal) => {
    const actual = await importOriginal<typeof ReactFlowModule>();
    return {
        ...actual,
        Handle: ({
            "aria-label": ariaLabel,
            "aria-pressed": ariaPressed,
            className,
            id,
            isConnectable,
            isConnectableEnd,
            isConnectableStart,
            onClick,
            onKeyDown,
            position,
            role,
            style,
            tabIndex,
            type,
        }: HandleProps) => (
            <span
                role={role}
                aria-label={ariaLabel}
                aria-pressed={ariaPressed}
                className={className}
                data-testid={`handle-${id ?? type}`}
                data-connectable={isConnectable}
                data-connectable-end={isConnectableEnd}
                data-connectable-start={isConnectableStart}
                data-position={position}
                data-type={type}
                tabIndex={tabIndex}
                style={style}
                onClick={onClick}
                onKeyDown={onKeyDown}
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

    it("aligns dependency input and output while keeping resource inputs in separate lanes", () => {
        render(<ServiceNode {...serviceProps} />);

        expect(screen.getByTestId("handle-deps-in")).toHaveStyle({ top: "37.5%" });
        expect(screen.getByTestId("handle-deps-out")).toHaveStyle({ top: "37.5%" });
        expect(screen.getByTestId("handle-network-in")).toHaveStyle({ top: "50%" });
        expect(screen.getByTestId("handle-volume-in")).toHaveStyle({ top: "62.5%" });
    });

    it("exposes supported terminals as click-only buttons", () => {
        render(<ServiceNode {...serviceProps} />);

        const networkInput = screen.getByRole("button", { name: "Network input for api" });
        expect(networkInput).toHaveAttribute("tabindex", "0");
        expect(networkInput).toHaveAttribute("aria-pressed", "false");
        expect(networkInput).toHaveAttribute("data-connectable", "false");
        expect(networkInput).toHaveAttribute("data-connectable-start", "false");
        expect(networkInput).toHaveAttribute("data-connectable-end", "false");
    });

    it("identifies the selected terminal and its compatible candidates", () => {
        render(
            <BuilderConnectionProvider
                activeTerminal={{
                    nodeId: "network-backend",
                    handleId: "network-out",
                    handleType: "source",
                    label: "Network output for backend",
                }}
                isCompatibleTerminal={(terminal) => terminal.handleId === "network-in"}
                onTerminalClick={() => undefined}
            >
                <NetworkNode
                    {...commonProps}
                    id="network-backend"
                    type="networkNode"
                    data={{ name: "backend" }}
                />
                <ServiceNode {...serviceProps} />
            </BuilderConnectionProvider>,
        );

        expect(screen.getByRole("button", { name: "Network output for backend" })).toHaveClass("builder-handle-active");
        expect(screen.getByRole("button", { name: "Network output for backend" })).toHaveAttribute(
            "aria-pressed",
            "true",
        );
        expect(screen.getByRole("button", { name: "Network input for api" })).toHaveClass("builder-handle-compatible");
        expect(screen.getByRole("button", { name: "Dependency input for api" })).toHaveClass(
            "builder-handle-incompatible",
        );
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

    it.each([
        ["secret", SecretNode, { ...commonProps, id: "secret-token", type: "secretNode", data: { name: "token" } }],
        [
            "config",
            ConfigNode,
            { ...commonProps, id: "config-settings", type: "configNode", data: { name: "settings" } },
        ],
    ] as const)("keeps the unsupported %s handle inert", (_resource, NodeComponent, props) => {
        render(<NodeComponent {...props} />);

        const handle = screen.getByTestId("handle-services");
        expect(handle).toHaveAttribute("data-connectable", "false");
        expect(handle).toHaveAttribute("data-connectable-start", "false");
        expect(handle).toHaveAttribute("data-connectable-end", "false");
    });
});
