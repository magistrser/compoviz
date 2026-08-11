import { DependencyConditions, type DependencyCondition } from "../../models";
import type { ComposeDependencyConfig, ComposeResource, ComposeService, ComposeState } from "../../models/composeTypes";
import { deepEqual } from "../../utils/objectUtils";
import { normalizeArray } from "../../utils/validation";
import type { ComposeEdit, ComposeEditOutcome, ComposeRelationshipChange, ComposeResourceKind } from "./types";

type TransitionResult = { status: "applied"; state: ComposeState } | Exclude<ComposeEditOutcome, { status: "applied" }>;

function defaultService(): ComposeService {
    return {
        image: "",
        ports: [],
        environment: {},
        depends_on: [],
        networks: [],
        volumes: [],
        labels: {},
        deploy: { resources: { limits: {}, reservations: {} } },
        healthcheck: {},
    };
}

function defaultResource(resource: Exclude<ComposeResourceKind, "service">): ComposeResource {
    switch (resource) {
        case "network":
            return { driver: "bridge", external: false, labels: {} };
        case "volume":
            return { driver: "local", external: false, driver_opts: {} };
        case "secret":
        case "config":
            return { file: "", external: false };
    }
}

function withPosition<T extends ComposeService | ComposeResource>(value: T, position: ComposeEdit & object): T {
    if (!("position" in position) || position.position === undefined) return value;
    return { ...value, _position: position.position };
}

function hasValidName(name: string): boolean {
    return name.trim().length > 0;
}

function deleteKey<T>(record: Record<string, T>, key: string): Record<string, T> {
    return Object.fromEntries(Object.entries(record).filter(([name]) => name !== key));
}

function resourceMap(
    state: ComposeState,
    resource: ComposeResourceKind,
): Record<string, ComposeService | ComposeResource> {
    switch (resource) {
        case "service":
            return state.services;
        case "network":
            return state.networks;
        case "volume":
            return state.volumes;
        case "secret":
            return state.secrets;
        case "config":
            return state.configs;
    }
}

function withResourceMap(
    state: ComposeState,
    resource: ComposeResourceKind,
    values: Record<string, ComposeService | ComposeResource>,
): ComposeState {
    switch (resource) {
        case "service":
            return { ...state, services: values };
        case "network":
            return { ...state, networks: values };
        case "volume":
            return { ...state, volumes: values };
        case "secret":
            return { ...state, secrets: values };
        case "config":
            return { ...state, configs: values };
    }
}

function finish(current: ComposeState, next: ComposeState): TransitionResult {
    return deepEqual(current, next) ? { status: "unchanged" } : { status: "applied", state: next };
}

function dependencyEntries(dependsOn: ComposeService["depends_on"]): Array<[string, ComposeDependencyConfig]> {
    if (Array.isArray(dependsOn)) {
        return dependsOn.filter((value): value is string => typeof value === "string").map((name) => [name, {}]);
    }
    if (!dependsOn || typeof dependsOn !== "object") return [];
    return Object.entries(dependsOn).map(([name, config]) => [
        name,
        config && typeof config === "object" ? { ...config } : {},
    ]);
}

function dependencyCondition(config: ComposeDependencyConfig): DependencyCondition | null {
    switch (config.condition) {
        case undefined:
        case DependencyConditions.STARTED:
            return DependencyConditions.STARTED;
        case DependencyConditions.HEALTHY:
            return DependencyConditions.HEALTHY;
        case DependencyConditions.COMPLETED:
            return DependencyConditions.COMPLETED;
        default:
            return null;
    }
}

function serializeDependencies(
    entries: ReadonlyArray<readonly [string, ComposeDependencyConfig]>,
): NonNullable<ComposeService["depends_on"]> {
    const normalizedEntries = entries.map(([name, config]) => {
        if (config.condition !== DependencyConditions.STARTED) return [name, config] as const;
        const { condition: _condition, ...remaining } = config;
        return [name, remaining] as const;
    });
    if (normalizedEntries.every(([, config]) => Object.keys(config).length === 0)) {
        return normalizedEntries.map(([name]) => name);
    }
    return Object.fromEntries(normalizedEntries);
}

function updateDependencies(
    dependsOn: ComposeService["depends_on"],
    edit: Extract<ComposeRelationshipChange, { relationship: "depends-on" }>,
): NonNullable<ComposeService["depends_on"]> {
    const entries = dependencyEntries(dependsOn);
    const index = entries.findIndex(([name]) => name === edit.target);
    if (edit.action === "disconnect") {
        if (index === -1) return dependsOn ?? [];
        return serializeDependencies(entries.filter(([name]) => name !== edit.target));
    }

    const existing = entries[index];
    if (existing && dependencyCondition(existing[1]) === edit.condition) return dependsOn ?? [];

    const config = existing ? { ...existing[1] } : {};
    if (edit.condition === DependencyConditions.STARTED) delete config.condition;
    else config.condition = edit.condition;
    if (index === -1) entries.push([edit.target, config]);
    else entries[index] = [edit.target, config];
    return serializeDependencies(entries);
}

function relationshipChangeForEdit(
    edit: Extract<ComposeEdit, { type: "connect-relationship" | "disconnect-relationship" }>,
): ComposeRelationshipChange {
    if (edit.type === "connect-relationship" && edit.relationship === "depends-on") {
        return {
            action: "connect",
            relationship: edit.relationship,
            service: edit.service,
            target: edit.target,
            condition: edit.condition,
        };
    }
    if (edit.relationship === "depends-on") {
        return {
            action: "disconnect",
            relationship: edit.relationship,
            service: edit.service,
            target: edit.target,
        };
    }
    return {
        action: edit.type === "connect-relationship" ? "connect" : "disconnect",
        relationship: edit.relationship,
        service: edit.service,
        target: edit.target,
    };
}

