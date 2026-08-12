import { Position } from "@xyflow/react";

export const BUILDER_INPUT_POSITION = Position.Left;
export const BUILDER_OUTPUT_POSITION = Position.Right;

// Keep this in sync with the 6px `.builder-handle` diameter in global.scss.
export const BUILDER_HANDLE_RADIUS = 3;

export type BuilderRelationshipLane = "dependency" | "network" | "volume";

export const BUILDER_RELATIONSHIP_LANE_OFFSETS: Readonly<Record<BuilderRelationshipLane, number>> = {
    dependency: 30,
    network: 45,
    volume: 60,
};

const LONGEST_RELATIONSHIP_LEAD = Math.max(...Object.values(BUILDER_RELATIONSHIP_LANE_OFFSETS));
const MINIMUM_VISIBLE_WIRE_BETWEEN_LEADS = 60;

export const BUILDER_LAYOUT_RANK_SEPARATION = LONGEST_RELATIONSHIP_LEAD * 2 + MINIMUM_VISIBLE_WIRE_BETWEEN_LEADS;
