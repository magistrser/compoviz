import yaml from "js-yaml";
import type { ComposeDocument } from "../models/composeTypes";

/**
 * Recursively cleans an object by removing empty values, arrays, and nested objects.
 * @param {any} obj - The object to clean.
 * @returns {any} The cleaned object or undefined.
 */
export const cleanObject = (obj: unknown): unknown => {
    if (obj === null || obj === undefined) return undefined;
    if (Array.isArray(obj))
        return obj.length ? obj.filter((v) => v !== "" && v !== null && v !== undefined) : undefined;
    if (typeof obj !== "object") return obj === "" ? undefined : obj;
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
        // Skip internal properties (prefixed with _) like _position
        if (k.startsWith("_")) continue;
        const val = cleanObject(v);
        if (val !== undefined && !(typeof val === "object" && val !== null && Object.keys(val).length === 0))
            cleaned[k] = val;
    }
    return Object.keys(cleaned).length ? cleaned : undefined;
};

/**
 * Generates a YAML string from the compose state.
 * Following the modern Compose Specification:
 * - `version` is obsolete and should not be output
 * - `name` is the project name (optional but recommended)
 * @param {object} state - The compose state object.
 * @returns {string} The YAML representation.
 */
export const generateYaml = (state: ComposeDocument | null | undefined): string => {
    if (!state) return "services: {}\n";
    const output: Record<string, unknown> = {};

    // Add name first if present (modern Compose spec)
    if (state.name) output.name = state.name;

    // Note: version is obsolete per Compose Specification
    // We intentionally do not output it

    if (state.services && Object.keys(state.services).length) output.services = cleanObject(state.services);
    if (state.networks && Object.keys(state.networks).length) output.networks = cleanObject(state.networks);
    if (state.volumes && Object.keys(state.volumes).length) output.volumes = cleanObject(state.volumes);
    if (state.secrets && Object.keys(state.secrets).length) output.secrets = cleanObject(state.secrets);
    if (state.configs && Object.keys(state.configs).length) output.configs = cleanObject(state.configs);

    return yaml.dump(cleanObject(output) || { services: {} }, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
        quotingType: '"',
    });
};

/**
 * Parses a YAML string into an object.
 * @param {string} yamlString - The YAML string.
 * @returns {object} The parsed object.
 */
export const parseYaml = (yamlString: string): unknown => {
    return yaml.load(yamlString);
};
