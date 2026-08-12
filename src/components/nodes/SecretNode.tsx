import { memo } from "react";
import { Handle, type Node, type NodeProps } from "@xyflow/react";
import { Key } from "lucide-react";
import { BUILDER_OUTPUT_POSITION } from "../../utils/builderConnectionGeometry";

interface SecretNodeData extends Record<string, unknown> {
    name: string;
    file?: string | null;
    external?: boolean;
}

const SecretNode = memo(({ data, selected }: NodeProps<Node<SecretNodeData>>) => {
    const { name, file, external = false } = data;

    return (
        <div className={`builder-node secret-node node-animate ${selected ? "selected" : ""}`}>
            <Handle
                type="source"
                position={BUILDER_OUTPUT_POSITION}
                className="builder-handle node-handle-hidden"
                id="services"
                isConnectable={false}
                isConnectableStart={false}
                isConnectableEnd={false}
            />

            <div className="node-content">
                <Key
                    size={18}
                    className="node-icon"
                />
                <span className="node-title">{name}</span>
                <span className="node-subtitle">{external ? "external" : file ? "file" : "secret"}</span>
            </div>
        </div>
    );
});

SecretNode.displayName = "SecretNode";
export default SecretNode;
