import { memo } from "react";
import { BaseEdge, getBezierPath, type Edge, type EdgeProps } from "@xyflow/react";

/**
 * Custom edge for network membership.
 * Dashed cyan line.
 */
const NetworkEdge = memo(
    ({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, selected }: EdgeProps<Edge>) => {
        const [edgePath] = getBezierPath({
            sourceX,
            sourceY,
            targetX,
            targetY,
            sourcePosition,
            targetPosition,
        });

        return (
            <BaseEdge
                id={id}
                path={edgePath}
                className={`network-edge ${selected ? "selected" : ""}`}
                style={{
                    stroke: "#56D4DD",
                    strokeWidth: selected ? 2.5 : 1.5,
                    strokeDasharray: "5 3",
                }}
            />
        );
    },
);

NetworkEdge.displayName = "NetworkEdge";

export default NetworkEdge;
