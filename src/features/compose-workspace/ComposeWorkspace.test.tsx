import { act, renderHook } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ParserWorkerClient } from "../../models/composeTypes";
import { ComposeWorkspaceProvider, useComposeWorkspace } from ".";

const parseAsync = vi.fn<ParserWorkerClient["parseAsync"]>();
const terminate = vi.fn();

vi.mock("../../utils/workerManager", () => ({
    createParserWorker: (): ParserWorkerClient => ({ parseAsync, terminate }),
}));

function wrapper({ children }: PropsWithChildren) {
    return <ComposeWorkspaceProvider>{children}</ComposeWorkspaceProvider>;
}

describe("useComposeWorkspace", () => {
    beforeEach(() => {
        vi.mocked(localStorage.getItem).mockReset();
        vi.mocked(localStorage.setItem).mockReset();
        vi.mocked(localStorage.removeItem).mockReset();
        vi.mocked(localStorage.clear).mockReset();
        parseAsync.mockReset();
        terminate.mockReset();
    });

    it("atomically publishes a successful source replacement", async () => {
        parseAsync.mockResolvedValue({
            compose: {
                name: "catalog",
                services: { web: { image: "nginx:alpine" } },
            },
            profiles: ["debug"],
            profileCounts: { debug: 1 },
            variables: ["TAG"],
            undefinedVariables: ["TAG"],
            errors: [
                {
                    type: "warning",
                    stage: "variable-validation",
                    message: "Undefined variables: TAG",
                },
            ],
        });
        const { result } = renderHook(useComposeWorkspace, { wrapper });

        let outcome: Awaited<ReturnType<typeof result.current.replace>> | undefined;
        await act(async () => {
            outcome = await result.current.replace({
                kind: "yaml",
                yaml: "name: catalog\nservices:\n  web:\n    image: nginx:alpine\n",
                importedFilename: "catalog.yaml",
            });
        });

        expect(outcome).toMatchObject({ status: "accepted", adapter: "worker" });
        expect(result.current.snapshot).toMatchObject({
            state: { name: "catalog", services: { web: { image: "nginx:alpine" } } },
            profiles: ["debug"],
            profileCounts: { debug: 1 },
            variables: ["TAG"],
            undefinedVariables: ["TAG"],
            parserIssues: [{ message: "Undefined variables: TAG" }],
            source: { importedFilename: "catalog.yaml" },
            activity: { status: "idle" },
            processing: { adapter: "worker", enrichment: "completed" },
        });
        expect(result.current.snapshot.yaml).toContain("name: catalog");
        expect(result.current.snapshot.ast.services.map((service) => service.id)).toEqual(["web"]);
        expect(localStorage.setItem).toHaveBeenCalledWith(
            "docker-compose-state",
            JSON.stringify(result.current.snapshot.state),
        );
    });

    it("rejects invalid YAML without mutating the committed project or source", async () => {
        parseAsync
            .mockResolvedValueOnce({
                compose: { name: "stable", services: { api: { image: "node:22" } } },
                profiles: [],
                profileCounts: {},
                variables: [],
                undefinedVariables: [],
                errors: [],
            })
            .mockResolvedValueOnce({
                compose: null,
                profiles: [],
                profileCounts: {},
                variables: [],
                undefinedVariables: [],
                errors: [{ type: "fatal", stage: "yaml-parsing", message: "bad yaml" }],
            });
        const { result } = renderHook(useComposeWorkspace, { wrapper });
        await act(async () => {
            await result.current.replace({
                kind: "yaml",
                yaml: "name: stable\nservices:\n  api:\n    image: node:22\n",
                importedFilename: "stable.yml",
            });
        });
        const previousSnapshot = result.current.snapshot;

        let outcome: Awaited<ReturnType<typeof result.current.replace>> | undefined;
        await act(async () => {
            outcome = await result.current.replace({
                kind: "yaml",
                yaml: "services: [",
                importedFilename: "broken.yml",
            });
        });

        expect(outcome).toEqual({ status: "rejected", generation: 2, reason: "parse", error: "bad yaml" });
        expect(result.current.snapshot.state).toBe(previousSnapshot.state);
        expect(result.current.snapshot.source).toBe(previousSnapshot.source);
        expect(result.current.snapshot.parserIssues).toBe(previousSnapshot.parserIssues);
    });

    it("selects the preferred Compose file and retains normalized directory files with explicit env precedence", async () => {
        parseAsync.mockResolvedValue({
            compose: { services: { app: { image: "nginx" } } },
            profiles: [],
            profileCounts: {},
            variables: ["TAG"],
            undefinedVariables: [],
            errors: [],
        });
        const file = (name: string, path: string, content: string) => ({
            name,
            webkitRelativePath: path,
            text: vi.fn().mockResolvedValue(content),
        });
        const files = [
            file("fragment.yml", "project/nested/../fragment.yml", "services:\n  ignored:\n    image: busybox\n"),
            file(".env", "project/.env", "TAG=from-file\nFILE_ONLY=present\n"),
            file("Dockerfile", "project/app/Dockerfile", "FROM nginx:alpine\n"),
            file("docker-compose.yml", "project/docker-compose.yml", "services:\n  app:\n    image: nginx\n"),
        ];
        const { result } = renderHook(useComposeWorkspace, { wrapper });
        await act(async () => {
            await result.current.configure({ environment: { TAG: "explicit" } });
            await result.current.replace({ kind: "files", files });
        });

        expect(parseAsync).toHaveBeenLastCalledWith(
            "services:\n  app:\n    image: nginx\n",
            expect.objectContaining({
                basePath: "project/docker-compose.yml",
                environment: { TAG: "explicit", FILE_ONLY: "present" },
                fileMap: {
                    "project/fragment.yml": "services:\n  ignored:\n    image: busybox\n",
                    "project/.env": "TAG=from-file\nFILE_ONLY=present\n",
                    "project/app/Dockerfile": "FROM nginx:alpine\n",
                    "project/docker-compose.yml": "services:\n  app:\n    image: nginx\n",
                },
            }),
        );
        expect(result.current.snapshot.environment).toEqual({ TAG: "explicit", FILE_ONLY: "present" });
        expect(result.current.snapshot.source).toEqual({
            kind: "files",
            importedFilename: "docker-compose.yml",
            basePath: "project/docker-compose.yml",
        });
    });

    it("keeps configuration intent visible when its reparse is rejected", async () => {
        parseAsync
            .mockResolvedValueOnce({
                compose: { services: { web: { image: "nginx" } } },
                profiles: ["debug"],
                profileCounts: { debug: 1 },
                variables: [],
                undefinedVariables: [],
                errors: [],
            })
            .mockResolvedValueOnce({
                compose: null,
                profiles: [],
                profileCounts: {},
                variables: [],
                undefinedVariables: [],
                errors: [{ type: "fatal", message: "reparse failed" }],
            });
        const { result } = renderHook(useComposeWorkspace, { wrapper });
        await act(async () => {
            await result.current.replace({ kind: "yaml", yaml: "services:\n  web:\n    image: nginx\n" });
        });
        const committedState = result.current.snapshot.state;

        let outcome: Awaited<ReturnType<typeof result.current.configure>> | undefined;
        await act(async () => {
            outcome = await result.current.configure({ activeProfiles: ["debug"] });
        });

        expect(outcome).toMatchObject({ status: "rejected", reason: "parse" });
        expect(result.current.snapshot.activeProfiles).toEqual(["debug"]);
        expect(result.current.snapshot.state).toBe(committedState);
        expect(localStorage.setItem).toHaveBeenCalledWith("docker-compose-active-profiles", '["debug"]');
    });

    it("uses the synchronous parser fallback with the same metadata and nonfatal enrichment path", async () => {
        parseAsync.mockRejectedValue(new Error("worker unavailable"));
        const { result } = renderHook(useComposeWorkspace, { wrapper });

        let outcome: Awaited<ReturnType<typeof result.current.replace>> | undefined;
        await act(async () => {
            outcome = await result.current.replace({
                kind: "yaml",
                yaml: [
                    "services:",
                    "  api:",
                    "    build: ./api",
                    "    image: ${TAG:-node:22}",
                    "    profiles: [debug]",
                    "",
                ].join("\n"),
            });
        });

        expect(outcome).toMatchObject({ status: "accepted", adapter: "fallback" });
        expect(result.current.snapshot).toMatchObject({
            profiles: ["debug"],
            profileCounts: { debug: 1 },
            variables: ["TAG"],
            processing: { adapter: "fallback", enrichment: "completed" },
        });
        expect(result.current.snapshot.state.services).toEqual({});
    });

    it("supersedes older parsing work when a newer replacement wins", async () => {
        let resolveFirst: ((value: Awaited<ReturnType<ParserWorkerClient["parseAsync"]>>) => void) | undefined;
        const firstResult = new Promise<Awaited<ReturnType<ParserWorkerClient["parseAsync"]>>>((resolve) => {
            resolveFirst = resolve;
        });
        parseAsync
            .mockImplementationOnce(() => firstResult)
            .mockResolvedValueOnce({
                compose: { name: "new", services: { new: { image: "nginx" } } },
                profiles: [],
                profileCounts: {},
                variables: [],
                undefinedVariables: [],
                errors: [],
            });
        const { result } = renderHook(useComposeWorkspace, { wrapper });
        let newer: Awaited<ReturnType<typeof result.current.replace>> | undefined;
        let olderOutcome: Awaited<ReturnType<typeof result.current.replace>> | undefined;
        await act(async () => {
            const older = result.current.replace({ kind: "yaml", yaml: "name: old\nservices: {}\n" });
            while (parseAsync.mock.calls.length < 1) await Promise.resolve();
            const latest = result.current.replace({ kind: "yaml", yaml: "name: new\nservices: {}\n" });
            while (parseAsync.mock.calls.length < 2) await Promise.resolve();
            resolveFirst?.({
                compose: { name: "old", services: { old: { image: "busybox" } } },
                profiles: [],
                profileCounts: {},
                variables: [],
                undefinedVariables: [],
                errors: [],
            });
            [newer, olderOutcome] = await Promise.all([latest, older]);
        });

        expect(newer).toMatchObject({ status: "accepted", generation: 2 });
        expect(olderOutcome).toEqual({ status: "superseded", generation: 1 });
        expect(result.current.snapshot.state.name).toBe("new");
        expect(result.current.snapshot.source?.importedFilename).toBe("docker-compose.yml");
    });

    it("does not let in-flight work repopulate a cleared workspace", async () => {
        let resolveParse: ((value: Awaited<ReturnType<ParserWorkerClient["parseAsync"]>>) => void) | undefined;
        parseAsync.mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolveParse = resolve;
                }),
        );
        const { result } = renderHook(useComposeWorkspace, { wrapper });
        let outcome: Awaited<ReturnType<typeof result.current.replace>> | undefined;

        await act(async () => {
            const pending = result.current.replace({ kind: "yaml", yaml: "name: late\nservices: {}\n" });
            while (parseAsync.mock.calls.length < 1) await Promise.resolve();
            result.current.clear();
            resolveParse?.({
                compose: { name: "late", services: { late: { image: "busybox" } } },
                profiles: [],
                profileCounts: {},
                variables: [],
                undefinedVariables: [],
                errors: [],
            });
            outcome = await pending;
        });

        expect(outcome).toEqual({ status: "superseded", generation: 1 });
        expect(result.current.snapshot.state).toEqual({
            name: "",
            services: {},
            networks: {},
            volumes: {},
            secrets: {},
            configs: {},
        });
        expect(result.current.snapshot.source).toBeNull();
    });

    it("restores compatible storage and clears all workspace data", () => {
        vi.mocked(localStorage.getItem).mockImplementation((key) => {
            if (key === "docker-compose-state") {
                return JSON.stringify({ name: "saved", services: { db: { image: "postgres" } } });
            }
            if (key === "docker-compose-active-profiles") return '["debug",3]';
            if (key === "docker-compose-environment") return '{"TAG":"saved","BAD":3}';
            return null;
        });
        const { result } = renderHook(useComposeWorkspace, { wrapper });

        expect(result.current.snapshot.state).toMatchObject({
            name: "saved",
            services: { db: { image: "postgres" } },
        });
        expect(result.current.snapshot.activeProfiles).toEqual(["debug"]);
        expect(result.current.snapshot.environment).toEqual({ TAG: "saved" });

        act(() => result.current.clear());

        expect(result.current.snapshot.state).toEqual({
            name: "",
            services: {},
            networks: {},
            volumes: {},
            secrets: {},
            configs: {},
        });
        expect(result.current.snapshot.activeProfiles).toEqual([]);
        expect(result.current.snapshot.environment).toEqual({});
        expect(result.current.snapshot.source).toBeNull();
    });

    it("downloads current YAML with the compatible filename", () => {
        const createObjectURL = vi.fn(() => "blob:yaml");
        const revokeObjectURL = vi.fn();
        Object.defineProperties(URL, {
            createObjectURL: { configurable: true, value: createObjectURL },
            revokeObjectURL: { configurable: true, value: revokeObjectURL },
        });
        let downloadedFilename = "";
        const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
            this: HTMLAnchorElement,
        ) {
            downloadedFilename = this.download;
        });
        const { result } = renderHook(useComposeWorkspace, { wrapper });

        act(() => result.current.downloadYaml());

        expect(downloadedFilename).toBe("docker-compose.yml");
        expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
        expect(revokeObjectURL).toHaveBeenCalledWith("blob:yaml");
        click.mockRestore();
    });
});
