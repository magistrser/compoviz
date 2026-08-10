import { useState, type ReactNode } from "react";
import { Plus, Trash2, ChevronDown, ChevronRight, type LucideIcon } from "lucide-react";

interface InputProps {
    label: string;
    value?: unknown;
    onChange: (value: string) => void;
    placeholder?: string;
    tooltip?: string;
    multiline?: boolean;
    code?: boolean;
}

interface SelectOption {
    value: string;
    label: string;
}
interface SelectProps extends Omit<InputProps, "onChange" | "multiline" | "code"> {
    onChange: (value: string) => void;
    options: Array<string | SelectOption>;
}

function scalarValue(value: unknown): string | number {
    return typeof value === "string" || typeof value === "number" ? value : "";
}

function stringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function stringRecord(value: unknown): Record<string, string> {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
    return Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [key, typeof entry === "string" ? entry : String(entry ?? "")]),
    );
}

/**
 * Panel-specific form input components
 * These have different styling than the main editor UI components
 */

export const Input = ({
    label,
    value,
    onChange,
    placeholder,
    tooltip,
    multiline = false,
    code = false,
}: InputProps) => (
    <div className="config-field">
        <label className="config-label">
            {label}
            {tooltip && (
                <span
                    className="config-tooltip"
                    title={tooltip}
                >
                    ?
                </span>
            )}
        </label>
        {multiline ? (
            <textarea
                value={scalarValue(value)}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className={`config-input config-textarea ${code ? "font-mono text-sm" : ""}`}
                rows={3}
            />
        ) : (
            <input
                type="text"
                value={scalarValue(value)}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className={`config-input ${code ? "font-mono text-sm" : ""}`}
            />
        )}
    </div>
);

export const Select = ({ label, value, onChange, options, placeholder, tooltip }: SelectProps) => (
    <div className="config-field">
        <label className="config-label">
            {label}
            {tooltip && (
                <span
                    className="config-tooltip"
                    title={tooltip}
                >
                    ?
                </span>
            )}
        </label>
        <select
            value={scalarValue(value)}
            onChange={(e) => onChange(e.target.value)}
            className="config-input"
        >
            {placeholder && <option value="">{placeholder}</option>}
            {options.map((opt) => (
                <option
                    key={typeof opt === "string" ? opt : opt.value}
                    value={typeof opt === "string" ? opt : opt.value}
                >
                    {typeof opt === "string" ? opt : opt.label}
                </option>
            ))}
        </select>
    </div>
);

export const Checkbox = ({
    label,
    checked,
    onChange,
    tooltip,
}: {
    label: string;
    checked?: unknown;
    onChange: (value: boolean) => void;
    tooltip?: string;
}) => (
    <label className="config-checkbox">
        <input
            type="checkbox"
            checked={checked === true}
            onChange={(e) => onChange(e.target.checked)}
            className="config-checkbox-input"
        />
        <span>{label}</span>
        {tooltip && (
            <span
                className="config-tooltip"
                title={tooltip}
            >
                ?
            </span>
        )}
    </label>
);

export const ArrayEditor = ({
    label,
    value = [],
    onChange,
    placeholder,
    tooltip,
}: {
    label: string;
    value?: unknown;
    onChange: (value: string[]) => void;
    placeholder?: string;
    tooltip?: string;
}) => {
    const items = stringArray(value);
    const addItem = () => onChange([...items, ""]);
    const updateItem = (i: number, v: string) => {
        const n = [...items];
        n[i] = v;
        onChange(n);
    };
    const removeItem = (i: number) => onChange(items.filter((_, idx) => idx !== i));

    return (
        <div className="config-field">
            <div className="flex items-center justify-between mb-2">
                <label className="config-label mb-0">
                    {label}
                    {tooltip && (
                        <span
                            className="config-tooltip"
                            title={tooltip}
                        >
                            ?
                        </span>
                    )}
                </label>
                <button
                    onClick={addItem}
                    className="config-add-btn"
                >
                    <Plus size={12} /> Add
                </button>
            </div>
            <div className="space-y-2">
                {items.map((v, i) => (
                    <div
                        key={i}
                        className="flex gap-2"
                    >
                        <input
                            className="config-input flex-1"
                            placeholder={placeholder}
                            value={v}
                            onChange={(e) => updateItem(i, e.target.value)}
                        />
                        <button
                            onClick={() => removeItem(i)}
                            className="config-remove-btn"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const KeyValueEditor = ({
    label,
    value = {},
    onChange,
    keyPlaceholder = "Key",
    valuePlaceholder = "Value",
    tooltip,
}: {
    label: string;
    value?: unknown;
    onChange: (value: Record<string, string>) => void;
    keyPlaceholder?: string;
    valuePlaceholder?: string;
    tooltip?: string;
}) => {
    const values = stringRecord(value);
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
        <div className="config-field">
            <div className="flex items-center justify-between mb-2">
                <label className="config-label mb-0">
                    {label}
                    {tooltip && (
                        <span
                            className="config-tooltip"
                            title={tooltip}
                        >
                            ?
                        </span>
                    )}
                </label>
                <button
                    onClick={addEntry}
                    className="config-add-btn"
                >
                    <Plus size={12} /> Add
                </button>
            </div>
            <div className="space-y-2">
                {entries.map(([k, v], i) => (
                    <div
                        key={i}
                        className="flex gap-2"
                    >
                        <input
                            className="config-input flex-1"
                            placeholder={keyPlaceholder}
                            value={k}
                            onChange={(e) => updateKey(k, e.target.value)}
                        />
                        <input
                            className="config-input flex-1"
                            placeholder={valuePlaceholder}
                            value={v}
                            onChange={(e) => updateValue(k, e.target.value)}
                        />
                        <button
                            onClick={() => removeEntry(k)}
                            className="config-remove-btn"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const MultiSelect = ({
    label,
    options,
    selected = [],
    onChange,
    tooltip,
}: {
    label: string;
    options: string[];
    selected?: unknown;
    onChange: (value: string[]) => void;
    tooltip?: string;
}) => {
    const selectedValues = stringArray(selected);
    return (
        <div className="config-field">
            <label className="config-label">
                {label}
                {tooltip && (
                    <span
                        className="config-tooltip"
                        title={tooltip}
                    >
                        ?
                    </span>
                )}
            </label>
            <div className="config-multi-select">
                {options.map((opt) => (
                    <label
                        key={opt}
                        className="config-multi-option"
                    >
                        <input
                            type="checkbox"
                            checked={selectedValues.includes(opt)}
                            onChange={(e) => {
                                if (e.target.checked) {
                                    onChange([...selectedValues, opt]);
                                } else {
                                    onChange(selectedValues.filter((s) => s !== opt));
                                }
                            }}
                        />
                        <span>{opt}</span>
                    </label>
                ))}
            </div>
        </div>
    );
};

export const Section = ({
    title,
    icon: Icon,
    children,
    defaultOpen = false,
    highlight = false,
}: {
    title: string;
    icon: LucideIcon;
    children: ReactNode;
    defaultOpen?: boolean;
    highlight?: boolean;
}) => {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div className={`config-section ${highlight ? "config-section-highlight" : ""}`}>
            <button
                className="config-section-header"
                onClick={() => setOpen(!open)}
            >
                <div className="flex items-center gap-2">
                    <Icon
                        size={16}
                        className="text-accent"
                    />
                    <span>{title}</span>
                </div>
                {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            {open && <div className="config-section-content">{children}</div>}
        </div>
    );
};
