import { Plus, Trash2 } from "lucide-react";
import { IconButton } from "./IconButton";

/**
 * Key-Value pair editor with cleaner grid layout
 */
export const KeyValueEditor = ({
    label,
    value = {},
    onChange,
    keyPlaceholder = "Key",
    valuePlaceholder = "Value",
}: {
    label: string;
    value?: unknown;
    onChange: (value: Record<string, string>) => void;
    keyPlaceholder?: string;
    valuePlaceholder?: string;
}) => {
    const values: Record<string, string> =
        typeof value === "object" && value !== null && !Array.isArray(value)
            ? Object.fromEntries(
                  Object.entries(value).map(([key, entry]) => [
                      key,
                      typeof entry === "string" ? entry : String(entry ?? ""),
                  ]),
              )
            : {};
    const entries = Object.entries(values);

    const addEntry = () => onChange({ ...values, "": "" });

    const updateKey = (oldKey: string, newKey: string) => {
        const newVal = { ...values };
        const v = newVal[oldKey];
        delete newVal[oldKey];
        newVal[newKey] = v ?? "";
        onChange(newVal);
    };

    const updateValue = (key: string, newValue: string) => onChange({ ...values, [key]: newValue });

    const removeEntry = (key: string) =>
        onChange(Object.fromEntries(Object.entries(values).filter(([entryKey]) => entryKey !== key)));

    return (
        <div className="field-group">
            <div className="flex items-center justify-between">
                <label className="field-label">{label}</label>
                <button
                    onClick={addEntry}
                    className="field-add-btn"
                >
                    <Plus size={12} />
                    Add
                </button>
            </div>
            {entries.length > 0 && (
                <div className="space-y-1.5">
                    {entries.map(([k, v], i) => (
                        <div
                            key={i}
                            className="kv-row"
                        >
                            <input
                                className="flex-1 text-xs"
                                placeholder={keyPlaceholder}
                                value={k}
                                onChange={(e) => updateKey(k, e.target.value)}
                            />
                            <input
                                className="flex-1 text-xs"
                                placeholder={valuePlaceholder}
                                value={v}
                                onChange={(e) => updateValue(k, e.target.value)}
                            />
                            <IconButton
                                icon={Trash2}
                                onClick={() => removeEntry(k)}
                                variant="danger"
                                size="sm"
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default KeyValueEditor;
