/* eslint-disable react-refresh/only-export-components */
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useId,
    useRef,
    useState,
    type FormEvent,
    type KeyboardEvent as ReactKeyboardEvent,
    type ReactNode,
} from "react";
import { createPortal } from "react-dom";

export interface TextPopupOptions {
    title: string;
    description?: string;
    label: string;
    initialValue?: string;
    placeholder?: string;
    confirmLabel?: string;
    cancelLabel?: string;
}

export interface ConfirmationPopupOptions {
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    tone?: "default" | "danger";
}

export interface ChoicePopupOption {
    value: string;
    label: string;
    description?: string;
    color?: string;
}

export interface ChoicePopupOptions {
    title: string;
    description?: string;
    label: string;
    options: readonly ChoicePopupOption[];
    initialValue?: string;
    confirmLabel?: string;
    cancelLabel?: string;
}

export interface PopupApi {
    requestText: (options: TextPopupOptions) => Promise<string | null>;
    requestConfirmation: (options: ConfirmationPopupOptions) => Promise<boolean>;
    requestChoice: (options: ChoicePopupOptions) => Promise<string | null>;
}

interface TextPopupRequest {
    kind: "text";
    id: number;
    options: TextPopupOptions;
    resolve: (value: string | null) => void;
}

interface ConfirmationPopupRequest {
    kind: "confirmation";
    id: number;
    options: ConfirmationPopupOptions;
    resolve: (value: boolean) => void;
}

interface ChoicePopupRequest {
    kind: "choice";
    id: number;
    options: ChoicePopupOptions;
    resolve: (value: string | null) => void;
}

type PopupRequest = TextPopupRequest | ConfirmationPopupRequest | ChoicePopupRequest;

interface TextPopupProps {
    request: TextPopupRequest;
    onResolve: (value: string | null) => void;
}

const PopupContext = createContext<PopupApi | null>(null);

const focusableSelector = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    '[tabindex]:not([tabindex="-1"])',
].join(",");

const keepFocusInDialog = (event: ReactKeyboardEvent, dialog: HTMLElement | null) => {
    if (event.key !== "Tab" || !dialog) return;

    const focusableElements = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));
    const firstElement = focusableElements[0];
    const lastElement = focusableElements.at(-1);
    if (!firstElement || !lastElement) return;

    const activeElement = document.activeElement;
    if (event.shiftKey && (activeElement === firstElement || !dialog.contains(activeElement))) {
        event.preventDefault();
        lastElement.focus();
    } else if (!event.shiftKey && (activeElement === lastElement || !dialog.contains(activeElement))) {
        event.preventDefault();
        firstElement.focus();
    }
};

