/** Convert parsed Compose data into the canonical, immutable read model. */

import {
    AST_VERSION,
    DependencyConditions,
    MountTypes,
    ServiceRoles,
    ServiceTiers,
    type BuildInfo,
    type ComposeAST,
    type Dependency,
    type DependencyCondition,
    type DeployConfig,
    type Healthcheck,
    type NetworkAttachment,
    type PersistenceMount,
    type PortBinding,
    type RawComposeObject,
    type ServiceClassification,
    type ServiceNode,
    type StringMap,
} from "./ComposeAST";
import { getServiceEmoji } from "../utils/iconUtils";

type UnknownRecord = Record<string, unknown>;

interface NormalizeOptions {
    enrichment?: unknown;
}

function isRecord(value: unknown): value is UnknownRecord {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): UnknownRecord {
    return isRecord(value) ? value : {};
}

function unwrap(value: unknown): unknown {
    if (isRecord(value) && "_value" in value) {
        return value._value;
    }
    return value;
}

function asString(value: unknown, fallback = ""): string {
    const unwrapped = unwrap(value);
    return typeof unwrapped === "string" ? unwrapped : fallback;
}

function normalizeStringArray(value: unknown): string[] {
    const unwrapped = unwrap(value);
    if (!Array.isArray(unwrapped)) return [];
    return unwrapped.map((entry) => String(unwrap(entry)));
}

function parseStringMap(value: unknown): StringMap {
    if (!isRecord(value)) return {};
    return Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [key, entry == null ? "" : String(unwrap(entry))]),
    );
}

function parsePort(portRaw: unknown): PortBinding {
    const port = unwrap(portRaw);
    const raw = typeof port === "string" ? port : JSON.stringify(port);

    if (isRecord(port)) {
        return {
            hostIp: asString(port.host_ip, "0.0.0.0"),
            hostPort: toPortValue(port.published ?? port.target),
            containerPort: toPortValue(port.target),
            protocol: asString(port.protocol, "tcp"),
            raw,
        };
    }

    const portString = String(port);
    let hostIp = "0.0.0.0";
    let hostPort = "";
    let containerPort = "";
    let protocol = "tcp";

    const protocolMatch = portString.match(/\/(tcp|udp|sctp)$/i);
    const matchedProtocol = protocolMatch?.[1];
    if (matchedProtocol) protocol = matchedProtocol.toLowerCase();
    const withoutProtocol = portString.replace(/\/(tcp|udp|sctp)$/i, "");

    if (withoutProtocol.startsWith("[")) {
        const closeBracket = withoutProtocol.indexOf("]");
        if (closeBracket !== -1) {
            hostIp = withoutProtocol.substring(1, closeBracket);
            const parts = withoutProtocol.substring(closeBracket + 2).split(":");
            if (parts.length === 2) {
                hostPort = parts[0] ?? "";
                containerPort = parts[1] ?? "";
            } else if (parts.length === 1) {
                hostPort = parts[0] ?? "";
                containerPort = hostPort;
            }
        }
    } else {
        const parts = withoutProtocol.split(":");
        if (parts.length === 1) {
            containerPort = parts[0] ?? "";
            hostPort = containerPort;
        } else if (parts.length === 2) {
            hostPort = parts[0] ?? "";
            containerPort = parts[1] ?? "";
        } else if (parts.length === 3) {
            hostIp = parts[0] ?? "";
            hostPort = parts[1] ?? "";
            containerPort = parts[2] ?? "";
        }
    }

    return { hostIp, hostPort, containerPort, protocol, raw };
}

function toPortValue(value: unknown): string | number {
    return typeof value === "string" || typeof value === "number" ? value : "";
}

function parseDependencyCondition(value: unknown): DependencyCondition {
    return Object.values(DependencyConditions).includes(value as DependencyCondition)
        ? (value as DependencyCondition)
        : DependencyConditions.STARTED;
}

function parseDependencies(dependsOn: unknown): Dependency[] {
    if (Array.isArray(dependsOn)) {
        return dependsOn.map((name) => ({
            service: String(unwrap(name)),
            condition: DependencyConditions.STARTED,
            restart: false,
        }));
    }
    if (!isRecord(dependsOn)) return [];

    return Object.entries(dependsOn).map(([name, value]) => {
        const config = asRecord(value);
        return {
            service: name,
            condition: parseDependencyCondition(config.condition),
            restart: config.restart === true,
        };
    });
}

