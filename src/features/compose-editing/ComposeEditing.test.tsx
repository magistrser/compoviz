import { act, renderHook } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DependencyConditions } from "../../models";
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
                    {
                        action: "connect",
                        relationship: "depends-on",
                        service: "api",
                        target: "db",
                        condition: DependencyConditions.STARTED,
                    },
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

    it.each([
        {
            condition: DependencyConditions.STARTED,
            expected: ["db"],
            yamlCondition: null,
        },
        {
            condition: DependencyConditions.HEALTHY,
            expected: { db: { condition: DependencyConditions.HEALTHY } },
            yamlCondition: "condition: service_healthy",
        },
        {
            condition: DependencyConditions.COMPLETED,
            expected: { db: { condition: DependencyConditions.COMPLETED } },
            yamlCondition: "condition: service_completed_successfully",
        },
    ])("creates a dependency with $condition", ({ condition, expected, yamlCondition }) => {
        const { result } = renderHook(() => ({ editing: useComposeEditing(), workspace: useComposeWorkspace() }), {
            wrapper,
        });
        act(() => {
            result.current.editing.commit({ type: "add-resource", resource: "service", name: "api" });
            result.current.editing.commit({ type: "add-resource", resource: "service", name: "db" });
            result.current.editing.commit({
                type: "change-relationships",
                changes: [{ action: "connect", relationship: "depends-on", service: "api", target: "db", condition }],
            });
        });

        expect(result.current.workspace.snapshot.state.services.api?.depends_on).toEqual(expected);
        expect(result.current.workspace.snapshot.yaml).toContain("depends_on:");
        if (yamlCondition) expect(result.current.workspace.snapshot.yaml).toContain(yamlCondition);
        else expect(result.current.workspace.snapshot.yaml).not.toContain("condition:");

        act(() => result.current.editing.moveHistory("undo"));
        expect(result.current.workspace.snapshot.state.services.api?.depends_on).toEqual([]);
    });

    it("preserves simple dependencies when adding a conditioned dependency", () => {
        const { result } = renderHook(() => ({ editing: useComposeEditing(), workspace: useComposeWorkspace() }), {
            wrapper,
        });
        act(() => {
            result.current.editing.commit({ type: "add-resource", resource: "service", name: "api" });
            result.current.editing.commit({ type: "add-resource", resource: "service", name: "backend" });
            result.current.editing.commit({ type: "add-resource", resource: "service", name: "db" });
        });
        act(() => {
            result.current.editing.commit({
                type: "update-resource",
                resource: "service",
                name: "api",
                data: { depends_on: ["backend"] },
            });
        });
        act(() => {
            result.current.editing.commit({
                type: "change-relationships",
                changes: [
                    {
                        action: "connect",
                        relationship: "depends-on",
                        service: "api",
                        target: "db",
                        condition: DependencyConditions.HEALTHY,
                    },
                ],
            });
        });

        expect(result.current.workspace.snapshot.state.services.api?.depends_on).toEqual({
            backend: { condition: DependencyConditions.STARTED },
            db: { condition: DependencyConditions.HEALTHY },
        });
        expect(result.current.workspace.snapshot.yaml).toContain("backend:\n        condition: service_started");
        expect(result.current.workspace.snapshot.yaml).toContain("db:\n        condition: service_healthy");
    });

    it("changes one dependency condition while preserving sibling configuration", () => {
        const { result } = renderHook(() => ({ editing: useComposeEditing(), workspace: useComposeWorkspace() }), {
            wrapper,
        });
        act(() => {
            result.current.editing.commit({ type: "add-resource", resource: "service", name: "api" });
            result.current.editing.commit({ type: "add-resource", resource: "service", name: "db" });
            result.current.editing.commit({ type: "add-resource", resource: "service", name: "worker" });
            result.current.editing.commit({
                type: "update-resource",
                resource: "service",
                name: "api",
                data: {
                    depends_on: {
                        db: { condition: DependencyConditions.HEALTHY, restart: true },
                        worker: { condition: DependencyConditions.COMPLETED, required: false },
                    },
                },
            });
        });

        act(() => {
            result.current.editing.commit({
                type: "change-relationships",
                changes: [
                    {
                        action: "update",
                        relationship: "depends-on",
                        service: "api",
                        target: "db",
                        condition: DependencyConditions.COMPLETED,
                    },
                ],
            });
        });

        expect(result.current.workspace.snapshot.state.services.api?.depends_on).toEqual({
            db: { condition: DependencyConditions.COMPLETED, restart: true },
            worker: { condition: DependencyConditions.COMPLETED, required: false },
        });
    });

    it("compacts simple Started dependencies and ignores a repeated condition", () => {
        const { result } = renderHook(() => ({ editing: useComposeEditing(), workspace: useComposeWorkspace() }), {
            wrapper,
        });
        act(() => {
            result.current.editing.commit({ type: "add-resource", resource: "service", name: "api" });
            result.current.editing.commit({ type: "add-resource", resource: "service", name: "db" });
            result.current.editing.commit({ type: "add-resource", resource: "service", name: "worker" });
            result.current.editing.commit({
                type: "update-resource",
                resource: "service",
                name: "api",
                data: {
                    depends_on: {
                        db: { condition: DependencyConditions.HEALTHY },
                        worker: { condition: DependencyConditions.STARTED },
                    },
                },
            });
        });

        let changed: ReturnType<typeof result.current.editing.commit> | undefined;
        let unchanged: ReturnType<typeof result.current.editing.commit> | undefined;
        act(() => {
            changed = result.current.editing.commit({
                type: "change-relationships",
                changes: [
                    {
                        action: "update",
                        relationship: "depends-on",
                        service: "api",
                        target: "db",
                        condition: DependencyConditions.STARTED,
                    },
                ],
            });
            unchanged = result.current.editing.commit({
                type: "change-relationships",
                changes: [
                    {
                        action: "update",
                        relationship: "depends-on",
                        service: "api",
                        target: "db",
                        condition: DependencyConditions.STARTED,
                    },
                ],
            });
        });

        expect(changed).toEqual({ status: "applied" });
        expect(unchanged).toEqual({ status: "unchanged" });
        expect(result.current.workspace.snapshot.state.services.api?.depends_on).toEqual(["db", "worker"]);

        act(() => result.current.editing.moveHistory("undo"));
        expect(result.current.workspace.snapshot.state.services.api?.depends_on).toEqual({
            db: { condition: DependencyConditions.HEALTHY },
            worker: { condition: DependencyConditions.STARTED },
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

    it("positions every builder resource in one idempotent undoable transition", () => {
        const { result } = renderHook(() => ({ editing: useComposeEditing(), workspace: useComposeWorkspace() }), {
            wrapper,
        });
        act(() => {
            result.current.editing.commit({ type: "add-resource", resource: "service", name: "api" });
            result.current.editing.commit({ type: "add-resource", resource: "network", name: "backend" });
            result.current.editing.commit({ type: "add-resource", resource: "volume", name: "data" });
            result.current.editing.commit({ type: "add-resource", resource: "secret", name: "token" });
            result.current.editing.commit({ type: "add-resource", resource: "config", name: "settings" });
        });

        const positions = [
            { resource: "service" as const, name: "api", position: { x: 0, y: 0 } },
            { resource: "network" as const, name: "backend", position: { x: 300, y: 0 } },
            { resource: "volume" as const, name: "data", position: { x: 300, y: 150 } },
            { resource: "secret" as const, name: "token", position: { x: 0, y: 300 } },
            { resource: "config" as const, name: "settings", position: { x: 300, y: 300 } },
        ];
        let firstOutcome: ReturnType<typeof result.current.editing.commit> | undefined;
        let repeatedOutcome: ReturnType<typeof result.current.editing.commit> | undefined;
        act(() => {
            firstOutcome = result.current.editing.commit({ type: "position-resources", positions });
            repeatedOutcome = result.current.editing.commit({ type: "position-resources", positions });
        });

        expect(firstOutcome).toEqual({ status: "applied" });
        expect(repeatedOutcome).toEqual({ status: "unchanged" });
        expect(result.current.workspace.snapshot.state.services.api?._position).toEqual({ x: 0, y: 0 });
        expect(result.current.workspace.snapshot.state.networks.backend?._position).toEqual({ x: 300, y: 0 });
        expect(result.current.workspace.snapshot.state.volumes.data?._position).toEqual({ x: 300, y: 150 });
        expect(result.current.workspace.snapshot.state.secrets.token?._position).toEqual({ x: 0, y: 300 });
        expect(result.current.workspace.snapshot.state.configs.settings?._position).toEqual({ x: 300, y: 300 });

        act(() => result.current.editing.moveHistory("undo"));
        expect(result.current.workspace.snapshot.state.services.api?._position).toBeUndefined();
        expect(result.current.workspace.snapshot.state.networks.backend?._position).toBeUndefined();
        expect(result.current.workspace.snapshot.state.volumes.data?._position).toBeUndefined();
        expect(result.current.workspace.snapshot.state.secrets.token?._position).toBeUndefined();
        expect(result.current.workspace.snapshot.state.configs.settings?._position).toBeUndefined();

        act(() => result.current.editing.moveHistory("redo"));
        expect(result.current.workspace.snapshot.state.services.api?._position).toEqual({ x: 0, y: 0 });
        expect(result.current.workspace.snapshot.state.configs.settings?._position).toEqual({ x: 300, y: 300 });
    });

    it("rejects an entire generated placement when any target is stale", () => {
        const { result } = renderHook(() => ({ editing: useComposeEditing(), workspace: useComposeWorkspace() }), {
            wrapper,
        });
        act(() => {
            result.current.editing.commit({ type: "add-resource", resource: "service", name: "api" });
        });

        let outcome: ReturnType<typeof result.current.editing.commit> | undefined;
        act(() => {
            outcome = result.current.editing.commit({
                type: "position-resources",
                positions: [
                    { resource: "service", name: "api", position: { x: 0, y: 0 } },
                    { resource: "network", name: "removed", position: { x: 300, y: 0 } },
                ],
            });
        });

        expect(outcome).toEqual({ status: "rejected", reason: "missing-resource" });
        expect(result.current.workspace.snapshot.state.services.api?._position).toBeUndefined();

        act(() => result.current.editing.moveHistory("undo"));
        expect(result.current.workspace.snapshot.state.services.api).toBeUndefined();
    });
});
