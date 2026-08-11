import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RenderedArchitectureDiagram } from "./RenderedArchitectureDiagram";

interface RenderRequest {
    readonly id: number;
    readonly dot: string;
}

type WorkerMessageHandler = (worker: FakeWorker, request: RenderRequest) => void;

class FakeWorker {
    static instances: FakeWorker[] = [];
    static handleMessage: WorkerMessageHandler = () => undefined;

    onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
    onerror: ((event: ErrorEvent) => void) | null = null;
    terminated = false;

    constructor() {
        FakeWorker.instances.push(this);
    }

    postMessage(request: RenderRequest) {
        FakeWorker.handleMessage(this, request);
    }

    terminate() {
        this.terminated = true;
    }

    respond(data: unknown) {
        this.onmessage?.({ data } as MessageEvent<unknown>);
    }
}

describe("RenderedArchitectureDiagram Graphviz adapter", () => {
    beforeEach(() => {
        FakeWorker.instances = [];
        FakeWorker.handleMessage = () => undefined;
        vi.stubGlobal("Worker", FakeWorker);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it("retries one fatal worker failure with a fresh worker", async () => {
        let attempt = 0;
        FakeWorker.handleMessage = (worker, request) => {
            attempt += 1;
            queueMicrotask(() => {
                if (attempt === 1) {
                    worker.respond({ id: request.id, ok: false, error: "out of bounds", fatal: true });
                } else {
                    worker.respond({
                        id: request.id,
                        ok: true,
                        svg: '<svg xmlns="http://www.w3.org/2000/svg"><text>retried</text></svg>',
                    });
                }
            });
        };

        const { container } = render(
            <RenderedArchitectureDiagram
                dot="digraph retry {}"
                ariaLabel="Retried diagram"
            />,
        );

        await waitFor(() => expect(container.querySelector("text")?.textContent).toBe("retried"));
        expect(FakeWorker.instances).toHaveLength(2);
        expect(FakeWorker.instances[0]?.terminated).toBe(true);
        expect(screen.queryByText("Diagram Rendering Failed")).not.toBeInTheDocument();
    });

    it("retries one timeout and then surfaces the rendering error", async () => {
        vi.useFakeTimers();
        render(
            <RenderedArchitectureDiagram
                dot="digraph timeout {}"
                ariaLabel="Timed out diagram"
            />,
        );

        await act(async () => {
            await vi.advanceTimersByTimeAsync(20_001);
        });

        expect(screen.getByText("Diagram Rendering Failed")).toBeInTheDocument();
        expect(screen.getByText("Graphviz render timed out")).toBeInTheDocument();
        expect(FakeWorker.instances).toHaveLength(2);
        expect(FakeWorker.instances.every((worker) => worker.terminated)).toBe(true);
    });
});
