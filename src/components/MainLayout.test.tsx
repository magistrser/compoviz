import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "../test/utils";
import MainLayout from "./MainLayout";

// Mock lazy-loaded components
vi.mock("./VisualBuilder", () => ({
    default: () => <div data-testid="visual-builder">Visual Builder</div>,
}));

vi.mock("./CompareView", () => ({
    default: () => <div data-testid="compare-view">Compare View</div>,
}));

vi.mock("../features/diagram/RenderedArchitectureDiagram", () => ({
    RenderedArchitectureDiagram: ({ ariaLabel }: { ariaLabel: string }) => (
        <div
            role="img"
            aria-label={ariaLabel}
        >
            Diagram View
        </div>
    ),
}));

describe("MainLayout Component", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders header with app name and logo", () => {
        render(<MainLayout />);

        expect(screen.getByText("Compoviz")).toBeInTheDocument();
        expect(screen.getByAltText(/logo/i)).toBeInTheDocument();
    });

    it("uses the canonical repository for GitHub actions", () => {
        render(<MainLayout />);

        expect(screen.getByLabelText("View on GitHub")).toHaveAttribute(
            "href",
            "https://github.com/magistrser/compoviz",
        );
        expect(screen.getByTitle("Star on GitHub")).toHaveAttribute("href", "https://github.com/magistrser/compoviz");
        expect(screen.getByTitle("Report an issue or request a feature")).toHaveAttribute(
            "href",
            "https://github.com/magistrser/compoviz/issues",
        );
        expect(screen.getByAltText("GitHub stars")).toHaveAttribute(
            "src",
            "https://img.shields.io/github/stars/magistrser/compoviz?style=social",
        );
    });

    it("shows view switcher buttons", () => {
        render(<MainLayout />);

        expect(screen.getByText("Editor")).toBeInTheDocument();
        expect(screen.getByText("Build")).toBeInTheDocument();
        expect(screen.getByText("View")).toBeInTheDocument();
        expect(screen.getByText("Compare")).toBeInTheDocument();
    });

    it("shows undo/redo buttons", () => {
        render(<MainLayout />);

        expect(screen.getByTitle(/undo/i)).toBeInTheDocument();
        expect(screen.getByTitle(/redo/i)).toBeInTheDocument();
    });

    it("shows search input", () => {
        render(<MainLayout />);

        const searchInput = screen.getByPlaceholderText(/search resources/i);
        expect(searchInput).toBeInTheDocument();
    });

    it("displays sidebar with resource tree", () => {
        render(<MainLayout />);

        expect(screen.getByText("Services")).toBeInTheDocument();
        expect(screen.getByText("Networks")).toBeInTheDocument();
        expect(screen.getByText("Volumes")).toBeInTheDocument();
    });

    it("shows Add Service button", () => {
        render(<MainLayout />);

        expect(screen.getByText("Add Service")).toBeInTheDocument();
    });

    it("shows From Template button", () => {
        render(<MainLayout />);

        expect(screen.getByText("From Template")).toBeInTheDocument();
    });

    it("switches to Build view when Build button clicked", async () => {
        render(<MainLayout />);

        const buildButton = screen.getByText("Build");
        fireEvent.click(buildButton);

        await waitFor(() => {
            expect(screen.getByTestId("visual-builder")).toBeInTheDocument();
        });
    });

    it("switches to Diagram view when View button clicked", async () => {
        render(<MainLayout />);

        const viewButton = screen.getByText("View");
        fireEvent.click(viewButton);

        await waitFor(() => {
            expect(screen.getByRole("img", { name: "Docker Compose architecture diagram" })).toBeInTheDocument();
        });
    });

    it("switches to Compare view when Compare button clicked", async () => {
        render(<MainLayout />);

        const compareButton = screen.getByText("Compare");
        fireEvent.click(compareButton);

        await waitFor(() => {
            expect(screen.getByTestId("compare-view")).toBeInTheDocument();
        });
    });

    it("shows Editor view by default", () => {
        render(<MainLayout />);

        // Editor view should show the empty state hero
        expect(screen.getByText(/Docker Compose, visualized/i)).toBeInTheDocument();
    });

    it("shows file drag and drop area in Editor view", () => {
        render(<MainLayout />);

        expect(screen.getByText(/drag & drop/i)).toBeInTheDocument();
    });

    it("shows project name input in sidebar", () => {
        render(<MainLayout />);

        const projectInput = screen.getByPlaceholderText<HTMLInputElement>(/project name/i);
        expect(projectInput).toBeInTheDocument();
    });

    it("allows typing in project name input", () => {
        render(<MainLayout />);

        const projectInput = screen.getByPlaceholderText<HTMLInputElement>(/project name/i);
        fireEvent.change(projectInput, { target: { value: "My Project" } });

        expect(projectInput.value).toBe("My Project");
    });

    it("leaves resources unchanged when sidebar naming is cancelled", async () => {
        const user = userEvent.setup();
        render(<MainLayout />);

        await user.click(screen.getByRole("button", { name: "Add Service" }));
        const dialog = screen.getByRole("dialog", { name: "Add service" });
        await user.type(within(dialog).getByRole("textbox", { name: "Service name" }), "api");
        await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

        expect(screen.queryByText("api")).not.toBeInTheDocument();
        expect(screen.getByTitle(/undo/i)).toBeDisabled();
    });

    it("preserves the project when clearing is cancelled", async () => {
        const user = userEvent.setup();
        render(<MainLayout />);
        const projectInput = screen.getByPlaceholderText<HTMLInputElement>(/project name/i);
        await user.type(projectInput, "Keep me");

        await user.click(screen.getByRole("button", { name: "Clear All" }));
        const dialog = screen.getByRole("dialog", { name: "Clear all configuration?" });
        await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

        expect(projectInput).toHaveValue("Keep me");
    });

    it("shows Clear All button", () => {
        render(<MainLayout />);

        expect(screen.getByText("Clear All")).toBeInTheDocument();
    });

    it("shows Docker Compose spec compliance badge", () => {
        render(<MainLayout />);

        expect(screen.getByText(/compose spec/i)).toBeInTheDocument();
    });

    it("shows code preview panel in Editor view on desktop", () => {
        render(<MainLayout />);

        // Code preview should be rendered (may appear multiple times on mobile/desktop)
        const codeHeaders = screen.queryAllByText(/docker-compose.yml/i);
        expect(codeHeaders.length).toBeGreaterThan(0);
    });
});
