import type { ComposeResource, ComposeService, ComposeState } from "../../models/composeTypes";
import { deepEqual } from "../../utils/objectUtils";
import { normalizeArray, normalizeDependsOn } from "../../utils/validation";
import type { ComposeEdit, ComposeEditOutcome, ComposeResourceKind } from "./types";

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

function updateServiceRelationship(
    current: ComposeState,
    edit: Extract<ComposeEdit, { type: "connect-relationship" | "disconnect-relationship" }>,
): TransitionResult {
    const service = current.services[edit.service];
    if (!service) return { status: "rejected", reason: "missing-resource" };
    if (edit.relationship === "depends-on" && !current.services[edit.target]) {
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
        const values = normalizeDependsOn(service.depends_on);
        data = {
            depends_on:
                edit.type === "connect-relationship"
                    ? values.includes(edit.target)
                        ? values
                        : [...values, edit.target]
                    : values.filter((value) => value !== edit.target),
        };
    } else if (edit.relationship === "network") {
        const values = normalizeArray(service.networks);
        data = {
            networks:
                edit.type === "connect-relationship"
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
                edit.type === "connect-relationship"
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
            return updateServiceRelationship(current, edit);
        case "change-relationships": {
            let next = current;
            for (const change of edit.changes) {
                const result = updateServiceRelationship(next, {
                    type: change.action === "connect" ? "connect-relationship" : "disconnect-relationship",
                    relationship: change.relationship,
                    service: change.service,
                    target: change.target,
                });
                if (result.status === "rejected") return result;
                if (result.status === "applied") next = result.state;
            }
            return finish(current, next);
        }
    }
}