function parseNetworkAttachments(networks: unknown): NetworkAttachment[] {
    if (Array.isArray(networks)) {
        return networks.map((network) => ({
            network: String(unwrap(network)),
            aliases: [],
            ipv4Address: null,
            ipv6Address: null,
            priority: null,
        }));
    }
    if (!isRecord(networks)) return [];

    return Object.entries(networks).map(([name, value]) => {
        const config = asRecord(value);
        return {
            network: name,
            aliases: normalizeStringArray(config.aliases),
            ipv4Address: nullableString(config.ipv4_address),
            ipv6Address: nullableString(config.ipv6_address),
            priority: typeof config.priority === "number" ? config.priority : null,
        };
    });
}

function nullableString(value: unknown): string | null {
    const unwrapped = unwrap(value);
    return typeof unwrapped === "string" ? unwrapped : null;
}

function parseVolumeMount(volumeRaw: unknown): PersistenceMount {
    const volume = unwrap(volumeRaw);
    const raw = typeof volume === "string" ? volume : JSON.stringify(volume);

    if (isRecord(volume)) {
        return {
            type: parseMountType(volume.type),
            source: asString(volume.source),
            target: asString(volume.target),
            readOnly: volume.read_only === true,
            raw,
        };
    }

    const [source = "", target = "", options = ""] = String(volume).split(":");
    const type =
        source.startsWith(".") || source.startsWith("/") || source.startsWith("~")
            ? MountTypes.BIND
            : MountTypes.VOLUME;
    return { type, source, target, readOnly: options.includes("ro"), raw };
}

function parseMountType(value: unknown): PersistenceMount["type"] {
    return Object.values(MountTypes).includes(value as PersistenceMount["type"])
        ? (value as PersistenceMount["type"])
        : MountTypes.VOLUME;
}

function parseBuildInfo(build: unknown): BuildInfo | null {
    if (!build) return null;
    if (typeof build === "string") {
        return {
            context: build,
            dockerfile: "Dockerfile",
            target: null,
            args: {},
            cacheFrom: [],
        };
    }
    if (!isRecord(build)) return null;

    return {
        context: asString(build.context, "."),
        dockerfile: asString(build.dockerfile, "Dockerfile"),
        target: nullableString(build.target),
        args: parseStringMap(build.args),
        cacheFrom: normalizeStringArray(build.cache_from),
    };
}

function parseHealthcheck(value: unknown): Healthcheck | null {
    if (!isRecord(value)) return null;
    if (value.disable === true) {
        return {
            test: [],
            interval: null,
            timeout: null,
            retries: null,
            startPeriod: null,
            disabled: true,
        };
    }
    const test = typeof value.test === "string" ? ["CMD-SHELL", value.test] : normalizeStringArray(value.test);
    return {
        test,
        interval: nullableString(value.interval),
        timeout: nullableString(value.timeout),
        retries: typeof value.retries === "number" ? value.retries : null,
        startPeriod: nullableString(value.start_period),
        disabled: false,
    };
}

function parseDeployConfig(value: unknown): DeployConfig | null {
    if (!isRecord(value)) return null;
    const resources = asRecord(value.resources);
    const limits = asRecord(resources.limits);
    const reservations = asRecord(resources.reservations);
    const restartPolicy = asRecord(value.restart_policy);
    return {
        limits: {
            cpus: nullableScalarString(limits.cpus),
            memory: nullableScalarString(limits.memory),
        },
        reservations: {
            cpus: nullableScalarString(reservations.cpus),
            memory: nullableScalarString(reservations.memory),
        },
        replicas: typeof value.replicas === "number" ? value.replicas : null,
        restartPolicy: nullableString(restartPolicy.condition),
    };
}

function nullableScalarString(value: unknown): string | null {
    return typeof value === "string" || typeof value === "number" ? String(value) : null;
}

function parseEnvironment(environment: unknown): StringMap {
    if (Array.isArray(environment)) {
        return Object.fromEntries(
            environment.map((entry) => {
                const value = String(unwrap(entry));
                const separator = value.indexOf("=");
                return separator === -1 ? [value, ""] : [value.substring(0, separator), value.substring(separator + 1)];
            }),
        );
    }
    return parseStringMap(environment);
}

