import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from ".";

vi.mock("@vercel/analytics/react", () => ({
    Analytics: () => <div data-testid="vercel-analytics" />,
}));

describe("App", () => {
    beforeEach(() => {
        window.history.replaceState({}, "", "/");
    });

    it("retains the configured Vercel analytics integration", () => {
        render(<App />);

        expect(screen.getByTestId("vercel-analytics")).toBeInTheDocument();
    });

    it("renders the workspace beneath a repository-scoped deployment path", async () => {
        window.history.replaceState({}, "", "/compoviz/");

        render(<App basename="/compoviz/" />);

        expect(await screen.findByRole("heading", { name: "Compoviz" })).toBeInTheDocument();
    });
});
