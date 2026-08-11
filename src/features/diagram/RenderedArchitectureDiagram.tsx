import {
    memo,
    useCallback,
    useEffect,
    useRef,
    useState,
    type MouseEvent as ReactMouseEvent,
    type ReactNode,
} from "react";
import { AlertCircle, Download, Maximize, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { renderDot, resetGraphviz } from "../../utils/graphvizRenderer";
import { sanitizeSvg } from "../../utils/sanitizeSvg";

const MIN_SCALE = 0.3;
const MAX_SCALE = 3;
const SCALE_STEP = 0.2;

interface Position {
    readonly x: number;
    readonly y: number;
}

export interface RenderedArchitectureDiagramProps {
    readonly dot: string;
    readonly overlay?: ReactNode;
    readonly ariaLabel: string;
    readonly onNodeActivate?: (nodeId: string) => void;
}

function clampScale(scale: number): number {
    return Math.min(Math.max(scale, MIN_SCALE), MAX_SCALE);
}

function readSvgSize(svg: SVGSVGElement): { width: number; height: number } {
    try {
        if (typeof svg.getBBox === "function") {
            const bbox = svg.getBBox();
            if (bbox.width && bbox.height) return { width: bbox.width, height: bbox.height };
        }
    } catch {
        // Detached SVGs and test DOMs may not support getBBox.
    }

    const viewBox = svg.viewBox?.baseVal;
    if (viewBox?.width && viewBox.height) return { width: viewBox.width, height: viewBox.height };
    return {
        width: Number.parseFloat(svg.getAttribute("width") ?? "0"),
        height: Number.parseFloat(svg.getAttribute("height") ?? "0"),
    };
}

function isSvg(element: Element | null): element is SVGSVGElement {
    return element?.localName === "svg";
}

export const RenderedArchitectureDiagram = memo(
    ({ dot, overlay, ariaLabel, onNodeActivate }: RenderedArchitectureDiagramProps) => {
        const viewportRef = useRef<HTMLDivElement>(null);
        const containerRef = useRef<HTMLDivElement>(null);
        const svgRef = useRef<SVGSVGElement>(null);
        const activationRef = useRef(onNodeActivate);
        const renderGenerationRef = useRef(0);
        const nodeListenerCleanupsRef = useRef<Array<() => void>>([]);
        const [scale, setScale] = useState(1);
        const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
        const [dragging, setDragging] = useState(false);
        const [loading, setLoading] = useState(true);
        const [error, setError] = useState<string | null>(null);
        const scaleRef = useRef(scale);
        const positionRef = useRef(position);
        const dragStartRef = useRef<Position>({ x: 0, y: 0 });

        useEffect(() => {
            activationRef.current = onNodeActivate;
        }, [onNodeActivate]);

        const removeNodeListeners = useCallback(() => {
            nodeListenerCleanupsRef.current.forEach((cleanup) => cleanup());
            nodeListenerCleanupsRef.current = [];
        }, []);

        useEffect(() => {
            const generation = ++renderGenerationRef.current;
            const container = containerRef.current;
            if (!container) return;

            removeNodeListeners();
            setError(null);
            setLoading(true);

            const render = async () => {
                try {
                    if (!dot) throw new Error("Diagram source is empty");
                    const rendered = await renderDot(dot);
                    if (generation !== renderGenerationRef.current || !container.isConnected) return;
                    const sanitized = sanitizeSvg(rendered);
                    if (!isSvg(sanitized)) throw new Error("Graphviz returned invalid SVG output");

                    sanitized.style.width = "100%";
                    sanitized.style.height = "100%";
                    sanitized.style.maxWidth = "none";
                    sanitized.style.maxHeight = "none";
                    container.replaceChildren(sanitized);
                    svgRef.current = sanitized;

                    sanitized.querySelectorAll<SVGGElement>(".node").forEach((node) => {
                        const activate = () => {
                            const nodeId = node.querySelector("title")?.textContent;
                            if (nodeId) activationRef.current?.(nodeId);
                        };
                        if (activationRef.current) node.style.cursor = "pointer";
                        node.addEventListener("click", activate);
                        nodeListenerCleanupsRef.current.push(() => node.removeEventListener("click", activate));
                    });
                    setLoading(false);
                } catch (renderError) {
                    if (generation !== renderGenerationRef.current) return;
                    removeNodeListeners();
                    container.replaceChildren();
                    svgRef.current = null;
                    setError(renderError instanceof Error ? renderError.message : String(renderError));
                    setLoading(false);
                }
            };
            void render();

            return () => {
                if (generation === renderGenerationRef.current) renderGenerationRef.current += 1;
                removeNodeListeners();
            };
        }, [dot, removeNodeListeners]);

        useEffect(
            () => () => {
                renderGenerationRef.current += 1;
                removeNodeListeners();
                resetGraphviz();
            },
            [removeNodeListeners],
        );

        useEffect(() => {
            scaleRef.current = scale;
            positionRef.current = position;
        }, [position, scale]);

        const clampPosition = useCallback((next: Position, nextScale: number): Position => {
            const viewport = viewportRef.current;
            const svg = svgRef.current;
            if (!viewport || !svg) return next;
            const size = readSvgSize(svg);
            const width = size.width || viewport.clientWidth;
            const height = size.height || viewport.clientHeight;
            const paddingX = Math.max(120, viewport.clientWidth * 0.4);
            const paddingY = Math.max(120, viewport.clientHeight * 0.4);
            const maxX = Math.max(paddingX, (width * nextScale - viewport.clientWidth) / 2 + paddingX);
            const maxY = Math.max(paddingY, (height * nextScale - viewport.clientHeight) / 2 + paddingY);
            return {
                x: Math.min(Math.max(next.x, -maxX), maxX),
                y: Math.min(Math.max(next.y, -maxY), maxY),
            };
        }, []);

        const updateScale = useCallback(
            (next: (current: number) => number) => {
                setScale((current) => {
                    const updated = clampScale(next(current));
                    setPosition((currentPosition) => clampPosition(currentPosition, updated));
                    return updated;
                });
            },
            [clampPosition],
        );

        const resetView = useCallback(() => {
            setScale(1);
            setPosition({ x: 0, y: 0 });
        }, []);

        const fitToScreen = useCallback(() => {
            const viewport = viewportRef.current;
            const svg = svgRef.current;
            if (!viewport || !svg) return;
            const renderedBounds = svg.getBoundingClientRect();
            const currentScale = scaleRef.current;
            const renderedWidth = renderedBounds.width > 0 ? renderedBounds.width / currentScale : 0;
            const renderedHeight = renderedBounds.height > 0 ? renderedBounds.height / currentScale : 0;
            const fallbackSize = readSvgSize(svg);
            const width = renderedWidth || fallbackSize.width;
            const height = renderedHeight || fallbackSize.height;
            if (!width || !height) return resetView();
            const availableWidth = Math.max(viewport.clientWidth - 64, 1);
            const availableHeight = Math.max(viewport.clientHeight - 64, 1);
            const nextScale = clampScale(Math.min(availableWidth / width, availableHeight / height));
            setScale(nextScale);
            setPosition({ x: 0, y: 0 });
        }, [resetView]);

        const downloadSvg = useCallback(() => {
            const svg = svgRef.current;
            if (!svg) return;
            const serialized = new XMLSerializer().serializeToString(svg);
            const sanitized = sanitizeSvg(serialized);
            if (!isSvg(sanitized)) {
                setError("Failed to sanitize SVG export");
                return;
            }
            const safeSvg = new XMLSerializer().serializeToString(sanitized);
            const blob = new Blob([safeSvg], { type: "image/svg+xml;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "docker-compose-diagram.svg";
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        }, []);

        const handleMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
            if (event.button !== 0) return;
            event.preventDefault();
            setDragging(true);
            dragStartRef.current = {
                x: event.clientX - positionRef.current.x,
                y: event.clientY - positionRef.current.y,
            };
        };

        useEffect(() => {
            if (!dragging) return;
            const handleMove = (event: MouseEvent) => {
                const next = {
                    x: event.clientX - dragStartRef.current.x,
                    y: event.clientY - dragStartRef.current.y,
                };
                setPosition(clampPosition(next, scaleRef.current));
            };
            const handleUp = () => setDragging(false);
            window.addEventListener("mousemove", handleMove);
            window.addEventListener("mouseup", handleUp);
            return () => {
                window.removeEventListener("mousemove", handleMove);
                window.removeEventListener("mouseup", handleUp);
            };
        }, [clampPosition, dragging]);

        useEffect(() => {
            const viewport = viewportRef.current;
            if (!viewport) return;
            const handleWheel = (event: WheelEvent) => {
                event.preventDefault();
                const direction = event.deltaY > 0 ? -SCALE_STEP : SCALE_STEP;
                updateScale((current) => current + direction);
            };
            viewport.addEventListener("wheel", handleWheel, { passive: false });
            return () => viewport.removeEventListener("wheel", handleWheel);
        }, [updateScale]);

        return (
            <div className="relative h-full overflow-hidden">
                <div
                    ref={viewportRef}
                    role="img"
                    aria-label={ariaLabel}
                    className="mermaid-container"
                    onMouseDown={handleMouseDown}
                    onMouseLeave={() => setDragging(false)}
                    style={{ overscrollBehavior: "contain", touchAction: "none" }}
                >
                    <div
                        ref={containerRef}
                        data-testid="diagram-transform"
                        className="w-full h-full flex items-center justify-center"
                        style={{
                            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                            transformOrigin: "center center",
                            transition: dragging ? "none" : "transform 0.2s",
                            willChange: "transform",
                            cursor: dragging ? "grabbing" : "grab",
                        }}
                    />
                </div>

                {overlay}

                <div className="absolute top-2 right-2 z-10 flex gap-1 glass rounded-lg p-1">
                    <button
                        type="button"
                        onClick={() => updateScale((current) => current + SCALE_STEP)}
                        title="Zoom In"
                        aria-label="Zoom In"
                        className="p-2 text-accent hover:text-text"
                    >
                        <ZoomIn size={18} />
                    </button>
                    <button
                        type="button"
                        onClick={() => updateScale((current) => current - SCALE_STEP)}
                        title="Zoom Out"
                        aria-label="Zoom Out"
                        className="p-2 text-accent hover:text-text"
                    >
                        <ZoomOut size={18} />
                    </button>
                    <button
                        type="button"
                        onClick={fitToScreen}
                        title="Fit to Screen"
                        aria-label="Fit to Screen"
                        className="p-2 text-accent hover:text-text"
                    >
                        <Maximize size={18} />
                    </button>
                    <button
                        type="button"
                        onClick={resetView}
                        title="Reset View"
                        aria-label="Reset View"
                        className="p-2 text-accent hover:text-text"
                    >
                        <RotateCcw size={18} />
                    </button>
                    <div className="w-px bg-border/50 mx-1" />
                    <button
                        type="button"
                        onClick={downloadSvg}
                        title="Download SVG"
                        aria-label="Download SVG"
                        className="p-2 text-accent hover:text-text"
                    >
                        <Download size={18} />
                    </button>
                </div>

                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-bg/50 z-20">
                        <div className="text-accent animate-pulse">Loading diagram...</div>
                    </div>
                )}
                {error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg/80 p-8 text-center text-error z-20">
                        <AlertCircle
                            size={48}
                            className="mb-4"
                        />
                        <h3 className="text-xl font-bold mb-2">Diagram Rendering Failed</h3>
                        <p className="max-w-md">{error}</p>
                    </div>
                )}
            </div>
        );
    },
);

RenderedArchitectureDiagram.displayName = "RenderedArchitectureDiagram";
