import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { FileText } from "lucide-react";

interface ConfigNodeData extends Record<string, unknown> {
    name: string;
    file?: string | null;
    external?: boolean;
}

const ConfigNode = memo(({ data, selected }: NodeProps<Node<ConfigNodeData>>) => {
    const { name, file, external = false } = data;

    return (
        <div className={`builder-node config-node node-animate ${selected ? "selected" : ""}`}>
            <Handle
                type="target"
                position={Position.Left}
                className="builder-handle node-handle-hidden"
                id="services"
            />

            <div className="node-content">
                <FileText
                    size={18}
                    className="node-icon"
                />
                <span className="node-title">{name}</span>
                <span className="node-subtitle">{external ? "external" : file ? "file" : "config"}</span>
            </div>
        </div>
    );
});

ConfigNode.displayName = "ConfigNode";
export default ConfigNode;
