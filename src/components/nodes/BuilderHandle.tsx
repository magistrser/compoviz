import { createContext, useContext, type KeyboardEvent, type PropsWithChildren } from "react";
import { Handle, type HandleProps, type Position } from "@xyflow/react";
import type { BuilderTerminal } from "./builderConnection";

interface BuilderConnectionContextValue {
    activeTerminal: BuilderTerminal | null;
    isCompatibleTerminal: (terminal: BuilderTerminal) => boolean;
    onTerminalClick: (terminal: BuilderTerminal) => void;
}

const BuilderConnectionContext = createContext<BuilderConnectionContextValue>({
    activeTerminal: null,
    isCompatibleTerminal: () => false,
    onTerminalClick: () => undefined,
});

interface BuilderConnectionProviderProps extends PropsWithChildren {
    activeTerminal: BuilderTerminal | null;
    isCompatibleTerminal: (terminal: BuilderTerminal) => boolean;
    onTerminalClick: (terminal: BuilderTerminal) => void;
}

export function BuilderConnectionProvider({
    activeTerminal,
    isCompatibleTerminal,
    onTerminalClick,
    children,
}: BuilderConnectionProviderProps) {
    return (
        <BuilderConnectionContext.Provider value={{ activeTerminal, isCompatibleTerminal, onTerminalClick }}>
            {children}
        </BuilderConnectionContext.Provider>
    );
}

interface BuilderHandleProps extends Pick<HandleProps, "className" | "id" | "style" | "type"> {
    nodeId: string;
    nodeName: string;
    position: Position;
    terminalLabel: string;
}

export default function BuilderHandle({
    className = "",
    id,
    nodeId,
    nodeName,
    position,
    style,
    terminalLabel,
    type,
}: BuilderHandleProps) {
    const { activeTerminal, isCompatibleTerminal, onTerminalClick } = useContext(BuilderConnectionContext);
    const label = `${terminalLabel} for ${nodeName}`;
    const terminal: BuilderTerminal = { nodeId, handleId: id ?? type, handleType: type, label };
    const active =
        activeTerminal?.nodeId === terminal.nodeId &&
        activeTerminal.handleId === terminal.handleId &&
        activeTerminal.handleType === terminal.handleType;
    const compatible = activeTerminal !== null && !active && isCompatibleTerminal(terminal);
    const unavailable = activeTerminal !== null && !active && !compatible;
    const stateClass = active
        ? " builder-handle-active"
        : compatible
          ? " builder-handle-compatible"
          : unavailable
            ? " builder-handle-incompatible"
            : "";

    const selectTerminal = () => onTerminalClick(terminal);
    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        event.stopPropagation();
        selectTerminal();
    };

    return (
        <Handle
            type={type}
            position={position}
            className={`${className} builder-click-handle${stateClass}`}
            id={id ?? null}
            style={style}
            isConnectable={false}
            isConnectableStart={false}
            isConnectableEnd={false}
            role="button"
            tabIndex={0}
            aria-label={label}
            aria-pressed={active}
            onClick={(event) => {
                event.stopPropagation();
                selectTerminal();
            }}
            onKeyDown={onKeyDown}
        />
    );
}
