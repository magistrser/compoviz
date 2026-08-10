import { Graphviz } from "@hpcc-js/wasm-graphviz";

const fatalPatterns = ["out of bounds", "signature mismatch"];
let graphvizPromise: ReturnType<typeof Graphviz.load> | null = null;

const getGraphviz = (): ReturnType<typeof Graphviz.load> => {
    graphvizPromise ??= Graphviz.load();
    return graphvizPromise;
};

function isRenderRequest(value: unknown): value is { id: number; dot: string } {
    return (
        typeof value === "object" &&
        value !== null &&
        "id" in value &&
        "dot" in value &&
        typeof value.id === "number" &&
        typeof value.dot === "string"
    );
}

self.onmessage = async (event: MessageEvent<unknown>) => {
    if (!isRenderRequest(event.data)) return;
    const { id, dot } = event.data;
    try {
        const graphviz = await getGraphviz();
        self.postMessage({ id, ok: true, svg: graphviz.dot(dot) });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const fatal = fatalPatterns.some((pattern) => message.includes(pattern));
        self.postMessage({ id, ok: false, error: message, fatal });
        if (fatal) self.close();
    }
};
