import { Network as NetworkIcon, Settings, Globe, Tag } from "lucide-react";
import { Input, Select, Section, KeyValueEditor, Badge } from "../../../components/ui";
import type { ComposeResource } from "../../../models/composeTypes";

function asRecord(value: unknown): Record<string, unknown> {
    return isRecord(value) ? value : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Network configuration editor
 */
export const NetworkEditor = ({
    name,
    network,
    onUpdate,
}: {
    name: string;
    network: ComposeResource;
    onUpdate: (network: ComposeResource) => void;
}) => {
    const update = (field: string, value: unknown) => onUpdate({ ...network, [field]: value });
    const ipam = asRecord(network.ipam);
    const config = Array.isArray(ipam.config) ? asRecord(ipam.config[0]) : {};

    return (
        <div className="space-y-4 animate-slide-in">
            <div className="flex items-center justify-between pb-3 border-b border-border/50">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <NetworkIcon className="text-success" />
                    {name}
                </h2>
                <Badge type="success">Network</Badge>
            </div>

            <Section
                title="Configuration"
                icon={Settings}
            >
                <Select
                    label="Driver"
                    value={network.driver}
                    onChange={(v) => update("driver", v)}
                    placeholder="Select network driver..."
                    options={[
                        { value: "bridge", label: "bridge - Default bridge network" },
                        { value: "host", label: "host - Use host networking" },
                        { value: "overlay", label: "overlay - Multi-host overlay" },
                        { value: "macvlan", label: "macvlan - MAC address assignment" },
                        { value: "none", label: "none - No networking" },
                    ]}
                />
                <Input
                    label="External Name"
                    value={network.name}
                    onChange={(v) => update("name", v)}
                    placeholder="external-network-name"
                />
                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={network.external === true}
                        onChange={(e) => update("external", e.target.checked)}
                        className="rounded"
                    />
                    External Network
                </label>
            </Section>

            <Section
                title="IPAM"
                icon={Globe}
                defaultOpen={false}
            >
                <Input
                    label="Subnet"
                    value={config.subnet}
                    onChange={(v) => update("ipam", { driver: "default", config: [{ subnet: v }] })}
                    placeholder="172.28.0.0/16"
                />
            </Section>

            <Section
                title="Labels"
                icon={Tag}
                defaultOpen={false}
            >
                <KeyValueEditor
                    label="Network Labels"
                    value={network.labels}
                    onChange={(v) => update("labels", v)}
                />
            </Section>
        </div>
    );
};

export default NetworkEditor;
