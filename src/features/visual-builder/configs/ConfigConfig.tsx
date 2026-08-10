import { Settings, Tag } from "lucide-react";
import { Input, Checkbox, KeyValueEditor, Section } from "./PanelUI";
import type { ComposeResource } from "../../../models/composeTypes";

/**
 * Config file configuration panel
 */
export const ConfigConfig = ({
    data,
    update: originalUpdate,
    updateMulti,
}: {
    data: ComposeResource;
    update: (field: string, value: unknown) => void;
    updateMulti: (values: Record<string, unknown>) => void;
}) => {
    const update = (field: string, value: unknown) => {
        if (field === "content" && value) {
            updateMulti({
                content: value,
                file: "",
                external: false,
            });
        } else if (field === "file" && value) {
            updateMulti({
                file: value,
                content: "",
                external: false,
            });
        } else if (field === "external" && value) {
            updateMulti({
                external: value,
                file: "",
                content: "",
            });
        } else {
            originalUpdate(field, value);
        }
    };

    return (
        <div className="config-sections">
            <Section
                title="Configuration"
                icon={Settings}
                defaultOpen={true}
            >
                <Input
                    label="File Path"
                    value={data.file}
                    onChange={(v) => update("file", v)}
                    placeholder="./configs/my-config.conf"
                    tooltip="Path to the config file"
                />
                <Input
                    label="Content"
                    value={data.content}
                    onChange={(v) => update("content", v)}
                    placeholder="Inlined configuration content..."
                    tooltip="Inlined configuration content"
                    multiline={true}
                    code={true}
                />
                <Input
                    label="External Name"
                    value={data.name}
                    onChange={(v) => update("name", v)}
                    placeholder="external-config-name"
                    tooltip="External config name"
                />
                <Checkbox
                    label="External Config"
                    checked={data.external}
                    onChange={(v) => update("external", v)}
                    tooltip="Use pre-existing config"
                />
            </Section>

            <Section
                title="Labels"
                icon={Tag}
            >
                <KeyValueEditor
                    label="Config Labels"
                    value={data.labels}
                    onChange={(v) => update("labels", v)}
                    keyPlaceholder="label.key"
                    valuePlaceholder="value"
                    tooltip="Labels to add to the config"
                />
            </Section>
        </div>
    );
};

export default ConfigConfig;
