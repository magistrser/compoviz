import { memo } from "react";
import { BaseEdge, type Edge, type EdgeProps } from "@xyflow/react";
import { getDependencyConditionVisual } from "./dependencyConditionVisuals";
import { getRoundedOrthogonalPath, type OrthogonalEdgeRoutingData } from "./orthogonalPath";

/**
 * Custom edge for depends_on relationships.
 * Animated solid line colored by dependency condition.
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
        const [edgePath] = getRoundedOrthogonalPath(
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

        const conditionVisual = getDependencyConditionVisual(data?.condition);

        return (
            <BaseEdge
                id={id}
                path={edgePath}
                className={`depends-on-edge ${selected ? "selected" : ""}`}
                style={{
                    stroke: conditionVisual.color,
                    strokeWidth: selected ? 3 : 2,
                }}
            />
        );
    },
);

DependsOnEdge.displayName = "DependsOnEdge";

export default DependsOnEdge;
