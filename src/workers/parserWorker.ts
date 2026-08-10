import { parseCompose } from "../utils/composeParser";
import type { ParserOptions } from "../models/composeTypes";

const MESSAGE_TYPES = {
    PARSE: "parse",
    PARSE_SUCCESS: "parse_success",
    PARSE_ERROR: "parse_error",
} as const;

interface ParseRequest {
    type: typeof MESSAGE_TYPES.PARSE;
    payload: { yamlString: string; options: ParserOptions };
    id: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isParseRequest(value: unknown): value is ParseRequest {
    if (!isRecord(value) || value.type !== MESSAGE_TYPES.PARSE) return false;
    if (typeof value.id !== "number" || !isRecord(value.payload)) return false;
    return typeof value.payload.yamlString === "string" && isRecord(value.payload.options);
}

self.onmessage = (event: MessageEvent<unknown>) => {
    if (!isParseRequest(event.data)) return;
    const { payload, id } = event.data;
    try {
        const result = parseCompose(payload.yamlString, payload.options);
        self.postMessage({
            type: MESSAGE_TYPES.PARSE_SUCCESS,
            payload: { ...result, variables: Array.from(result.variables) },
            id,
        });
    } catch (error) {
        self.postMessage({
            type: MESSAGE_TYPES.PARSE_ERROR,
            payload: {
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
            },
            id,
        });
    }
};
