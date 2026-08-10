/**
 * Docker Compose include resolver.
 * Resolves include directives and merges external Compose files.
 */

import yaml from "js-yaml";
import { resolvePath, normalizePath } from "./pathResolver";
import type { ComposeDocument } from "../models/composeTypes";

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isComposeDocument(value: unknown): value is ComposeDocument {
    return isRecord(value);
}

/**
 * Merge two Compose files with override semantics.
 * Later values override earlier ones.
 *
 * @param {Object} base - Base compose configuration
 * @param {Object} override - Override compose configuration
 * @returns {Object} Merged compose configuration
 */
function mergeComposeFiles(
    base: ComposeDocument | null | undefined,
    override: ComposeDocument | null | undefined,
): ComposeDocument {
    if (!override) return base || {};
    if (!base) return override || {};

    const result = { ...base };

    // Merge top-level fields
    for (const [key, value] of Object.entries(override)) {
        if (key === "name") {
            // Override wins for project name
            if (typeof value === "string") result.name = value;
        } else if (["services", "networks", "volumes", "secrets", "configs"].includes(key)) {
            // Merge dictionaries
            result[key] = {
                ...(isRecord(result[key]) ? result[key] : {}),
                ...(isRecord(value) ? value : {}),
            };
        } else {
            // Other fields: override wins
            result[key] = value;
        }
    }

    return result;
}

/**
 * Resolve include directives recursively.
 * Loads external files and merges them into the compose configuration.
 *
 * @param {Object} compose - Compose configuration
 * @param {string} currentFile - Path of current file (for relative resolution)
 * @param {Object} fileMap - Map of file paths to content
 * @param {Set<string>} visited - Set of visited file paths (for circular detection)
 * @returns {Object} Compose configuration with includes resolved
 */
export function resolveIncludes(
    compose: ComposeDocument & { services: Record<string, unknown> },
    currentFile: string,
    fileMap: Record<string, string>,
    visited?: Set<string>,
): ComposeDocument & { services: Record<string, unknown> };
export function resolveIncludes(
    compose: ComposeDocument,
    currentFile: string,
    fileMap: Record<string, string>,
    visited?: Set<string>,
): ComposeDocument;
export function resolveIncludes(
    compose: ComposeDocument,
    currentFile: string,
    fileMap: Record<string, string>,
    visited: Set<string> = new Set(),
): ComposeDocument {
    if (!compose || !compose.include) {
        return compose;
    }

    // Normalize and track current file
    const absoluteCurrent = normalizePath(currentFile);

    // Check circular dependency
    if (visited.has(absoluteCurrent)) {
        throw new Error(`Circular include detected: ${absoluteCurrent} already in chain`);
    }

    const newVisited = new Set(visited);
    newVisited.add(absoluteCurrent);

    let merged = { ...compose };
    delete merged.include; // Remove include directive from result

    // Process each include
    const includes = Array.isArray(compose.include) ? compose.include : [compose.include];

    for (const includeSpec of includes) {
        // Extract path from include specification
        const includePath =
            typeof includeSpec === "string"
                ? includeSpec
                : isRecord(includeSpec) && typeof includeSpec.path === "string"
                  ? includeSpec.path
                  : null;

        if (!includePath) {
            console.warn("Invalid include specification:", includeSpec);
            continue;
        }

        // Resolve relative path
        const absoluteInclude = resolvePath(currentFile, includePath);

        // Check circular dependency with absolute path
        if (newVisited.has(absoluteInclude)) {
            throw new Error(`Circular include detected: ${Array.from(newVisited).join(" → ")} → ${absoluteInclude}`);
        }

        // Load file from fileMap
        const content = fileMap[absoluteInclude];
        if (!content) {
            throw new Error(
                `Include file not found: "${includePath}"\n` +
                    `Resolved to: "${absoluteInclude}"\n` +
                    `Available files: ${Object.keys(fileMap).join(", ")}`,
            );
        }

        // Parse included file
        let included: unknown;
        try {
            included = yaml.load(content);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to parse included file "${includePath}": ${message}`);
        }

        if (!isComposeDocument(included)) {
            throw new Error(`Included file "${includePath}" must contain an object`);
        }

        // Recursively resolve includes in the included file
        const resolvedInclude = resolveIncludes(included, absoluteInclude, fileMap, newVisited);

        // Merge with current configuration
        // NOTE: Includes are the base, main file is the override
        merged = mergeComposeFiles(resolvedInclude, merged);
    }

    return merged;
}

/**
 * Check if a compose file has any include directives.
 *
 * @param {Object} compose - Compose configuration
 * @returns {boolean} True if includes are present
 */
export function hasIncludes(compose: ComposeDocument | null | undefined): boolean {
    if (!compose || !compose.include) {
        return false;
    }

    return Array.isArray(compose.include) ? compose.include.length > 0 : true;
}
