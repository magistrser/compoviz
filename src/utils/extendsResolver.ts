/**
 * Docker Compose extends resolver with spec-compliant merge strategies.
 * Implements service inheritance following the Docker Compose specification.
 */
import type { ComposeDependencyConfig, ComposeDocument, ComposeService } from "../models/composeTypes";

/**
 * Normalize depends_on from array (short syntax) to object (long syntax).
 * This prevents undefined behavior when merging array into object.
 *
 * @param {Array|Object} dependsOn - The depends_on value
 * @returns {Object} Normalized object format
 */
export function normalizeDependsOn(
    dependsOn: ComposeService["depends_on"] | null,
): Record<string, ComposeDependencyConfig | null> {
    if (!dependsOn) return {};

    if (Array.isArray(dependsOn)) {
        // Convert ['db', 'redis'] → { db: { condition: 'service_started' }, redis: { ... } }
        return Object.fromEntries(dependsOn.map((svc) => [svc, { condition: "service_started" }]));
    }

    return dependsOn; // Already object format
}

/**
 * Field-specific merge strategies per Docker Compose specification.
 *
 * Key insight: List fields are CONCATENATED, not replaced!
 * This was a critical bug fix from the planning phase.
 */
const MERGE_STRATEGIES: Record<string, "concat" | "merge" | "override"> = {
    // CONCATENATE (arrays merged, not replaced)
    ports: "concat",
    expose: "concat",
    external_links: "concat",
    dns: "concat",
    dns_search: "concat",
    tmpfs: "concat",
    volumes: "concat",

    // MERGE (dictionaries deep merged)
    environment: "merge",
    labels: "merge",
    build: "merge",
    deploy: "merge",
    logging: "merge",
    depends_on: "merge", // Always objects after normalization

    // OVERRIDE (scalar values replaced)
    image: "override",
    command: "override",
    entrypoint: "override",
    working_dir: "override",
    user: "override",
    hostname: "override",
    domainname: "override",
    container_name: "override",
    restart: "override",
    stdin_open: "override",
    tty: "override",
    privileged: "override",
};

/**
 * Deep merge two objects.
 * @param {Object} base - Base object
 * @param {Object} override - Override object
 * @returns {Object} Merged object
 */
function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepMerge(base: Record<string, unknown>, override: Record<string, unknown>): Record<string, unknown> {
    const result = { ...base };

    for (const [key, value] of Object.entries(override)) {
        if (isRecord(value)) {
            result[key] = deepMerge(isRecord(result[key]) ? result[key] : {}, value);
        } else {
            result[key] = value;
        }
    }

    return result;
}

/**
 * Merge two service configurations using field-specific strategies.
 *
 * @param {Object} base - Base service configuration
 * @param {Object} override - Override service configuration
 * @returns {Object} Merged service configuration
 */
export function mergeServiceConfigs(base: ComposeService, override: ComposeService): ComposeService {
    // Normalize depends_on BEFORE merging (only if they exist)
    const normalizedBase = { ...base };
    if (base.depends_on) {
        normalizedBase.depends_on = normalizeDependsOn(base.depends_on);
    }

    const normalizedOverride = { ...override };
    if (override.depends_on) {
        normalizedOverride.depends_on = normalizeDependsOn(override.depends_on);
    }

    const result = { ...normalizedBase };

    for (const [key, value] of Object.entries(normalizedOverride)) {
        const strategy = MERGE_STRATEGIES[key] ?? "override";

        if (strategy === "concat") {
            // Concatenate arrays
            const existing = Array.isArray(result[key]) ? result[key] : [];
            result[key] = [...existing, ...(Array.isArray(value) ? value : [value])];
        } else if (strategy === "merge") {
            // Deep merge objects
            result[key] = deepMerge(isRecord(result[key]) ? result[key] : {}, isRecord(value) ? value : {});
        } else if (strategy === "override") {
            // Replace entirely
            result[key] = value;
        }
    }

    return result;
}

/**
 * Resolve extends for a single service.
 *
 * @param {Object} service - Service configuration
 * @param {Object} allServices - All services in the compose file
 * @param {Set<string>} visited - Set of visited service names (for circular detection)
 * @returns {Object} Resolved service configuration
 */
function resolveServiceExtends(
    service: ComposeService,
    allServices: Record<string, ComposeService>,
    visited: Set<string> = new Set(),
): ComposeService {
    if (!service.extends) return service;

    const extendedServiceName = typeof service.extends === "string" ? service.extends : service.extends.service;

    if (!extendedServiceName) {
        throw new Error("Invalid extends configuration: missing service name");
    }

    // Circular dependency detection
    if (visited.has(extendedServiceName)) {
        throw new Error(`Circular extends detected: ${Array.from(visited).join(" → ")} → ${extendedServiceName}`);
    }

    const extendedService = allServices[extendedServiceName];
    if (!extendedService) {
        throw new Error(`Service "${extendedServiceName}" referenced in extends not found`);
    }

    // Recursively resolve the extended service's extends
    const newVisited = new Set(visited);
    newVisited.add(extendedServiceName);
    const resolvedBase = resolveServiceExtends(extendedService, allServices, newVisited);

    // Remove extends field from override
    const serviceWithoutExtends = Object.fromEntries(Object.entries(service).filter(([key]) => key !== "extends"));

    // Merge base with override
    return mergeServiceConfigs(resolvedBase, serviceWithoutExtends);
}

/**
 * Resolve all extends directives in a Docker Compose configuration.
 *
 * @param {Object} compose - Docker Compose configuration
 * @returns {Object} Compose configuration with extends resolved
 */
export function resolveAllExtends(
    compose: ComposeDocument & { services: Record<string, ComposeService> },
): ComposeDocument & { services: Record<string, ComposeService> };
export function resolveAllExtends(compose: ComposeDocument): ComposeDocument;
export function resolveAllExtends(compose: ComposeDocument): ComposeDocument {
    if (!compose.services) return compose;

    const resolvedServices: Record<string, ComposeService> = {};

    for (const [name, service] of Object.entries(compose.services)) {
        try {
            resolvedServices[name] = resolveServiceExtends(service, compose.services);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Error resolving extends for service "${name}": ${message}`);
        }
    }

    return {
        ...compose,
        services: resolvedServices,
    };
}