function updateServiceRelationship(current: ComposeState, edit: ComposeRelationshipChange): TransitionResult {
    const service = current.services[edit.service];
    if (!service) return { status: "rejected", reason: "missing-resource" };
    if (edit.relationship === "depends-on" && !current.services[edit.target]) {
        return { status: "rejected", reason: "invalid-relationship" };
    }
    if (
        edit.relationship === "depends-on" &&
        edit.action === "update" &&
        !dependencyEntries(service.depends_on).some(([name]) => name === edit.target)
    ) {
        return { status: "rejected", reason: "invalid-relationship" };
    }
    if (edit.relationship === "network" && !current.networks[edit.target]) {
        return { status: "rejected", reason: "invalid-relationship" };
    }
    if (edit.relationship === "volume" && !current.volumes[edit.target]) {
        return { status: "rejected", reason: "invalid-relationship" };
    }

    let data: Partial<ComposeService>;
    if (edit.relationship === "depends-on") {
        data = { depends_on: updateDependencies(service.depends_on, edit) };
    } else if (edit.relationship === "network") {
        const values = normalizeArray(service.networks);
        data = {
            networks:
                edit.action === "connect"
                    ? values.includes(edit.target)
                        ? values
                        : [...values, edit.target]
                    : values.filter((value) => value !== edit.target),
        };
    } else {
        const values = normalizeArray(service.volumes);
        const mount = `${edit.target}:/data/${edit.target}`;
        data = {
            volumes:
                edit.action === "connect"
                    ? values.some((value) => value.startsWith(`${edit.target}:`))
                        ? values
                        : [...values, mount]
                    : values.filter((value) => !value.startsWith(`${edit.target}:`)),
        };
    }
    return finish(current, {
        ...current,
        services: { ...current.services, [edit.service]: { ...service, ...data } },
    });
}

export function applyComposeEdit(current: ComposeState, edit: ComposeEdit): TransitionResult {
    switch (edit.type) {
        case "set-project-name":
            return finish(current, { ...current, name: edit.name });
        case "add-resource": {
            const name = edit.name.trim();
            if (!hasValidName(name)) return { status: "rejected", reason: "invalid-name" };
            if (edit.resource === "service") {
                return finish(current, {
                    ...current,
                    services: { ...current.services, [name]: withPosition(defaultService(), edit) },
                });
            }
            const values = resourceMap(current, edit.resource);
            return finish(
                current,
                withResourceMap(current, edit.resource, {
                    ...values,
                    [name]: withPosition(defaultResource(edit.resource), edit),
                }),
            );
        }
        case "update-resource": {
            const values = resourceMap(current, edit.resource);
            const existing = values[edit.name];
            if (!existing) return { status: "rejected", reason: "missing-resource" };
            return finish(
                current,
                withResourceMap(current, edit.resource, {
                    ...values,
                    [edit.name]: { ...existing, ...edit.data },
                }),
            );
        }
        case "remove-resources": {
            for (const reference of edit.resources) {
                if (!resourceMap(current, reference.resource)[reference.name]) {
                    return { status: "rejected", reason: "missing-resource" };
                }
            }
            let next = { ...current };
            for (const reference of edit.resources) {
                next = withResourceMap(
                    next,
                    reference.resource,
                    deleteKey(resourceMap(next, reference.resource), reference.name),
                );
            }
            return finish(current, next);
        }
        case "rename-resource": {
            const name = edit.newName.trim();
            if (!hasValidName(name)) return { status: "rejected", reason: "invalid-name" };
            const values = resourceMap(current, edit.resource);
            const existing = values[edit.oldName];
            if (!existing) return { status: "rejected", reason: "missing-resource" };
            if (name === edit.oldName) return { status: "unchanged" };
            return finish(
                current,
                withResourceMap(current, edit.resource, {
                    ...deleteKey(values, edit.oldName),
                    [name]: existing,
                }),
            );
        }
        case "position-resource":
            return applyComposeEdit(current, {
                type: "update-resource",
                resource: edit.resource,
                name: edit.name,
                data: { _position: edit.position },
            });
        case "position-resources": {
            for (const position of edit.positions) {
                if (!resourceMap(current, position.resource)[position.name]) {
                    return { status: "rejected", reason: "missing-resource" };
                }
            }

            let next = current;
            for (const position of edit.positions) {
                const values = resourceMap(next, position.resource);
                const existing = values[position.name];
                if (!existing) return { status: "rejected", reason: "missing-resource" };
                next = withResourceMap(next, position.resource, {
                    ...values,
                    [position.name]: { ...existing, _position: position.position },
                });
            }
            return finish(current, next);
        }
        case "apply-template": {
            const name = edit.serviceName.trim();
            if (!hasValidName(name)) return { status: "rejected", reason: "invalid-name" };
            const next: ComposeState = {
                ...current,
                services: { ...current.services, [name]: { ...defaultService(), ...edit.service } },
            };
            if (edit.suggestedVolume) {
                next.volumes = {
                    ...next.volumes,
                    [edit.suggestedVolume.name]: {
                        ...defaultResource("volume"),
                        ...edit.suggestedVolume.config,
                    },
                };
            }
            return finish(current, next);
        }
        case "connect-relationship":
        case "disconnect-relationship":
            return updateServiceRelationship(current, relationshipChangeForEdit(edit));
        case "change-relationships": {
            let next = current;
            for (const change of edit.changes) {
                const result = updateServiceRelationship(next, change);
                if (result.status === "rejected") return result;
                if (result.status === "applied") next = result.state;
            }
            return finish(current, next);
        }
    }
}
