import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { AppRoutes } from ".";

vi.mock("../../pages/home", () => ({
    default: () => <h1>Compoviz workspace</h1>,
}));

describe("AppRoutes", () => {
    it("composes the workspace at the root route", async () => {
        render(
            <MemoryRouter initialEntries={["/"]}>
                <AppRoutes />
            </MemoryRouter>,
        );

        expect(await screen.findByRole("heading", { name: "Compoviz workspace" })).toBeInTheDocument();
    });
});
