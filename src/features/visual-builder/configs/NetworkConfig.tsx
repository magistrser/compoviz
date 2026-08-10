import { Settings, Globe, Tag } from "lucide-react";
import { Input, Select, Checkbox, KeyValueEditor, Section } from "./PanelUI";
import type { ComposeResource } from "../../../models/composeTypes";

interface NetworkConfigProps {
    data: ComposeResource;
    update: (field: string, value: unknown) => void;
    updateNested: (path: string, value: unknown) => void;
}

function asRecord(value: unknown): Record<string, unknown> {
    return isRecord(value) ? value : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Network configuration panel
 */
export const NetworkConfig = ({ data, update, updateNested }: NetworkConfigProps) => {
    const ipam = asRecord(data.ipam);
    const ipamConfig = Array.isArray(ipam.config) ? asRecord(ipam.config[0]) : {};
    return (
        <div className="config-sections">
            <Section
                title="Configuration"
                icon={Settings}
                defaultOpen={true}
            >
                <Select
                    label="Driver"
                    value={data.driver}
                    onChange={(v) => update("driver", v)}
                    placeholder="Select network driver..."
                    options={[
                        { value: "bridge", label: "bridge - Default bridge network" },
                        { value: "host", label: "host - Use host networking" },
                        { value: "overlay", label: "overlay - Multi-host overlay" },
                        { value: "macvlan", label: "macvlan - MAC address assignment" },
                        { value: "none", label: "none - No networking" },
                        { value: "ipvlan", label: "ipvlan - IP address assignment" },
                    ]}
                    tooltip="Network driver to use"
                />
                <Input
                    label="External Name"
                    value={data.name}
                    onChange={(v) => update("name", v)}
                    placeholder="external-network-name"
                    tooltip="External network name"
                />
                <Checkbox
                    label="External Network"
                    checked={data.external}
                    onChange={(v) => update("external", v)}
                    tooltip="Use pre-existing network"
                />
                <Checkbox
                    label="Internal"
                    checked={data.internal}
                    onChange={(v) => update("internal", v)}
                    tooltip="Restrict external access"
                />
                <Checkbox
                    label="Attachable"
                    checked={data.attachable}
                    onChange={(v) => update("attachable", v)}
                    tooltip="Allow manual container attachment"
                />
                <Checkbox
                    label="Enable IPv6"
                    checked={data.enable_ipv6}
                    onChange={(v) => update("enable_ipv6", v)}
                    tooltip="Enable IPv6 networking"
                />
            </Section>

            <Section
                title="IPAM Configuration"
                icon={Globe}
            >
                <Select
                    label="IPAM Driver"
                    value={ipam.driver}
                    onChange={(v) => updateNested("ipam.driver", v)}
                    placeholder="Select IPAM driver..."
                    options={["default", "null"]}
                    tooltip="IP Address Management driver"
                />
                <Input
                    label="Subnet"
                    value={ipamConfig.subnet}
                    onChange={(v) => updateNested("ipam.config", [{ ...ipamConfig, subnet: v }])}
                    placeholder="172.28.0.0/16"
                    tooltip="Subnet in CIDR format"
                />
                <Input
                    label="IP Range"
                    value={ipamConfig.ip_range}
                    onChange={(v) => updateNested("ipam.config", [{ ...ipamConfig, ip_range: v }])}
                    placeholder="172.28.5.0/24"
                    tooltip="IP range for allocation"
                />
                <Input
                    label="Gateway"
                    value={ipamConfig.gateway}
                    onChange={(v) => updateNested("ipam.config", [{ ...ipamConfig, gateway: v }])}
                    placeholder="172.28.0.1"
                    tooltip="Gateway address"
                />
            </Section>

            <Section
                title="Driver Options"
                icon={Settings}
            >
                <KeyValueEditor
                    label="Driver Options"
                    value={data.driver_opts}
                    onChange={(v) => update("driver_opts", v)}
                    keyPlaceholder="com.docker.network.bridge.name"
                    valuePlaceholder="br0"
                    tooltip="Driver-specific options"
                />
            </Section>

            <Section
                title="Labels"
                icon={Tag}
            >
                <KeyValueEditor
                    label="Network Labels"
                    value={data.labels}
                    onChange={(v) => update("labels", v)}
                    keyPlaceholder="label.key"
                    valuePlaceholder="value"
                    tooltip="Labels to add to the network"
                />
            </Section>
        </div>
    );
};

export default NetworkConfig;