const CLASSIFICATION_PATTERNS: Record<string, string[]> = {
    database: [
        "postgres",
        "mysql",
        "mariadb",
        "mongo",
        "cockroach",
        "timescale",
        "cassandra",
        "influx",
        "neo4j",
        "couchdb",
        "rethinkdb",
    ],
    cache: ["redis", "memcached", "varnish", "hazelcast"],
    queue: ["rabbitmq", "kafka", "nats", "activemq", "zeromq", "pulsar"],
    proxy: ["traefik", "nginx", "haproxy", "caddy", "envoy", "kong", "gateway", "ambassador"],
    monitoring: [
        "prometheus",
        "grafana",
        "jaeger",
        "zipkin",
        "datadog",
        "newrelic",
        "elastic",
        "kibana",
        "logstash",
        "fluentd",
    ],
    storage: ["minio", "ceph", "gluster", "nfs"],
};

function classifyService(name: string, image: string | null, ports: PortBinding[]): ServiceClassification {
    const search = `${image ?? ""} ${name}`.toLowerCase();
    for (const [role, patterns] of Object.entries(CLASSIFICATION_PATTERNS)) {
        if (!patterns.some((pattern) => search.includes(pattern))) continue;

        const tier =
            role === "database" || role === "cache" || role === "storage" || role === "queue"
                ? ServiceTiers.PERSISTENCE
                : role === "proxy"
                  ? ServiceTiers.ROUTING
                  : ServiceTiers.APPLICATION;
        return {
            tier,
            role: parseServiceRole(role),
            icon: getServiceEmoji(name, image),
        };
    }

    const webPorts = ["80", "443", "8080", "8443", "4443"];
    const hasWebPorts = ports.some(
        (port) => webPorts.includes(String(port.hostPort)) || webPorts.includes(String(port.containerPort)),
    );
    return {
        tier: hasWebPorts ? ServiceTiers.ROUTING : ServiceTiers.APPLICATION,
        role: hasWebPorts ? ServiceRoles.WEBSERVER : ServiceRoles.APPLICATION,
        icon: getServiceEmoji(name, image),
    };
}

function parseServiceRole(value: string): ServiceClassification["role"] {
    return Object.values(ServiceRoles).includes(value as ServiceClassification["role"])
        ? (value as ServiceClassification["role"])
        : ServiceRoles.APPLICATION;
}

function parseResourceReferences(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value
        .map((entry) => {
            const unwrapped = unwrap(entry);
            return typeof unwrapped === "string" ? unwrapped : asString(asRecord(unwrapped).source);
        })
        .filter(Boolean);
}

function parseEnvFiles(value: unknown): string[] {
    if (typeof value === "string") return [value];
    if (!Array.isArray(value)) return [];
    return value
        .map((entry) => {
            const unwrapped = unwrap(entry);
            return typeof unwrapped === "string" ? unwrapped : asString(asRecord(unwrapped).path);
        })
        .filter(Boolean);
}

