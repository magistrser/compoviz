/**
 * Utility for resolving service icons.
 * Auto-discovers SVG icons from the services folder with emoji fallbacks.
 */
import type { ReactElement } from "react";

// Dynamically import ALL SVG icons from the services folder
const iconModules = import.meta.glob<string>("../assets/icons/services/*.svg", {
    eager: true,
    query: "?url",
    import: "default",
});

// Build a mapping from filename (without extension) to the SVG URL
const svgIcons: Record<string, string> = {};
for (const [path, image] of Object.entries(iconModules)) {
    // Extract filename without extension: '../assets/icons/services/postgresql.svg' -> 'postgresql'
    const filename = path.split("/").pop()?.replace(".svg", "").toLowerCase();
    if (filename) svgIcons[filename] = image;
}

// Emoji fallback mapping
const emojiIcons: Record<string, string> = {
    redis: "🔴",
    postgres: "🐘",
    postgresql: "🐘",
    mysql: "🐬",
    mongodb: "🍃",
    mongo: "🍃",
    nginx: "⚡",
    node: "💚",
    python: "🐍",
    rabbitmq: "🐰",
    go: "🔵",
    golang: "🔵",
    php: "🐘",
    apache: "🪶",
    httpd: "🪶",
    rust: "🦀",
    docker: "🐋",
    mariadb: "🐬",
    elasticsearch: "🔍",
    kibana: "📊",
    grafana: "📈",
    prometheus: "🔥",
    traefik: "🚦",
    caddy: "🔒",
    memcached: "🧠",
    java: "☕",
    dotnet: "🟣",
    ruby: "💎",
    perl: "🐪",
};

/**
 * Get the icon for a service.
 * Returns an object with type ('svg' or 'emoji') and the value.
 * @param {string} name - Service name or template key.
 * @param {string} image - Optional Docker image name for pattern matching.
 * @returns {{ type: 'svg' | 'emoji', value: string }}
 */
export interface ServiceIcon {
    type: "svg" | "emoji";
    value: string;
}

export const getServiceIcon = (name: string, image?: string | null): ServiceIcon => {
    const lowerName = name?.toLowerCase() || "";
    const lowerImage = image?.toLowerCase() || "";

    // Helper to check patterns - bidirectional matching
    const matches = (pattern: string) =>
        lowerName.includes(pattern) ||
        lowerImage.includes(pattern) ||
        pattern.includes(lowerName) ||
        pattern.includes(lowerImage.split(":")[0] ?? ""); // Match image name without tag

    // 1. Check for SVG icons first (direct match by name)
    const directSvg = svgIcons[lowerName];
    if (directSvg) return { type: "svg", value: directSvg };

    // 2. Pattern matching in name/image for SVGs
    for (const key in svgIcons) {
        const icon = svgIcons[key];
        if (icon && matches(key)) return { type: "svg", value: icon };
    }

    // 3. Direct emoji match
    const directEmoji = emojiIcons[lowerName];
    if (directEmoji) return { type: "emoji", value: directEmoji };

    // 4. Pattern matching for emojis
    for (const key in emojiIcons) {
        const icon = emojiIcons[key];
        if (icon && matches(key)) return { type: "emoji", value: icon };
    }

    // 5. Fallback
    return { type: "emoji", value: "📦" };
};

/**
 * Get emoji icon for a service (for text-based contexts like Graphviz)
 * @param {string} name - Service name
 * @param {string} image - Docker image name
 * @returns {string} Emoji character
 */
export const getServiceEmoji = (name: string, image?: string | null): string => {
    const lowerName = name?.toLowerCase() || "";
    const lowerImage = image?.toLowerCase() || "";
    const matches = (pattern: string) => lowerName.includes(pattern) || lowerImage.includes(pattern);

    // Pattern matching for emojis
    if (matches("postgres")) return "🐘";
    if (matches("mysql") || matches("mariadb")) return "🐬";
    if (matches("mongo")) return "🍃";
    if (matches("redis")) return "🔴";
    if (matches("nginx")) return "⚡";
    if (matches("node")) return "💚";
    if (matches("python")) return "🐍";
    if (matches("rabbit")) return "🐰";
    if (matches("go") || matches("golang")) return "🔵";
    if (matches("php")) return "🐘";
    if (matches("apache") || matches("httpd")) return "🪶";
    if (matches("rust")) return "🦀";
    if (matches("docker")) return "🐋";
    if (matches("elasticsearch")) return "🔍";
    if (matches("kibana")) return "📊";
    if (matches("grafana")) return "📈";
    if (matches("prometheus")) return "🔥";
    if (matches("traefik")) return "🚦";
    if (matches("caddy")) return "🔒";
    if (matches("memcached")) return "🧠";
    if (matches("java")) return "☕";
    if (matches("dotnet")) return "🟣";
    if (matches("ruby")) return "💎";
    if (matches("kafka")) return "📨";
    if (matches("minio")) return "📦";
    if (matches("consul")) return "🔧";
    if (matches("vault")) return "🔐";
    if (matches("zookeeper")) return "🦓";
    if (matches("influx")) return "📉";
    if (matches("haproxy")) return "⚖️";
    if (matches("envoy")) return "🌐";
    if (matches("kong")) return "🦍";

    return "📦";
};

/**
 * React component helper to render the icon
 * @param {{ type: 'svg' | 'emoji', value: string }} iconData
 * @param {string} className - Optional class for styling
 * @returns {JSX.Element}
 */
export const renderServiceIcon = (iconData: ServiceIcon, className = ""): ReactElement => {
    if (iconData.type === "svg") {
        return (
            <img
                src={iconData.value}
                alt="service icon"
                className={className}
                style={{ width: "1.2em", height: "1.2em", display: "inline-block", verticalAlign: "middle" }}
            />
        );
    }
    return <span className={className}>{iconData.value}</span>;
};
