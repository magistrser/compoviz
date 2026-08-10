import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ComposeProvider, useCompose } from "./useCompose";
import { createParserWorker } from "../utils/workerManager";

vi.mock("../utils/workerManager", () => ({
    createParserWorker: vi.fn(),
}));

function ComposeProbe() {
    const {
        state,
        profiles,
        activeProfiles,
        profileCounts,
        environment,
        variables,
        undefinedVariables,
        parserErrors,
        loadFiles,
        resetProject,
    } = useCompose();
    const serviceNames = Object.keys(state.services).join(",");

    return (
        <div>
            <output aria-label="project-name">{state.name}</output>
            <output aria-label="service-names">{serviceNames}</output>
            <output aria-label="profiles">{profiles.join(",")}</output>
            <output aria-label="active-profiles">{activeProfiles.join(",")}</output>
            <output aria-label="profile-counts">{JSON.stringify(profileCounts)}</output>
            <output aria-label="environment">{JSON.stringify(environment)}</output>
            <output aria-label="variables">{variables.join(",")}</output>
            <output aria-label="undefined-variables">{undefinedVariables.join(",")}</output>
            <output aria-label="parser-errors">{parserErrors.map((error) => error.message).join(",")}</output>
            <button
                type="button"
                onClick={() => void loadFiles("services:\n  fallback:\n    image: nginx")}
            >
                Import
            </button>
            <button
                type="button"
                onClick={resetProject}
            >
                Reset
            </button>
        </div>
    );
}

describe("ComposeProvider compatibility", () => {
    afterEach(() => {
        vi.mocked(localStorage.getItem).mockReset();
        vi.mocked(createParserWorker).mockReset();
    });

    it("restores the existing persisted state shape and storage key", async () => {
        vi.mocked(localStorage.getItem).mockImplementation((key) =>
            key === "docker-compose-state"
                ? JSON.stringify({
                      name: "persisted-project",
                      services: { web: { image: "nginx:alpine" } },
                      networks: {},
                      volumes: {},
                      secrets: {},
                      configs: {},
                  })
                : null,
        );

        render(
            <ComposeProvider>
                <ComposeProbe />
            </ComposeProvider>,
        );

        expect(await screen.findByText("persisted-project")).toBeInTheDocument();
        expect(screen.getByLabelText("service-names")).toHaveTextContent("web");
    });

    it("falls back to synchronous parsing when the parser worker fails", async () => {
        const terminate = vi.fn();
        vi.mocked(createParserWorker).mockReturnValue({
            parseAsync: vi.fn().mockRejectedValue(new Error("worker unavailable")),
            terminate,
        });

        render(
            <ComposeProvider>
                <ComposeProbe />
            </ComposeProvider>,
        );

        fireEvent.click(screen.getByRole("button", { name: "Import" }));

        await waitFor(() => {
            expect(screen.getByLabelText("service-names")).toHaveTextContent("fallback");
        });
        expect(terminate).toHaveBeenCalledOnce();
    });

    it("resets project and parser state without opening a browser confirmation", async () => {
        vi.mocked(localStorage.getItem).mockImplementation((key) => {
            if (key === "docker-compose-active-profiles") return JSON.stringify(["dev"]);
            if (key === "docker-compose-environment") return JSON.stringify({ TAG: "latest" });
            return null;
        });
        vi.mocked(globalThis.confirm).mockClear();
        vi.mocked(globalThis.confirm).mockReturnValue(false);
        vi.mocked(createParserWorker).mockReturnValue({
            parseAsync: vi.fn().mockResolvedValue({
                compose: {
                    name: "loaded-project",
                    services: { api: { image: "nginx" } },
                    networks: {},
                    volumes: {},
                    secrets: {},
                    configs: {},
                },
                profiles: ["worker-profile"],
                profileCounts: { "worker-profile": 1 },
                variables: ["TAG"],
                undefinedVariables: ["MISSING"],
                errors: [{ type: "warning", message: "Missing variable", stage: "variable-validation" }],
            }),
            terminate: vi.fn(),
        });

        render(
            <ComposeProvider>
                <ComposeProbe />
            </ComposeProvider>,
        );

        await waitFor(() => {
            expect(screen.getByLabelText("active-profiles")).toHaveTextContent("dev");
            expect(screen.getByLabelText("environment")).toHaveTextContent('{"TAG":"latest"}');
        });
        fireEvent.click(screen.getByRole("button", { name: "Import" }));
        await waitFor(() => {
            expect(screen.getByLabelText("service-names")).toHaveTextContent("api");
            expect(screen.getByLabelText("profiles")).toHaveTextContent("worker-profile");
            expect(screen.getByLabelText("profile-counts")).toHaveTextContent('{"worker-profile":1}');
            expect(screen.getByLabelText("variables")).toHaveTextContent("TAG");
            expect(screen.getByLabelText("undefined-variables")).toHaveTextContent("MISSING");
            expect(screen.getByLabelText("parser-errors")).toHaveTextContent("Missing variable");
        });

        fireEvent.click(screen.getByRole("button", { name: "Reset" }));

        await waitFor(() => {
            expect(screen.getByLabelText("service-names")).toBeEmptyDOMElement();
            expect(screen.getByLabelText("profiles")).toBeEmptyDOMElement();
            expect(screen.getByLabelText("active-profiles")).toBeEmptyDOMElement();
            expect(screen.getByLabelText("profile-counts")).toHaveTextContent("{}");
            expect(screen.getByLabelText("environment")).toHaveTextContent("{}");
            expect(screen.getByLabelText("variables")).toBeEmptyDOMElement();
            expect(screen.getByLabelText("undefined-variables")).toBeEmptyDOMElement();
            expect(screen.getByLabelText("parser-errors")).toBeEmptyDOMElement();
        });
        expect(globalThis.confirm).not.toHaveBeenCalled();
    });
});
