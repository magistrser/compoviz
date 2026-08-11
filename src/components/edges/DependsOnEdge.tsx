import { memo } from "react";
import { BaseEdge, EdgeLabelRenderer, type Edge, type EdgeProps } from "@xyflow/react";
import { getRoundedOrthogonalPath, type OrthogonalEdgeRoutingData } from "./orthogonalPath";

/**
 * Custom edge for depends_on relationships.
 * Animated solid line with condition label.
 */
interface DependsOnData extends OrthogonalEdgeRoutingData {
    condition?: string;
}

const DependsOnEdge = memo(
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
    }: EdgeProps<Edge<DependsOnData>>) => {
        const [edgePath, labelX, labelY] = getRoundedOrthogonalPath(
            {
                sourceX,
                sourceY,
                targetX,
                targetY,
                sourcePosition,
                targetPosition,
            },
            "dependency",
            data?.routing,
        );

        const condition = data?.condition || "service_started";
        const shortCondition = condition.replace("service_", "");

        return (
            <>
                <BaseEdge
                    id={id}
                    path={edgePath}
                    className={`depends-on-edge ${selected ? "selected" : ""}`}
                    style={{
                        stroke: "#E06C9A",
                        strokeWidth: selected ? 3 : 2,
                    }}
                />
                <EdgeLabelRenderer>
                    <div
                        className="edge-label depends-on-label"
                        style={{
                            position: "absolute",
                            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
                            pointerEvents: "all",
                        }}
                    >
                        {shortCondition}
                    </div>
                </EdgeLabelRenderer>
            </>
        );
    },
);

DependsOnEdge.displayName = "DependsOnEdge";

export default DependsOnEdge;
