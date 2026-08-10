import { normalizeToAST } from "../models/normalizeToAST";
import { getPortConflicts } from "../models/astQueries";
import { MountTypes } from "../models/ComposeAST";
import type { ComposeDocument, ValidationIssue } from "../models/composeTypes";

/**
 * Helper to normalize depends_on (can be array or object in Docker Compose).
 * @param {Array|object} dependsOn - The depends_on value.
 * @returns {string[]} Normalized array of service names.
 */
export const normalizeDependsOn = (dependsOn: unknown): string[] => {
    if (!dependsOn) return [];
    if (Array.isArray(dependsOn)) {
        return dependsOn.filter((value): value is string => typeof value === "string");
    }
    if (typeof dependsOn === "object") return Object.keys(dependsOn);
    return [];
};

/**
 * Helper to normalize arrays that might be objects or undefined.
 * @param {any} arr - The value to normalize.
 * @returns {any[]} A normalized array.
 */
export const normalizeArray = (arr: unknown): string[] => {
    if (!arr) return [];
    if (Array.isArray(arr)) {
        return arr.filter((value): value is string => typeof value === "string");
    }
    return [];
};

/**
 * Validates the compose state and returns an array of errors/warnings.
 * Uses the canonical AST for normalized data reads.
 * @param {object} state - The compose state.
 * @returns {Array<{type: string, entity: string, name: string, message: string}>} Array of validation issues.
 */
export const validateState = (state: ComposeDocument): ValidationIssue[] => {
    const errors: ValidationIssue[] = [];
    const ast = normalizeToAST(state);
    const containerNames = new Set<string>();

    for (const service of ast.services) {
        const name = service.id;

        // Check for image or build
        if (!service.image && !service.build) {
            errors.push({ type: "error", entity: "service", name, message: "Missing image or build context" });
        }

        // Check for duplicate container names
        if (service.containerName) {
            if (containerNames.has(service.containerName)) {
                errors.push({
                    type: "error",
                    entity: "service",
                    name,
                    message: `Duplicate container_name "${service.containerName}"`,
                });
            } else {
                containerNames.add(service.containerName);
            }
        }

        // Check network references
        for (const net of service.networks) {
            if (!ast.networkMap.has(net.network)) {
                errors.push({
                    type: "warning",
                    entity: "service",
                    name,
                    message: `Network "${net.network}" not defined`,
                });
            }
        }

        // Check dependency references
        for (const dep of service.dependencies) {
            if (!ast.serviceMap.has(dep.service)) {
                errors.push({
                    type: "error",
                    entity: "service",
                    name,
                    message: `Dependency "${dep.service}" not found`,
                });
            }
        }

        // Check volume references (named volumes only)
        for (const vol of service.volumes) {
            if (vol.type === MountTypes.VOLUME && vol.source && !ast.volumeMap.has(vol.source)) {
                errors.push({
                    type: "warning",
                    entity: "service",
                    name,
                    message: `Volume "${vol.source}" not defined`,
                });
            }
        }
    }

    // Check for port conflicts using AST query
    const portConflicts = getPortConflicts(ast);
    for (const conflict of portConflicts) {
        // Report on the second (and subsequent) services that use the same binding
        for (let i = 1; i < conflict.services.length; i++) {
            errors.push({
                type: "error",
                entity: "service",
                name: conflict.services[i] ?? "",
                message: `Port binding ${conflict.binding} already used by "${conflict.services[0]}"`,
            });
        }
    }

    return errors;
};
