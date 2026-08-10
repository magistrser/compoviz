import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ComposeProvider, useCompose } from "./useCompose";
import { createParserWorker } from "../utils/workerManager";

vi.mock("../utils/workerManager", () => ({
    createParserWorker: vi.fn(),
}));

function ComposeProbe() {
    const { state, loadFiles } = useCompose();
    const serviceNames = Object.keys(state.services).join(",");

    return (
        <div>
            <output aria-label="project-name">{state.name}</output>
            <output aria-label="service-names">{serviceNames}</output>
            <button
                type="button"
                onClick={() => void loadFiles("services:\n  fallback:\n    image: nginx")}
            >
                Import
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
});
