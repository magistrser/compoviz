import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from ".";

vi.mock("@vercel/analytics/react", () => ({
    Analytics: () => <div data-testid="vercel-analytics" />,
}));

describe("App", () => {
    it("retains the configured Vercel analytics integration", () => {
        render(<App />);

        expect(screen.getByTestId("vercel-analytics")).toBeInTheDocument();
    });
});
