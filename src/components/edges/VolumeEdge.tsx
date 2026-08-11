import { memo } from "react";
import { BaseEdge, EdgeLabelRenderer, type Edge, type EdgeProps } from "@xyflow/react";
import { getRoundedOrthogonalPath, type OrthogonalEdgeRoutingData } from "./orthogonalPath";

/**
 * Custom edge for volume mounts.
 * Dotted amber line with mount path label.
 */
interface VolumeEdgeData extends OrthogonalEdgeRoutingData {
    mountPath?: string;
}

const VolumeEdge = memo(
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
    }: EdgeProps<Edge<VolumeEdgeData>>) => {
        const [edgePath, labelX, labelY] = getRoundedOrthogonalPath(
            {
                sourceX,
                sourceY,
                targetX,
                targetY,
                sourcePosition,
                targetPosition,
            },
            "volume",
            data?.routing,
        );

        const mountPath = data?.mountPath;

        return (
            <>
                <BaseEdge
                    id={id}
                    path={edgePath}
                    className={`volume-edge ${selected ? "selected" : ""}`}
                    style={{
                        stroke: "#EAB354",
                        strokeWidth: selected ? 2.5 : 1.5,
                        strokeDasharray: "2 2",
                    }}
                />
                {mountPath && (
                    <EdgeLabelRenderer>
                        <div
                            className="edge-label volume-label"
                            style={{
                                position: "absolute",
                                transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
                                pointerEvents: "all",
                            }}
                        >
                            {mountPath}
                        </div>
                    </EdgeLabelRenderer>
                )}
            </>
        );
    },
);

VolumeEdge.displayName = "VolumeEdge";

export default VolumeEdge;
