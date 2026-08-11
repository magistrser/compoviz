import { memo } from "react";
import { Handle, type Node, type NodeProps } from "@xyflow/react";
import { Database } from "lucide-react";
import { BUILDER_OUTPUT_POSITION } from "../../utils/builderConnectionGeometry";

interface VolumeNodeData extends Record<string, unknown> {
    name: string;
    driver?: string;
    external?: boolean;
    suggestionCount?: number;
    suggestionSeverity?: string | null;
}

const VolumeNode = memo(({ data, selected }: NodeProps<Node<VolumeNodeData>>) => {
    const { name, driver = "local", external = false, suggestionCount = 0, suggestionSeverity = null } = data;

    return (
        <div className={`builder-node volume-node node-animate ${selected ? "selected" : ""}`}>
            <Handle
                type="source"
                position={BUILDER_OUTPUT_POSITION}
                className="builder-handle relationship-handle handle-volume-out"
                id="volume-out"
            />

            <div className="node-content">
                <Database
                    size={18}
                    className="node-icon"
                />
                <span className="node-title">{name}</span>
                {suggestionCount > 0 && (
                    <span
                        className={`suggestion-badge severity-${suggestionSeverity}`}
                        title={`${suggestionCount} suggestion${suggestionCount > 1 ? "s" : ""}`}
                    >
                        {suggestionCount}
                    </span>
                )}
                <span className="node-subtitle">{external ? "external" : driver}</span>
            </div>
        </div>
    );
});

VolumeNode.displayName = "VolumeNode";
export default VolumeNode;
