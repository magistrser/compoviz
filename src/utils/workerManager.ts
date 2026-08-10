import type { ParserOptions, ParserWorkerClient, WorkerParseResult } from "../models/composeTypes";

const MESSAGE_TYPES = {
    PARSE: "parse",
    PARSE_SUCCESS: "parse_success",
    PARSE_ERROR: "parse_error",
} as const;

interface PendingRequest {
    resolve: (value: WorkerParseResult) => void;
    reject: (reason: Error) => void;
}

let messageId = 0;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getErrorMessage(value: unknown): string {
    if (isRecord(value) && typeof value.message === "string") return value.message;
    return "Parser worker failed";
}

function isWorkerParseResult(value: unknown): value is WorkerParseResult {
    return (
        isRecord(value) &&
        Array.isArray(value.profiles) &&
        Array.isArray(value.variables) &&
        Array.isArray(value.undefinedVariables) &&
        Array.isArray(value.errors) &&
        isRecord(value.profileCounts)
    );
}

export function createParserWorker(): ParserWorkerClient {
    let worker: Worker | null = null;
    const pendingRequests = new Map<number, PendingRequest>();

    const initWorker = (): Worker => {
        if (worker) return worker;
        worker = new Worker(new URL("../workers/parserWorker.ts", import.meta.url), {
            type: "module",
        });

        worker.onmessage = (event: MessageEvent<unknown>) => {
            if (!isRecord(event.data) || typeof event.data.id !== "number") return;
            const request = pendingRequests.get(event.data.id);
            if (!request) return;
            pendingRequests.delete(event.data.id);

            if (event.data.type === MESSAGE_TYPES.PARSE_SUCCESS && isWorkerParseResult(event.data.payload)) {
                request.resolve(event.data.payload);
            } else if (event.data.type === MESSAGE_TYPES.PARSE_ERROR) {
                request.reject(new Error(getErrorMessage(event.data.payload)));
            } else {
                request.reject(new Error("Invalid parser worker response"));
            }
        };

        worker.onerror = (error) => {
            console.error("Parser worker error:", error);
            for (const [id, request] of pendingRequests) {
                request.reject(new Error(`Worker error: ${error.message}`));
                pendingRequests.delete(id);
            }
        };
        return worker;
    };

    const parseAsync = (yamlString: string, options: ParserOptions = {}): Promise<WorkerParseResult> => {
        const activeWorker = initWorker();
        return new Promise((resolve, reject) => {
            const id = messageId++;
            pendingRequests.set(id, { resolve, reject });
            activeWorker.postMessage({
                type: MESSAGE_TYPES.PARSE,
                payload: { yamlString, options },
                id,
            });
            window.setTimeout(() => {
                if (!pendingRequests.has(id)) return;
                pendingRequests.delete(id);
                reject(new Error("Parser timeout after 30s"));
            }, 30_000);
        });
    };

    const terminate = () => {
        worker?.terminate();
        worker = null;
        pendingRequests.clear();
    };

    return { parseAsync, terminate };
}
