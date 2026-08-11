import { act, renderHook } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ComposeWorkspaceProvider, useComposeWorkspace } from "../compose-workspace";
import { useComposeEditing } from ".";

function wrapper({ children }: PropsWithChildren) {
    return <ComposeWorkspaceProvider>{children}</ComposeWorkspaceProvider>;
}

describe("useComposeEditing", () => {
    beforeEach(() => {
        vi.mocked(localStorage.getItem).mockReset();
        vi.mocked(localStorage.setItem).mockReset();
    });

    it("applies one resource edit with the compatible defaults and generated YAML", () => {
        const { result } = renderHook(() => ({ editing: useComposeEditing(), workspace: useComposeWorkspace() }), {
            wrapper,
        });

        let outcome: ReturnType<typeof result.current.editing.commit> | undefined;
        act(() => {
            outcome = result.current.editing.commit({ type: "add-resource", resource: "service", name: "api" });
        });

        expect(outcome).toEqual({ status: "applied" });
        expect(result.current.workspace.snapshot.state.services.api).toEqual({
            image: "",
            ports: [],
            environment: {},
            depends_on: [],
            networks: [],
            volumes: [],
            labels: {},
            deploy: { resources: { limits: {}, reservations: {} } },
            healthcheck: {},
        });
        expect(result.current.workspace.snapshot.yaml).toBe("services: {}\n");
        expect(result.current.editing.canUndo).toBe(true);
    });

    it("does not add history for unchanged or rejected edits", () => {
        const { result } = renderHook(useComposeEditing, { wrapper });

        let unchanged: ReturnType<typeof result.current.commit> | undefined;
        let rejected: ReturnType<typeof result.current.commit> | undefined;
        act(() => {
            unchanged = result.current.commit({ type: "set-project-name", name: "" });
            rejected = result.current.commit({ type: "add-resource", resource: "service", name: "   " });
        });

        expect(unchanged).toEqual({ status: "unchanged" });
        expect(rejected).toEqual({ status: "rejected", reason: "invalid-name" });
        expect(result.current.canUndo).toBe(false);
        expect(result.current.canRedo).toBe(false);
    });

    it("applies a service template and its volume as one undoable transition", () => {
        const { result } = renderHook(() => ({ editing: useComposeEditing(), workspace: useComposeWorkspace() }), {
            wrapper,
        });

        act(() => {
            result.current.editing.commit({
                type: "apply-template",
                serviceName: "redis",
                service: {
                    image: "redis:alpine",
                    ports: ["6379:6379"],
                    volumes: ["redis_data:/data"],
                    restart: "unless-stopped",
                },
                suggestedVolume: { name: "redis_data", config: { driver: "local" } },
            });
        });

        expect(result.current.workspace.snapshot.yaml).toBe(
            [
                "services:",
                "  redis:",
                "    image: redis:alpine",
                "    ports:",
                '      - "6379:6379"',
                "    volumes:",
                "      - redis_data:/data",
                "    restart: unless-stopped",
                "volumes:",
                "  redis_data:",
                "    driver: local",
                "    external: false",
                "",
            ].join("\n"),
        );

        act(() => result.current.editing.moveHistory("undo"));
        expect(result.current.workspace.snapshot.state.services).toEqual({});
        expect(result.current.workspace.snapshot.state.volumes).toEqual({});
        expect(result.current.editing.canRedo).toBe(true);

        act(() => result.current.editing.moveHistory("redo"));
        expect(Object.keys(result.current.workspace.snapshot.state.services)).toEqual(["redis"]);
        expect(Object.keys(result.current.workspace.snapshot.state.volumes)).toEqual(["redis_data"]);
    });

    it("invalidates redo only after a newly applied edit", () => {
        const { result } = renderHook(useComposeEditing, { wrapper });
        act(() => {
            result.current.commit({ type: "add-resource", resource: "service", name: "api" });
        });
        act(() => result.current.moveHistory("undo"));
        expect(result.current.canRedo).toBe(true);

        act(() => {
            result.current.commit({ type: "set-project-name", name: "" });
        });
        expect(result.current.canRedo).toBe(true);

        act(() => {
            result.current.commit({ type: "add-resource", resource: "network", name: "frontend" });
        });
        expect(result.current.canRedo).toBe(false);
    });

    it("retains the most recent fifty applied transitions", () => {
        const { result } = renderHook(() => ({ editing: useComposeEditing(), workspace: useComposeWorkspace() }), {
            wrapper,
        });
        act(() => {
            for (let index = 1; index <= 51; index += 1) {
                result.current.editing.commit({ type: "set-project-name", name: `project-${index}` });
            }
        });
        act(() => {
            for (let index = 0; index < 50; index += 1) result.current.editing.moveHistory("undo");
        });

        expect(result.current.workspace.snapshot.state.name).toBe("project-1");
        expect(result.current.editing.canUndo).toBe(false);
    });

    it("commits multiple relationship changes as one history transition", () => {
        const { result } = renderHook(() => ({ editing: useComposeEditing(), workspace: useComposeWorkspace() }), {
            wrapper,
        });
        act(() => {
            result.current.editing.commit({ type: "add-resource", resource: "service", name: "api" });
            result.current.editing.commit({ type: "add-resource", resource: "service", name: "db" });
            result.current.editing.commit({ type: "add-resource", resource: "network", name: "backend" });
            result.current.editing.commit({ type: "add-resource", resource: "volume", name: "data" });
        });

        act(() => {
            result.current.editing.commit({
                type: "change-relationships",
                changes: [
                    { action: "connect", relationship: "depends-on", service: "api", target: "db" },
                    { action: "connect", relationship: "network", service: "api", target: "backend" },
                    { action: "connect", relationship: "volume", service: "api", target: "data" },
                ],
            });
        });
        expect(result.current.workspace.snapshot.state.services.api).toMatchObject({
            depends_on: ["db"],
            networks: ["backend"],
            volumes: ["data:/data/data"],
        });

        act(() => result.current.editing.moveHistory("undo"));
        expect(result.current.workspace.snapshot.state.services.api).toMatchObject({
            depends_on: [],
            networks: [],
            volumes: [],
        });
    });

    it("renames and removes multiple resources atomically without rewriting references", () => {
        const { result } = renderHook(() => ({ editing: useComposeEditing(), workspace: useComposeWorkspace() }), {
            wrapper,
        });
        act(() => {
            result.current.editing.commit({ type: "add-resource", resource: "service", name: "api" });
            result.current.editing.commit({ type: "add-resource", resource: "service", name: "client" });
            result.current.editing.commit({
                type: "update-resource",
                resource: "service",
                name: "client",
                data: { depends_on: ["api"] },
            });
            result.current.editing.commit({ type: "add-resource", resource: "network", name: "frontend" });
        });
        act(() => {
            result.current.editing.commit({
                type: "rename-resource",
                resource: "service",
                oldName: "api",
                newName: "gateway",
            });
        });
        expect(result.current.workspace.snapshot.state.services.gateway).toBeDefined();
        expect(result.current.workspace.snapshot.state.services.api).toBeUndefined();
        expect(result.current.workspace.snapshot.state.services.client?.depends_on).toEqual(["api"]);

        act(() => {
            result.current.editing.commit({
                type: "remove-resources",
                resources: [
                    { resource: "service", name: "gateway" },
                    { resource: "network", name: "frontend" },
                ],
            });
        });
        expect(result.current.workspace.snapshot.state.services.gateway).toBeUndefined();
        expect(result.current.workspace.snapshot.state.networks.frontend).toBeUndefined();

        act(() => result.current.editing.moveHistory("undo"));
        expect(result.current.workspace.snapshot.state.services.gateway).toBeDefined();
        expect(result.current.workspace.snapshot.state.networks.frontend).toBeDefined();
    });

    it("records a changed position once and ignores an identical position", () => {
        const { result } = renderHook(() => ({ editing: useComposeEditing(), workspace: useComposeWorkspace() }), {
            wrapper,
        });
        act(() => {
            result.current.editing.commit({ type: "add-resource", resource: "service", name: "worker" });
            result.current.editing.commit({
                type: "position-resource",
                resource: "service",
                name: "worker",
                position: { x: 10, y: 20 },
            });
        });
        let outcome: ReturnType<typeof result.current.editing.commit> | undefined;
        act(() => {
            outcome = result.current.editing.commit({
                type: "position-resource",
                resource: "service",
                name: "worker",
                position: { x: 10, y: 20 },
            });
        });
        expect(outcome).toEqual({ status: "unchanged" });

        act(() => result.current.editing.moveHistory("undo"));
        expect(result.current.workspace.snapshot.state.services.worker?._position).toBeUndefined();
    });
});
