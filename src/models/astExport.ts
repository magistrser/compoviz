/** Convert the canonical AST back into a Compose-compatible object. */

import {
    DependencyConditions,
    type BuildInfo,
    type ComposeAST,
    type ConfigNode,
    type DeployConfig,
    type NetworkNode,
    type RawComposeObject,
    type SecretNode,
    type ServiceNode,
    type VolumeNode,
} from "./ComposeAST";

export interface ExportOptions {
    useRaw?: boolean;
    minimal?: boolean;
}

export function exportToCompose(ast: ComposeAST, options: ExportOptions = {}): RawComposeObject {
    const { useRaw = true, minimal = false } = options;
    const compose: RawComposeObject = {};

    if (ast.name) compose.name = ast.name;
    if (ast.services.length > 0) {
        const services: Record<string, unknown> = {};
        for (const service of ast.services) {
            services[service.id] =
                useRaw && Object.keys(service._raw).length > 0 ? service._raw : exportService(service, minimal);
        }
        compose.services = services;
    }
    if (ast.networks.length > 0) {
        const networks: Record<string, unknown> = {};
        for (const network of ast.networks) {
            networks[network.id] = useRaw && network._raw ? network._raw : exportNetwork(network, minimal);
        }
        compose.networks = networks;
    }
    if (ast.volumes.length > 0) {
        const volumes: Record<string, unknown> = {};
        for (const volume of ast.volumes) {
            volumes[volume.id] = useRaw && volume._raw ? volume._raw : exportVolume(volume, minimal);
        }
        compose.volumes = volumes;
    }
    if (ast.secrets.length > 0) {
        const secrets: Record<string, unknown> = {};
        for (const secret of ast.secrets) {
            secrets[secret.id] = useRaw && secret._raw ? secret._raw : exportSecret(secret);
        }
        compose.secrets = secrets;
    }
    if (ast.configs.length > 0) {
        const configs: Record<string, unknown> = {};
        for (const config of ast.configs) {
            configs[config.id] = useRaw && config._raw ? config._raw : exportConfig(config);
        }
        compose.configs = configs;
    }

    return compose;
}

function exportService(service: ServiceNode, minimal: boolean): RawComposeObject {
    const result: RawComposeObject = {};
    if (service.image) result.image = service.image;
    if (service.build) result.build = exportBuild(service.build, minimal);
    if (service.containerName) result.container_name = service.containerName;
    if (service.ports.length > 0) result.ports = service.ports.map((port) => port.raw);

    if (service.dependencies.length > 0) {
        const allSimple = service.dependencies.every(
            (dependency) => dependency.condition === DependencyConditions.STARTED && !dependency.restart,
        );
        if (allSimple) {
            result.depends_on = service.dependencies.map((dependency) => dependency.service);
        } else {
            result.depends_on = Object.fromEntries(
                service.dependencies.map((dependency) => [dependency.service, { condition: dependency.condition }]),
            );
        }
    }

    if (service.networks.length > 0) {
        const allSimple = service.networks.every(
            (network) => network.aliases.length === 0 && !network.ipv4Address && !network.ipv6Address,
        );
        if (allSimple) {
            result.networks = service.networks.map((network) => network.network);
        } else {
            result.networks = Object.fromEntries(
                service.networks.map((network) => {
                    const config: RawComposeObject = {};
                    if (network.aliases.length > 0) config.aliases = network.aliases;
                    if (network.ipv4Address) config.ipv4_address = network.ipv4Address;
                    if (network.ipv6Address) config.ipv6_address = network.ipv6Address;
                    return [network.network, Object.keys(config).length > 0 ? config : null];
                }),
            );
        }
    }

    if (service.volumes.length > 0) result.volumes = service.volumes.map((volume) => volume.raw);
    if (Object.keys(service.environment).length > 0) result.environment = { ...service.environment };
    if (service.envFiles.length > 0)
        result.env_file = service.envFiles.length === 1 ? service.envFiles[0] : service.envFiles;
    if (service.secrets.length > 0) result.secrets = [...service.secrets];
    if (service.configs.length > 0) result.configs = [...service.configs];
    if (service.profiles.length > 0) result.profiles = [...service.profiles];

    if (service.healthcheck?.disabled) {
        result.healthcheck = { disable: true };
    } else if (service.healthcheck) {
        const healthcheck: RawComposeObject = { test: service.healthcheck.test };
        if (service.healthcheck.interval) healthcheck.interval = service.healthcheck.interval;
        if (service.healthcheck.timeout) healthcheck.timeout = service.healthcheck.timeout;
        if (service.healthcheck.retries !== null) healthcheck.retries = service.healthcheck.retries;
        if (service.healthcheck.startPeriod) healthcheck.start_period = service.healthcheck.startPeriod;
        result.healthcheck = healthcheck;
    }
    if (service.deploy && !minimal) result.deploy = exportDeploy(service.deploy);
    if (service.restart) result.restart = service.restart;
    if (service.user) result.user = service.user;
    if (service.privileged) result.privileged = true;
    if (Object.keys(service.labels).length > 0) result.labels = { ...service.labels };
    return result;
}

