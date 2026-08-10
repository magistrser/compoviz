import type { ComposeAction, ComposeState } from "../models/composeTypes";

export const initialState: ComposeState = {
    name: "",
    services: {},
    networks: {},
    volumes: {},
    secrets: {},
    configs: {},
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeItems(value: unknown): Record<string, Record<string, unknown>> {
    if (!isRecord(value)) return {};
    const result: Record<string, Record<string, unknown>> = {};
    for (const [name, entry] of Object.entries(value)) {
        result[name] = isRecord(entry) ? entry : {};
    }
    return result;
}

function withoutKey<T>(items: Record<string, T>, name: string): Record<string, T> {
    return Object.fromEntries(Object.entries(items).filter(([key]) => key !== name));
}

export function composeReducer(state: ComposeState, action: ComposeAction): ComposeState {
    switch (action.type) {
        case "SET_STATE": {
            const payload = isRecord(action.payload) ? action.payload : {};
            return {
                name: typeof payload.name === "string" ? payload.name : "",
                services: normalizeItems(payload.services),
                networks: normalizeItems(payload.networks),
                volumes: normalizeItems(payload.volumes),
                secrets: normalizeItems(payload.secrets),
                configs: normalizeItems(payload.configs),
            };
        }
        case "ADD_SERVICE":
            return {
                ...state,
                services: {
                    ...state.services,
                    [action.name]: {
                        image: "",
                        ports: [],
                        environment: {},
                        depends_on: [],
                        networks: [],
                        volumes: [],
                        labels: {},
                        deploy: {
                            resources: { limits: {}, reservations: {} },
                        },
                        healthcheck: {},
                        ...(action.position ? { _position: action.position } : {}),
                    },
                },
            };
        case "UPDATE_SERVICE":
            return {
                ...state,
                services: {
                    ...state.services,
                    [action.name]: {
                        ...state.services[action.name],
                        ...action.data,
                    },
                },
            };
        case "DELETE_SERVICE":
            return { ...state, services: withoutKey(state.services, action.name) };
        case "RENAME_SERVICE": {
            const service = state.services[action.oldName];
            if (!service) return state;
            return {
                ...state,
                services: {
                    ...withoutKey(state.services, action.oldName),
                    [action.newName]: service,
                },
            };
        }
        case "ADD_NETWORK":
            return {
                ...state,
                networks: {
                    ...state.networks,
                    [action.name]: {
                        driver: "bridge",
                        external: false,
                        labels: {},
                        ...(action.position ? { _position: action.position } : {}),
                    },
                },
            };
        case "UPDATE_NETWORK":
            return {
                ...state,
                networks: {
                    ...state.networks,
                    [action.name]: {
                        ...state.networks[action.name],
                        ...action.data,
                    },
                },
            };
        case "DELETE_NETWORK":
            return { ...state, networks: withoutKey(state.networks, action.name) };
        case "ADD_VOLUME":
            return {
                ...state,
                volumes: {
                    ...state.volumes,
                    [action.name]: {
                        driver: "local",
                        external: false,
                        driver_opts: {},
                        ...(action.position ? { _position: action.position } : {}),
                    },
                },
            };
        case "UPDATE_VOLUME":
            return {
                ...state,
                volumes: {
                    ...state.volumes,
                    [action.name]: {
                        ...state.volumes[action.name],
                        ...action.data,
                    },
                },
            };
        case "DELETE_VOLUME":
            return { ...state, volumes: withoutKey(state.volumes, action.name) };
        case "ADD_SECRET":
            return {
                ...state,
                secrets: {
                    ...state.secrets,
                    [action.name]: {
                        file: "",
                        external: false,
                        ...(action.position ? { _position: action.position } : {}),
                    },
                },
            };
        case "UPDATE_SECRET":
            return {
                ...state,
                secrets: {
                    ...state.secrets,
                    [action.name]: {
                        ...state.secrets[action.name],
                        ...action.data,
                    },
                },
            };
        case "DELETE_SECRET":
            return { ...state, secrets: withoutKey(state.secrets, action.name) };
        case "ADD_CONFIG":
            return {
                ...state,
                configs: {
                    ...state.configs,
                    [action.name]: {
                        file: "",
                        external: false,
                        ...(action.position ? { _position: action.position } : {}),
                    },
                },
            };
        case "UPDATE_CONFIG":
            return {
                ...state,
                configs: {
                    ...state.configs,
                    [action.name]: {
                        ...state.configs[action.name],
                        ...action.data,
                    },
                },
            };
        case "DELETE_CONFIG":
            return { ...state, configs: withoutKey(state.configs, action.name) };
    }
}
