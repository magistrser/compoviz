/* eslint-disable react-refresh/only-export-components */
import { useState, useCallback, createContext, useContext, type ReactNode } from "react";
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface ToastItem {
    id: number;
    message: string;
    type: ToastType;
    exiting: boolean;
}

export interface ToastApi {
    (message: string, type?: ToastType, duration?: number): number;
    success: (message: string, duration?: number) => number;
    error: (message: string, duration?: number) => number;
    warning: (message: string, duration?: number) => number;
    info: (message: string, duration?: number) => number;
}

const ToastContext = createContext<ToastApi | null>(null);

const ICONS = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
};

const COLORS = {
    success: "toast-success",
    error: "toast-error",
    warning: "toast-warning",
    info: "toast-info",
};

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const dismissToast = useCallback((id: number) => {
        setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
        window.setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 200);
    }, []);

    const addToast = useCallback(
        (message: string, type: ToastType = "info", duration = 4000) => {
            const id = ++toastId;
            setToasts((prev) => [...prev, { id, message, type, exiting: false }]);

            if (duration > 0) {
                window.setTimeout(() => dismissToast(id), duration);
            }
            return id;
        },
        [dismissToast],
    );

    const toast: ToastApi = Object.assign(
        (message: string, type?: ToastType, duration?: number) => addToast(message, type, duration),
        {
            success: (message: string, duration?: number) => addToast(message, "success", duration),
            error: (message: string, duration?: number) => addToast(message, "error", duration ?? 6000),
            warning: (message: string, duration?: number) => addToast(message, "warning", duration),
            info: (message: string, duration?: number) => addToast(message, "info", duration),
        },
    );

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <div
                className="toast-container"
                aria-live="polite"
            >
                {toasts.map(({ id, message, type, exiting }) => {
                    const Icon = ICONS[type] || Info;
                    return (
                        <div
                            key={id}
                            className={`toast-item ${COLORS[type]} ${exiting ? "toast-exit" : "toast-enter"}`}
                        >
                            <Icon
                                size={16}
                                className="toast-icon flex-shrink-0"
                            />
                            <p className="toast-message">{message}</p>
                            <button
                                onClick={() => dismissToast(id)}
                                className="toast-dismiss"
                                aria-label="Dismiss"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be used within ToastProvider");
    return ctx;
}
