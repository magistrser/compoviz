import { memo } from "react";
import { BaseEdge, type Edge, type EdgeProps } from "@xyflow/react";
import { getRoundedOrthogonalPath, type OrthogonalEdgeRoutingData } from "./orthogonalPath";

/**
 * Custom edge for network membership.
 * Dashed cyan line.
 */
const NetworkEdge = memo(
    ({
        id,
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
        data,
        selected,
    }: EdgeProps<Edge<OrthogonalEdgeRoutingData>>) => {
        const [edgePath] = getRoundedOrthogonalPath(
            {
                sourceX,
                sourceY,
                targetX,
                targetY,
                sourcePosition,
                targetPosition,
            },
            "network",
            data?.routing,
        );

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
