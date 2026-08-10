const fatalPatterns = ["out of bounds", "signature mismatch"];

class GraphvizError extends Error {
    fatal: boolean;

    constructor(message: string, fatal = false) {
        super(message);
        this.name = "GraphvizError";
        this.fatal = fatal;
    }
}

interface PendingRender {
    resolve: (svg: string) => void;
    reject: (error: Error) => void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

class GraphvizWorkerClient {
    private worker: Worker | null = null;
    private queue: Promise<void> = Promise.resolve();
    private requestId = 0;
    private readonly pending = new Map<number, PendingRender>();
    private readonly timeoutMs = 10_000;

    private ensureWorker(): Worker {
        if (this.worker) return this.worker;
        const worker = new Worker(new URL("./graphvizWorker.ts", import.meta.url), { type: "module" });
        this.worker = worker;

        worker.onmessage = (event: MessageEvent<unknown>) => {
            if (!isRecord(event.data) || typeof event.data.id !== "number") return;
            const pending = this.pending.get(event.data.id);
            if (!pending) return;
            this.pending.delete(event.data.id);

            if (event.data.ok === true && typeof event.data.svg === "string") {
                pending.resolve(event.data.svg);
                return;
            }
            const message = typeof event.data.error === "string" ? event.data.error : "Graphviz render failed";
            const error = new GraphvizError(message, event.data.fatal === true);
            pending.reject(error);
            if (error.fatal) this.resetWorker();
        };

        worker.onerror = (event) => {
            const error = new GraphvizError(event.message || "Graphviz worker error", true);
            this.pending.forEach((pending) => pending.reject(error));
            this.pending.clear();
            this.resetWorker();
        };
        return worker;
    }

    private resetWorker(): void {
        this.worker?.terminate();
        this.worker = null;
    }

    render(dot: string): Promise<string> {
        const result = this.queue.then(() => this.renderWithRetry(dot));
        this.queue = result.then(
            () => undefined,
            () => undefined,
        );
        return result;
    }

    private async renderWithRetry(dot: string, attempt = 0): Promise<string> {
        try {
            return await this.renderOnce(dot);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            const fatal =
                (error instanceof GraphvizError && error.fatal) ||
                fatalPatterns.some((pattern) => message.includes(pattern));
            if (fatal && attempt < 1) {
                this.resetWorker();
                return this.renderWithRetry(dot, attempt + 1);
            }
            throw error;
        }
    }

    private renderOnce(dot: string): Promise<string> {
        const worker = this.ensureWorker();
        const id = ++this.requestId;
        return new Promise((resolve, reject) => {
            const timeoutId = window.setTimeout(() => {
                if (!this.pending.has(id)) return;
                this.pending.delete(id);
                this.resetWorker();
                reject(new GraphvizError("Graphviz render timed out", true));
            }, this.timeoutMs);
            this.pending.set(id, {
                resolve: (svg) => {
                    window.clearTimeout(timeoutId);
                    resolve(svg);
                },
                reject: (error) => {
                    window.clearTimeout(timeoutId);
                    reject(error);
                },
            });
            worker.postMessage({ id, dot });
        });
    }

    reset(): void {
        this.resetWorker();
        this.queue = Promise.resolve();
    }
}

const graphvizClient = new GraphvizWorkerClient();

export const renderDot = (dot: string): Promise<string> => graphvizClient.render(dot);
export const resetGraphviz = (): void => graphvizClient.reset();
