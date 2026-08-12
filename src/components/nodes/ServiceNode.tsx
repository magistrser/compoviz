import { memo } from "react";
import { Handle, type Node, type NodeProps } from "@xyflow/react";
import { Heart, FileText, Globe, RotateCcw } from "lucide-react";
import { BUILDER_INPUT_POSITION, BUILDER_OUTPUT_POSITION } from "../../utils/builderConnectionGeometry";
import { getServiceIcon, renderServiceIcon } from "../../utils/iconUtils";

/**
 * Service node — shows image, ports, restart policy, health, network count.
 * Relationship terminals stay visible and color-coded so different wire types remain distinct.
 */
interface ServiceNodeData extends Record<string, unknown> {
    name: string;
    image: string | null;
    ports?: Array<string | { published?: string | number }>;
    hasHealthcheck?: boolean;
    hasEnvFile?: boolean;
    networks?: string[];
    restart?: string;
    container_name?: string;
    suggestionCount?: number;
    suggestionSeverity?: string | null;
}

const ServiceNode = memo(({ data, selected }: NodeProps<Node<ServiceNodeData>>) => {
    const {
        name,
        image,
        ports = [],
        hasHealthcheck,
        hasEnvFile,
        networks = [],
        restart,
        container_name,
        suggestionCount = 0,
        suggestionSeverity = null,
    } = data;

    const portDisplay = ports
        .slice(0, 2)
        .map((p) => {
            if (typeof p === "string") {
                const parts = p.split(":");
                return parts[0] ?? "";
            }
            return p.published ?? "";
        })
        .join(", ");

    const iconData = getServiceIcon(name, image);

    return (
        <div className={`builder-node service-node node-animate ${selected ? "selected" : ""}`}>
            <Handle
                type="target"
                position={BUILDER_INPUT_POSITION}
                className="builder-handle relationship-handle handle-deps-in"
                id="deps-in"
                style={{ top: "37.5%" }}
            />
            <Handle
                type="target"
                position={BUILDER_INPUT_POSITION}
                className="builder-handle relationship-handle handle-network-in"
                id="network-in"
                style={{ top: "50%" }}
            />
            <Handle
                type="target"
                position={BUILDER_INPUT_POSITION}
                className="builder-handle relationship-handle handle-volume-in"
                id="volume-in"
                style={{ top: "62.5%" }}
            />

            {/* Header */}
            <div className="node-header service-header">
                {renderServiceIcon(iconData, "node-icon")}
                <span className="node-title ml-1">{name}</span>
                {suggestionCount > 0 && (
                    <span
                        className={`suggestion-badge severity-${suggestionSeverity}`}
                        title={`${suggestionCount} suggestion${suggestionCount > 1 ? "s" : ""}`}
                    >
                        {suggestionCount}
                    </span>
                )}
            </div>

            {/* Body */}
            <div className="node-body">
                {image && (
                    <div className="node-field">
                        <span className="field-label">image</span>
                        <span className="field-value">{image}</span>
                    </div>
                )}

                {container_name && (
                    <div className="node-field">
                        <span className="field-label">name</span>
                        <span className="field-value">{container_name}</span>
                    </div>
                )}

                {portDisplay && (
                    <div className="node-field">
                        <span className="field-label">ports</span>
                        <span className="field-value">
                            {portDisplay}
                            {ports.length > 2 ? ` +${ports.length - 2}` : ""}
                        </span>
                    </div>
                )}

                {/* Status indicators */}
                <div className="node-indicators">
                    {restart && restart !== "no" && (
                        <span
                            className="indicator"
                            title={`Restart: ${restart}`}
                        >
                            <RotateCcw size={11} />
                        </span>
                    )}
                    {hasHealthcheck && (
                        <span
                            className="indicator indicator-active"
                            title="Has healthcheck"
                        >
                            <Heart size={11} />
                        </span>
                    )}
                    {hasEnvFile && (
                        <span
                            className="indicator"
                            title="Has env file"
                        >
                            <FileText size={11} />
                        </span>
                    )}
                    {networks.length > 0 && (
                        <span
                            className="indicator"
                            title={`Networks: ${networks.join(", ")}`}
                        >
                            <Globe size={11} />
                            <span className="indicator-count">{networks.length}</span>
                        </span>
                    )}
                </div>
            </div>

            <Handle
                type="source"
                position={BUILDER_OUTPUT_POSITION}
                className="builder-handle relationship-handle handle-deps-out"
                id="deps-out"
                style={{ top: "37.5%" }}
            />
        </div>
    );
});

ServiceNode.displayName = "ServiceNode";

export default ServiceNode;