export function normalizeToAST(composeInput: unknown, options: NormalizeOptions = {}): ComposeAST {
    if (!isRecord(composeInput)) return createEmptyAST();

    const compose = composeInput;
    const enrichment = asRecord(options.enrichment ?? compose);
    const enrichedServices = asRecord(enrichment.services);
    const rawServices = asRecord(compose.services);
    const rawNetworks = asRecord(compose.networks);
    const rawVolumes = asRecord(compose.volumes);
    const rawSecrets = asRecord(compose.secrets);
    const rawConfigs = asRecord(compose.configs);

    const services = Object.entries(rawServices).map(([name, value]) => {
        if (!isRecord(value)) return createEmptyServiceNode(name);
        const service = value;
        const image = nullableString(unwrap(service.image));
        const ports = normalizeUnknownArray(service.ports).map(parsePort);
        const enrichedService = isRecord(enrichedServices[name]) ? enrichedServices[name] : service;
        const resolvedPorts = normalizeUnknownArray(enrichedService._resolvedPorts).map((entry): PortBinding => {
            const resolved = asRecord(entry);
            const port = String(toPortValue(resolved.port));
            const protocol = asString(resolved.protocol, "tcp");
            return {
                hostIp: "0.0.0.0",
                hostPort: port,
                containerPort: port,
                protocol,
                raw: `${port}/${protocol}`,
            };
        });
        const resolvedImage = nullableString(enrichedService._resolvedImage);
        const runtime = {
            resolvedImage,
            resolvedPorts,
            enriched: resolvedImage !== null || resolvedPorts.length > 0,
        };

        return {
            id: name,
            image,
            build: parseBuildInfo(service.build),
            containerName: nullableString(service.container_name),
            ports,
            dependencies: parseDependencies(service.depends_on),
            networks: parseNetworkAttachments(service.networks),
            volumes: normalizeUnknownArray(service.volumes).map(parseVolumeMount),
            secrets: parseResourceReferences(service.secrets),
            configs: parseResourceReferences(service.configs),
            environment: parseEnvironment(service.environment),
            envFiles: parseEnvFiles(service.env_file),
            profiles: normalizeStringArray(service.profiles),
            healthcheck: parseHealthcheck(service.healthcheck),
            deploy: parseDeployConfig(service.deploy),
            restart: nullableString(service.restart),
            user: nullableString(service.user),
            privileged: service.privileged === true,
            labels: parseLabels(service.labels),
            classification: classifyService(name, image ?? resolvedImage, ports),
            runtime,
            _raw: service,
        } satisfies ServiceNode;
    });

    const networks = Object.entries(rawNetworks).map(([name, value]) => {
        const config = asRecord(value);
        return {
            id: name,
            driver: asString(config.driver, "bridge"),
            external: config.external === true || isRecord(config.external),
            internal: config.internal === true,
            attachable: config.attachable === true,
            labels: parseLabels(config.labels),
            _raw: value,
        };
    });
    const volumes = Object.entries(rawVolumes).map(([name, value]) => {
        const config = asRecord(value);
        return {
            id: name,
            driver: asString(config.driver, "local"),
            driverOpts: parseStringMap(config.driver_opts),
            external: config.external === true || isRecord(config.external),
            labels: parseLabels(config.labels),
            _raw: value,
        };
    });
    const secrets = Object.entries(rawSecrets).map(([name, value]) => {
        const config = asRecord(value);
        return {
            id: name,
            file: nullableString(config.file),
            external: config.external === true || isRecord(config.external),
            _raw: value,
        };
    });
    const configs = Object.entries(rawConfigs).map(([name, value]) => {
        const config = asRecord(value);
        return {
            id: name,
            file: nullableString(config.file),
            external: config.external === true || isRecord(config.external),
            _raw: value,
        };
    });

    return {
        _version: AST_VERSION,
        name: asString(compose.name),
        services,
        networks,
        volumes,
        secrets,
        configs,
        serviceMap: new Map(services.map((service) => [service.id, service])),
        networkMap: new Map(networks.map((network) => [network.id, network])),
        volumeMap: new Map(volumes.map((volume) => [volume.id, volume])),
    };
}

function normalizeUnknownArray(value: unknown): unknown[] {
    const unwrapped = unwrap(value);
    return Array.isArray(unwrapped) ? unwrapped : [];
}

function parseLabels(value: unknown): StringMap {
    if (!Array.isArray(value)) return parseStringMap(value);
    return Object.fromEntries(
        value.map((entry) => {
            const label = String(unwrap(entry));
            const separator = label.indexOf("=");
            return separator === -1 ? [label, ""] : [label.substring(0, separator), label.substring(separator + 1)];
        }),
    );
}

function createEmptyAST(): ComposeAST {
    return {
        _version: AST_VERSION,
        name: "",
        services: [],
        networks: [],
        volumes: [],
        secrets: [],
        configs: [],
        serviceMap: new Map(),
        networkMap: new Map(),
        volumeMap: new Map(),
    };
}

function createEmptyServiceNode(name: string): ServiceNode {
    return {
        id: name,
        image: null,
        build: null,
        containerName: null,
        ports: [],
        dependencies: [],
        networks: [],
        volumes: [],
        secrets: [],
        configs: [],
        environment: {},
        envFiles: [],
        profiles: [],
        healthcheck: null,
        deploy: null,
        restart: null,
        user: null,
        privileged: false,
        labels: {},
        classification: {
            tier: ServiceTiers.APPLICATION,
            role: ServiceRoles.APPLICATION,
            icon: "📦",
        },
        runtime: { resolvedImage: null, resolvedPorts: [], enriched: false },
        _raw: {},
    };
}

export type { RawComposeObject };