const TextPopup = ({ request, onResolve }: TextPopupProps) => {
    const [value, setValue] = useState(request.options.initialValue ?? "");
    const dialogRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const titleId = useId();
    const descriptionId = useId();

    useEffect(() => {
        const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        inputRef.current?.focus();

        return () => previouslyFocused?.focus();
    }, []);

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const trimmedValue = value.trim();
        if (trimmedValue) onResolve(trimmedValue);
    };

    return (
        <div
            className="popup-backdrop modal-backdrop"
            onClick={(event) => {
                if (event.target === event.currentTarget) onResolve(null);
            }}
            onKeyDown={(event) => {
                if (event.key === "Escape") {
                    event.preventDefault();
                    onResolve(null);
                } else {
                    keepFocusInDialog(event, dialogRef.current);
                }
            }}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={request.options.description ? descriptionId : undefined}
                className="popup-dialog modal-content"
            >
                <form onSubmit={handleSubmit}>
                    <h2 id={titleId}>{request.options.title}</h2>
                    {request.options.description && <p id={descriptionId}>{request.options.description}</p>}
                    <label>
                        <span>{request.options.label}</span>
                        <input
                            ref={inputRef}
                            type="text"
                            value={value}
                            placeholder={request.options.placeholder}
                            onChange={(event) => setValue(event.target.value)}
                        />
                    </label>
                    <div className="popup-actions">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => onResolve(null)}
                        >
                            {request.options.cancelLabel ?? "Cancel"}
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={!value.trim()}
                        >
                            {request.options.confirmLabel ?? "Continue"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ConfirmationPopup = ({
    request,
    onResolve,
}: {
    request: ConfirmationPopupRequest;
    onResolve: (value: boolean) => void;
}) => {
    const cancelButtonRef = useRef<HTMLButtonElement>(null);
    const dialogRef = useRef<HTMLDivElement>(null);
    const titleId = useId();
    const descriptionId = useId();

    useEffect(() => {
        const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        cancelButtonRef.current?.focus();

        return () => previouslyFocused?.focus();
    }, []);

    return (
        <div
            className="popup-backdrop modal-backdrop"
            onClick={(event) => {
                if (event.target === event.currentTarget) onResolve(false);
            }}
            onKeyDown={(event) => {
                if (event.key === "Escape") {
                    event.preventDefault();
                    onResolve(false);
                } else {
                    keepFocusInDialog(event, dialogRef.current);
                }
            }}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={request.options.description ? descriptionId : undefined}
                className="popup-dialog modal-content"
            >
                <h2 id={titleId}>{request.options.title}</h2>
                {request.options.description && <p id={descriptionId}>{request.options.description}</p>}
                <div className="popup-actions">
                    <button
                        ref={cancelButtonRef}
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => onResolve(false)}
                    >
                        {request.options.cancelLabel ?? "Cancel"}
                    </button>
                    <button
                        type="button"
                        className={`btn ${request.options.tone === "danger" ? "btn-danger" : "btn-primary"}`}
                        onClick={() => onResolve(true)}
                    >
                        {request.options.confirmLabel ?? "Confirm"}
                    </button>
                </div>
            </div>
        </div>
    );
};

