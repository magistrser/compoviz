/* eslint-disable react-refresh/only-export-components */
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
    type Dispatch,
    type ReactNode,
    type SetStateAction,
} from "react";

export type ViewId = "editor" | "diagram" | "build" | "compare";
export type ResourceType = "services" | "networks" | "volumes" | "secrets" | "configs";

export interface ResourceSelection {
    type: ResourceType;
    name: string;
}

interface UIContextValue {
    activeView: ViewId;
    sidebarOpen: boolean;
    isMobile: boolean;
    selected: ResourceSelection | null;
    searchTerm: string;
    activeModal: string | null;
    showTemplates: boolean;
    codePreviewWidth: number;
    isResizing: boolean;
    showMobileCode: boolean;
    isDragging: boolean;
    suggestionsEnabled: boolean;
    setActiveView: (viewId: ViewId) => void;
    setSidebarOpen: Dispatch<SetStateAction<boolean>>;
    setSelected: Dispatch<SetStateAction<ResourceSelection | null>>;
    setSearchTerm: Dispatch<SetStateAction<string>>;
    setShowTemplates: Dispatch<SetStateAction<boolean>>;
    setCodePreviewWidth: Dispatch<SetStateAction<number>>;
    setIsResizing: Dispatch<SetStateAction<boolean>>;
    setShowMobileCode: Dispatch<SetStateAction<boolean>>;
    setIsDragging: Dispatch<SetStateAction<boolean>>;
    setSuggestionsEnabled: Dispatch<SetStateAction<boolean>>;
    toggleSidebar: () => void;
    openModal: (id: string) => void;
    closeModal: () => void;
}

// Context
const UIContext = createContext<UIContextValue | null>(null);

/**
 * UIProvider - Manages UI state (view, sidebar, modals, selection, etc.)
 * Separated from data state to keep concerns clean
 */
export function UIProvider({ children }: { children: ReactNode }) {
    // View state
    const [activeView, setActiveView] = useState<ViewId>("editor");

    // Sidebar state
    const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    // Selection state
    const [selected, setSelected] = useState<ResourceSelection | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    // Modal state
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [showTemplates, setShowTemplates] = useState(false);

    // Code preview state
    const [codePreviewWidth, setCodePreviewWidth] = useState(384); // Default w-96 = 384px
    const [isResizing, setIsResizing] = useState(false);
    const [showMobileCode, setShowMobileCode] = useState(false);

    // Drag state
    const [isDragging, setIsDragging] = useState(false);

    // Suggestions state (persisted to localStorage)
    const [suggestionsEnabled, setSuggestionsEnabled] = useState(() => {
        const saved = localStorage.getItem("suggestions-enabled");
        if (saved === null || saved === "undefined") return true;
        try {
            const parsed: unknown = JSON.parse(saved);
            return typeof parsed === "boolean" ? parsed : true;
        } catch {
            return true;
        }
    });

    // Handle window resize for responsive behavior
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            // Auto-close sidebar on mobile when resizing down
            if (mobile && sidebarOpen) {
                setSidebarOpen(false);
            }
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [sidebarOpen]);

    // Handle resize panel drag
    useEffect(() => {
        if (!isResizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            const newWidth = window.innerWidth - e.clientX;
            // Clamp between 280px and 600px
            setCodePreviewWidth(Math.max(280, Math.min(600, newWidth)));
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);

        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isResizing]);

    // Persist suggestions toggle
    useEffect(() => {
        localStorage.setItem("suggestions-enabled", JSON.stringify(suggestionsEnabled));
    }, [suggestionsEnabled]);

    // Actions
    const setView = useCallback((viewId: ViewId) => {
        setActiveView(viewId);
    }, []);

    const toggleSidebar = useCallback(() => {
        setSidebarOpen((prev) => !prev);
    }, []);

    const openModal = useCallback((id: string) => {
        setActiveModal(id);
    }, []);

    const closeModal = useCallback(() => {
        setActiveModal(null);
    }, []);

    const value = {
        // State
        activeView,
        sidebarOpen,
        isMobile,
        selected,
        searchTerm,
        activeModal,
        showTemplates,
        codePreviewWidth,
        isResizing,
        showMobileCode,
        isDragging,
        suggestionsEnabled,

        // Setters
        setActiveView: setView,
        setSidebarOpen,
        setSelected,
        setSearchTerm,
        setShowTemplates,
        setCodePreviewWidth,
        setIsResizing,
        setShowMobileCode,
        setIsDragging,
        setSuggestionsEnabled,

        // Actions
        toggleSidebar,
        openModal,
        closeModal,
    };

    return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

/**
 * Hook to access the UI context.
 * Must be used within UIProvider.
 */
export const useUI = () => {
    const context = useContext(UIContext);
    if (!context) {
        throw new Error("useUI must be used within UIProvider");
    }
    return context;
};