function exportBuild(build: BuildInfo, minimal: boolean): string | RawComposeObject {
    if (minimal && build.dockerfile === "Dockerfile" && !build.target && Object.keys(build.args).length === 0) {
        return build.context;
    }
    const result: RawComposeObject = { context: build.context };
    if (build.dockerfile !== "Dockerfile") result.dockerfile = build.dockerfile;
    if (build.target) result.target = build.target;
    if (Object.keys(build.args).length > 0) result.args = { ...build.args };
    if (build.cacheFrom.length > 0) result.cache_from = [...build.cacheFrom];
    return result;
}

function exportDeploy(deploy: DeployConfig): RawComposeObject | undefined {
    const result: RawComposeObject = {};
    if (deploy.replicas !== null) result.replicas = deploy.replicas;
    if (deploy.restartPolicy) result.restart_policy = { condition: deploy.restartPolicy };

    const resources: RawComposeObject = {};
    const limits: RawComposeObject = {};
    const reservations: RawComposeObject = {};
    if (deploy.limits.cpus) limits.cpus = deploy.limits.cpus;
    if (deploy.limits.memory) limits.memory = deploy.limits.memory;
    if (deploy.reservations.cpus) reservations.cpus = deploy.reservations.cpus;
    if (deploy.reservations.memory) reservations.memory = deploy.reservations.memory;
    if (Object.keys(limits).length > 0) resources.limits = limits;
    if (Object.keys(reservations).length > 0) resources.reservations = reservations;
    if (Object.keys(resources).length > 0) result.resources = resources;
    return Object.keys(result).length > 0 ? result : undefined;
}

function exportNetwork(network: NetworkNode, minimal: boolean): RawComposeObject {
    if (minimal && network.driver === "bridge" && !network.external && !network.internal) return {};
    const result: RawComposeObject = {};
    if (network.driver !== "bridge") result.driver = network.driver;
    if (network.external) result.external = true;
    if (network.internal) result.internal = true;
    if (network.attachable) result.attachable = true;
    if (Object.keys(network.labels).length > 0) result.labels = { ...network.labels };
    return result;
}

function exportVolume(volume: VolumeNode, minimal: boolean): RawComposeObject {
    if (minimal && volume.driver === "local" && !volume.external && Object.keys(volume.driverOpts).length === 0)
        return {};
    const result: RawComposeObject = {};
    if (volume.driver !== "local") result.driver = volume.driver;
    if (Object.keys(volume.driverOpts).length > 0) result.driver_opts = { ...volume.driverOpts };
    if (volume.external) result.external = true;
    if (Object.keys(volume.labels).length > 0) result.labels = { ...volume.labels };
    return result;
}

function exportSecret(secret: SecretNode): RawComposeObject {
    const result: RawComposeObject = {};
    if (secret.file) result.file = secret.file;
    if (secret.external) result.external = true;
    return result;
}

function exportConfig(config: ConfigNode): RawComposeObject {
    const result: RawComposeObject = {};
    if (config.file) result.file = config.file;
    if (config.external) result.external = true;
    return result;
}
