import { Lock, Tag } from "lucide-react";
import { Input, Checkbox, KeyValueEditor, Section } from "./PanelUI";
import type { ComposeResource } from "../../../models/composeTypes";

/**
 * Secret configuration panel
 */
export const SecretConfig = ({
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
                icon={Lock}
                defaultOpen={true}
            >
                <Input
                    label="File Path"
                    value={data.file}
                    onChange={(v) => update("file", v)}
                    placeholder="./secrets/my-secret.txt"
                    tooltip="Path to the secret file"
                />
                <Input
                    label="Content"
                    value={data.content}
                    onChange={(v) => update("content", v)}
                    placeholder="Inlined secret content..."
                    tooltip="Inlined secret content"
                    multiline={true}
                    code={true}
                />
                <Input
                    label="External Name"
                    value={data.name}
                    onChange={(v) => update("name", v)}
                    placeholder="external-secret-name"
                    tooltip="External secret name"
                />
                <Checkbox
                    label="External Secret"
                    checked={data.external}
                    onChange={(v) => update("external", v)}
                    tooltip="Use pre-existing secret"
                />
            </Section>

            <Section
                title="Labels"
                icon={Tag}
            >
                <KeyValueEditor
                    label="Secret Labels"
                    value={data.labels}
                    onChange={(v) => update("labels", v)}
                    keyPlaceholder="label.key"
                    valuePlaceholder="value"
                    tooltip="Labels to add to the secret"
                />
            </Section>
        </div>
    );
};

export default SecretConfig;
