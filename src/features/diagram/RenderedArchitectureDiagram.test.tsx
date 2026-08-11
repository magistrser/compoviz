import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderDot, resetGraphviz } from "../../utils/graphvizRenderer";
import { RenderedArchitectureDiagram } from "./RenderedArchitectureDiagram";

vi.mock("../../utils/graphvizRenderer", () => ({
    renderDot: vi.fn(),
    resetGraphviz: vi.fn(),
}));

const safeSvg = (title = "service") => `
    <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
        <g class="node"><title>${title}</title><rect width="10" height="10" /></g>
    </svg>
`;

describe("RenderedArchitectureDiagram", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(renderDot).mockResolvedValue(safeSvg());
    });

    it("sanitizes SVG before insertion and renders an optional overlay", async () => {
        vi.mocked(renderDot).mockResolvedValue(`
            <svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)">
                <script>alert(1)</script>
                <a href="javascript:alert(1)"><text>unsafe</text></a>
            </svg>
        `);
        const { container } = render(
            <RenderedArchitectureDiagram
                dot="digraph safe {}"
                ariaLabel="Architecture diagram"
                overlay={<div>Domain overlay</div>}
            />,
        );

        await waitFor(() => expect(container.querySelector("svg")).not.toBeNull());
        const svg = container.querySelector("svg");
        expect(svg?.querySelector("script")).toBeNull();
        expect(svg?.hasAttribute("onload")).toBe(false);
        expect(svg?.querySelector("a")?.hasAttribute("href")).toBe(false);
        expect(screen.getByText("Domain overlay")).toBeInTheDocument();
        expect(screen.getByRole("img", { name: "Architecture diagram" })).toBeInTheDocument();
    });

    it("shows an error instead of inserting malformed or non-SVG output", async () => {
        vi.mocked(renderDot).mockResolvedValue("<not-svg>content</not-svg>");
        const { container } = render(
            <RenderedArchitectureDiagram
                dot="digraph malformed {}"
                ariaLabel="Malformed diagram"
            />,
        );

        expect(await screen.findByText("Diagram Rendering Failed")).toBeInTheDocument();
        expect(container.querySelector('[data-testid="diagram-transform"] svg')).toBeNull();
    });

    it("keeps only the latest DOT result when renders finish out of order", async () => {
        let resolveOld: ((svg: string) => void) | undefined;
        let resolveNew: ((svg: string) => void) | undefined;
        vi.mocked(renderDot)
            .mockImplementationOnce(
                () =>
                    new Promise((resolve) => {
                        resolveOld = resolve;
                    }),
            )
            .mockImplementationOnce(
                () =>
                    new Promise((resolve) => {
                        resolveNew = resolve;
                    }),
            );
        const { container, rerender } = render(
            <RenderedArchitectureDiagram
                dot="old"
                ariaLabel="Diagram"
            />,
        );
        expect(screen.getByText("Loading diagram...")).toBeInTheDocument();
        rerender(
            <RenderedArchitectureDiagram
                dot="new"
                ariaLabel="Diagram"
            />,
        );

        await act(async () => resolveNew?.(safeSvg("new-service")));
        await waitFor(() => expect(container.querySelector("title")?.textContent).toBe("new-service"));
        await act(async () => resolveOld?.(safeSvg("old-service")));
        expect(container.querySelector("title")?.textContent).toBe("new-service");
    });

    it("activates opaque node ids and removes native node listeners on replacement", async () => {
        const onNodeActivate = vi.fn();
        const { container, rerender } = render(
            <RenderedArchitectureDiagram
                dot="first"
                ariaLabel="Diagram"
                onNodeActivate={onNodeActivate}
            />,
        );
        await waitFor(() => expect(container.querySelector(".node")).not.toBeNull());
        const oldNode = container.querySelector<SVGGElement>(".node");
        if (!oldNode) throw new Error("Expected a rendered node");
        const removeListener = vi.spyOn(oldNode, "removeEventListener");
        fireEvent.click(oldNode);
        expect(onNodeActivate).toHaveBeenCalledWith("service");

        vi.mocked(renderDot).mockResolvedValue(safeSvg("replacement"));
        rerender(
            <RenderedArchitectureDiagram
                dot="second"
                ariaLabel="Diagram"
                onNodeActivate={onNodeActivate}
            />,
        );
        await waitFor(() => expect(container.querySelector("title")?.textContent).toBe("replacement"));
        expect(removeListener).toHaveBeenCalledWith("click", expect.any(Function));
    });

    it("uses shared zoom bounds and resets to a centered scale of one", async () => {
        const { container } = render(
            <RenderedArchitectureDiagram
                dot="diagram"
                ariaLabel="Navigable diagram"
            />,
        );
        await waitFor(() => expect(container.querySelector(".node title")?.textContent).toBe("service"));
        const transform = screen.getByTestId("diagram-transform");

        for (let index = 0; index < 30; index += 1) fireEvent.click(screen.getByTitle("Zoom In"));
        expect(transform).toHaveStyle({ transform: "translate(0px, 0px) scale(3)" });

        for (let index = 0; index < 40; index += 1) fireEvent.click(screen.getByTitle("Zoom Out"));
        expect(transform).toHaveStyle({ transform: "translate(0px, 0px) scale(0.3)" });

        fireEvent.mouseDown(screen.getByRole("img", { name: "Navigable diagram" }), {
            button: 0,
            clientX: 10,
            clientY: 10,
        });
        fireEvent.mouseMove(window, { clientX: 40, clientY: 50 });
        fireEvent.mouseUp(window);
        fireEvent.click(screen.getByTitle("Reset View"));
        expect(transform).toHaveStyle({ transform: "translate(0px, 0px) scale(1)" });
    });

    it("fits and recenters the current SVG within the shared zoom bounds", async () => {
        const { container } = render(
            <RenderedArchitectureDiagram
                dot="diagram"
                ariaLabel="Fittable diagram"
            />,
        );
        await waitFor(() => expect(container.querySelector("svg")).not.toBeNull());
        const viewport = screen.getByRole("img", { name: "Fittable diagram" });
        const svg = container.querySelector<SVGSVGElement>("svg");
        if (!svg) throw new Error("Expected a rendered SVG");
        Object.defineProperty(viewport, "clientWidth", { configurable: true, value: 600 });
        Object.defineProperty(viewport, "clientHeight", { configurable: true, value: 400 });
        Object.defineProperty(svg, "getBBox", {
            configurable: true,
            value: () => ({ width: 300, height: 200, x: 0, y: 0 }),
        });

        fireEvent.click(screen.getByTitle("Fit to Screen"));

        expect(screen.getByTestId("diagram-transform")).toHaveStyle({
            transform: "translate(0px, 0px) scale(1.68)",
        });
    });

    it("sanitizes again on export and uses the fixed filename", async () => {
        let downloadedBlob: Blob | undefined;
        let downloadedName: string | undefined;
        vi.stubGlobal(
            "URL",
            Object.assign(URL, {
                createObjectURL: vi.fn((blob: Blob) => {
                    downloadedBlob = blob;
                    return "blob:diagram";
                }),
                revokeObjectURL: vi.fn(),
            }),
        );
        vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function captureDownload(
            this: HTMLAnchorElement,
        ) {
            downloadedName = this.download;
        });
        const { container } = render(
            <RenderedArchitectureDiagram
                dot="diagram"
                ariaLabel="Exportable diagram"
            />,
        );
        await waitFor(() => expect(container.querySelector("svg")).not.toBeNull());
        const svg = container.querySelector("svg");
        svg?.setAttribute("onload", "alert(1)");
        svg?.appendChild(document.createElementNS("http://www.w3.org/2000/svg", "script"));

        fireEvent.click(screen.getByTitle("Download SVG"));

        expect(downloadedName).toBe("docker-compose-diagram.svg");
        expect(downloadedBlob).toBeDefined();
        const exported = await downloadedBlob?.text();
        expect(exported).not.toContain("onload");
        expect(exported).not.toContain("<script");
    });

    it("resets the Graphviz runtime on final cleanup", () => {
        const { unmount } = render(
            <RenderedArchitectureDiagram
                dot="diagram"
                ariaLabel="Diagram"
            />,
        );
        unmount();
        expect(resetGraphviz).toHaveBeenCalledOnce();
    });
});
