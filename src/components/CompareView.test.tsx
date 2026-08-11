import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "../test/utils";
import CompareView from "../components/CompareView";

// Mock the worker
vi.mock("../utils/graphvizRenderer", () => ({
    renderDot: vi.fn().mockResolvedValue('<svg width="100" height="100"></svg>'),
    resetGraphviz: vi.fn(),
}));

describe("CompareView Component", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders without crashing", () => {
        const { container } = render(<CompareView />);
        expect(container).toBeTruthy();
    });

    it("shows some UI elements", () => {
        const { container } = render(<CompareView />);

        // Should have some content
        expect(container.textContent.length).toBeGreaterThan(0);
    });

    it("has expected structure", () => {
        const { container } = render(<CompareView />);

        // Should render div elements
        const divs = container.querySelectorAll("div");
        expect(divs.length).toBeGreaterThan(0);
    });

    it("reports parsing rejection without admitting a project", async () => {
        const { container } = render(<CompareView />);
        const input = container.querySelector<HTMLInputElement>('input[type="file"]');
        expect(input).not.toBeNull();

        fireEvent.change(input!, {
            target: { files: [new File(["invalid: ["], "broken.yml", { type: "application/yaml" })] },
        });

        expect(await screen.findByText(/Failed to parse broken\.yml/)).toBeInTheDocument();
        expect(
            screen.getByText(
                "Drop up to 3 Docker Compose files here to analyze conflicts and dependencies across projects.",
            ),
        ).toBeInTheDocument();
    });

    it("reports capacity before parsing a fourth admission", async () => {
        const { container } = render(<CompareView />);
        const input = container.querySelector<HTMLInputElement>('input[type="file"]');
        expect(input).not.toBeNull();

        for (const name of ["one", "two", "three"]) {
            fireEvent.change(input!, {
                target: {
                    files: [new File([`name: ${name}\nservices: {}`], `${name}.yml`, { type: "application/yaml" })],
                },
            });
            await waitFor(() => expect(screen.getByText(name)).toBeInTheDocument());
        }

        fireEvent.change(input!, {
            target: { files: [new File(["invalid: ["], "four.yml", { type: "application/yaml" })] },
        });

        expect(
            await screen.findByText("Maximum of 3 projects allowed. Please remove a project first."),
        ).toBeInTheDocument();
        expect(screen.queryByText(/Failed to parse four\.yml/)).not.toBeInTheDocument();
    });

    it("uses the shared diagram controls for a comparison", async () => {
        const { container } = render(<CompareView />);
        const input = container.querySelector<HTMLInputElement>('input[type="file"]');
        expect(input).not.toBeNull();

        for (const name of ["one", "two"]) {
            fireEvent.change(input!, {
                target: {
                    files: [new File([`name: ${name}\nservices: {}`], `${name}.yml`, { type: "application/yaml" })],
                },
            });
            await waitFor(() => expect(screen.getByText(name)).toBeInTheDocument());
        }

        expect(screen.getByRole("img", { name: "Combined project architecture diagram" })).toBeInTheDocument();
        expect(screen.getByTitle("Zoom In")).toBeInTheDocument();
        expect(screen.getByTitle("Zoom Out")).toBeInTheDocument();
        expect(screen.getByTitle("Fit to Screen")).toBeInTheDocument();
        expect(screen.getByTitle("Reset View")).toBeInTheDocument();
        expect(screen.getByTitle("Download SVG")).toBeInTheDocument();
    });
});
