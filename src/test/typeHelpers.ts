import type { ComposeDocument, ComposeService, ParseComposeResult } from "../models/composeTypes";

export function requireValue<T>(value: T | null | undefined, label = "value"): T {
    if (value === null || value === undefined) {
        throw new Error(`Expected ${label} to be present`);
    }
    return value;
}

export function requireRecord(value: unknown, label = "value"): Record<string, unknown> {
    if (!isRecord(value)) {
        throw new Error(`Expected ${label} to be an object`);
    }
    return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasServices(
    document: ComposeDocument | null,
): document is ComposeDocument & { services: Record<string, ComposeService> } {
    return document !== null && document.services !== undefined;
}

export function requireCompose(
    result: ParseComposeResult,
): ComposeDocument & { services: Record<string, ComposeService> } {
    if (!hasServices(result.compose)) {
        throw new Error("Expected a parsed Compose document with services");
    }
    return result.compose;
}

export function requireService(services: Record<string, ComposeService>, name: string): ComposeService {
    return requireValue(services[name], `service ${name}`);
}
