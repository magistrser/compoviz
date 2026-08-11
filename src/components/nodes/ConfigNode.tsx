import { memo } from "react";
import { Handle, type Node, type NodeProps } from "@xyflow/react";
import { FileText } from "lucide-react";
import { BUILDER_OUTPUT_POSITION } from "../../utils/builderConnectionGeometry";

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
                type="source"
                position={BUILDER_OUTPUT_POSITION}
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