const ChoicePopup = ({
    request,
    onResolve,
}: {
    request: ChoicePopupRequest;
    onResolve: (value: string | null) => void;
}) => {
    const fallbackValue = request.options.options[0]?.value ?? "";
    const initialValue = request.options.options.some((option) => option.value === request.options.initialValue)
        ? (request.options.initialValue ?? fallbackValue)
        : fallbackValue;
    const [value, setValue] = useState(initialValue);
    const initialInputRef = useRef<HTMLInputElement>(null);
    const dialogRef = useRef<HTMLDivElement>(null);
    const titleId = useId();
    const descriptionId = useId();
    const legendId = useId();

    useEffect(() => {
        const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        initialInputRef.current?.focus();

        return () => previouslyFocused?.focus();
    }, []);

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (value) onResolve(value);
    };

    return (
        <div
            className="popup-backdrop modal-backdrop"
            onClick={(event) => {
                if (event.target === event.currentTarget) onResolve(null);
            }}
            onKeyDown={(event) => {
                if (event.key === "Escape") {
                    event.preventDefault();
                    onResolve(null);
                } else {
                    keepFocusInDialog(event, dialogRef.current);
                }
            }}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={request.options.description ? descriptionId : undefined}
                className="popup-dialog modal-content"
            >
                <form onSubmit={handleSubmit}>
                    <h2 id={titleId}>{request.options.title}</h2>
                    {request.options.description && <p id={descriptionId}>{request.options.description}</p>}
                    <fieldset
                        className="popup-choice-list"
                        aria-labelledby={legendId}
                    >
                        <legend id={legendId}>{request.options.label}</legend>
                        {request.options.options.map((option) => (
                            <label
                                className="popup-choice-option"
                                key={option.value}
                            >
                                <input
                                    ref={option.value === initialValue ? initialInputRef : undefined}
                                    type="radio"
                                    name={`popup-choice-${request.id}`}
                                    value={option.value}
                                    checked={value === option.value}
                                    onChange={() => setValue(option.value)}
                                />
                                {option.color && (
                                    <span
                                        className="popup-choice-swatch"
                                        style={{ backgroundColor: option.color }}
                                        aria-hidden="true"
                                    />
                                )}
                                <span className="popup-choice-copy">
                                    <span>{option.label}</span>
                                    {option.description && <small>{option.description}</small>}
                                </span>
                            </label>
                        ))}
                    </fieldset>
                    <div className="popup-actions">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => onResolve(null)}
                        >
                            {request.options.cancelLabel ?? "Cancel"}
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={!value}
                        >
                            {request.options.confirmLabel ?? "Continue"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export function PopupProvider({ children }: { children: ReactNode }) {
    const [request, setRequest] = useState<PopupRequest | null>(null);
    const activeRequestRef = useRef<PopupRequest | null>(null);
    const nextIdRef = useRef(0);

    useEffect(
        () => () => {
            const activeRequest = activeRequestRef.current;
            activeRequestRef.current = null;
            if (activeRequest?.kind === "text") activeRequest.resolve(null);
            if (activeRequest?.kind === "confirmation") activeRequest.resolve(false);
            if (activeRequest?.kind === "choice") activeRequest.resolve(null);
        },
        [],
    );

    const requestText = useCallback((options: TextPopupOptions) => {
        return new Promise<string | null>((resolve) => {
            if (activeRequestRef.current) {
                resolve(null);
                return;
            }

            const nextRequest: TextPopupRequest = { kind: "text", id: ++nextIdRef.current, options, resolve };
            activeRequestRef.current = nextRequest;
            setRequest(nextRequest);
        });
    }, []);

    const requestConfirmation = useCallback((options: ConfirmationPopupOptions) => {
        return new Promise<boolean>((resolve) => {
            if (activeRequestRef.current) {
                resolve(false);
                return;
            }

            const nextRequest: ConfirmationPopupRequest = {
                kind: "confirmation",
                id: ++nextIdRef.current,
                options,
                resolve,
            };
            activeRequestRef.current = nextRequest;
            setRequest(nextRequest);
        });
    }, []);

    const requestChoice = useCallback((options: ChoicePopupOptions) => {
        return new Promise<string | null>((resolve) => {
            if (activeRequestRef.current || options.options.length === 0) {
                resolve(null);
                return;
            }

            const nextRequest: ChoicePopupRequest = { kind: "choice", id: ++nextIdRef.current, options, resolve };
            activeRequestRef.current = nextRequest;
            setRequest(nextRequest);
        });
    }, []);

    const resolveTextRequest = useCallback((value: string | null) => {
        const activeRequest = activeRequestRef.current;
        if (activeRequest?.kind !== "text") return;

        activeRequestRef.current = null;
        setRequest(null);
        activeRequest.resolve(value);
    }, []);

    const resolveConfirmationRequest = useCallback((value: boolean) => {
        const activeRequest = activeRequestRef.current;
        if (activeRequest?.kind !== "confirmation") return;

        activeRequestRef.current = null;
        setRequest(null);
        activeRequest.resolve(value);
    }, []);

    const resolveChoiceRequest = useCallback((value: string | null) => {
        const activeRequest = activeRequestRef.current;
        if (activeRequest?.kind !== "choice") return;

        activeRequestRef.current = null;
        setRequest(null);
        activeRequest.resolve(value);
    }, []);

    return (
        <PopupContext.Provider value={{ requestText, requestConfirmation, requestChoice }}>
            {children}
            {request?.kind === "text" &&
                createPortal(
                    <TextPopup
                        key={request.id}
                        request={request}
                        onResolve={resolveTextRequest}
                    />,
                    document.body,
                )}
            {request?.kind === "confirmation" &&
                createPortal(
                    <ConfirmationPopup
                        key={request.id}
                        request={request}
                        onResolve={resolveConfirmationRequest}
                    />,
                    document.body,
                )}
            {request?.kind === "choice" &&
                createPortal(
                    <ChoicePopup
                        key={request.id}
                        request={request}
                        onResolve={resolveChoiceRequest}
                    />,
                    document.body,
                )}
        </PopupContext.Provider>
    );
}

export function usePopup(): PopupApi {
    const context = useContext(PopupContext);
    if (!context) throw new Error("usePopup must be used within PopupProvider");
    return context;
}
