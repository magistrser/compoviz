## MODIFIED Requirements

### Requirement: Route builder relationships orthogonally

The system SHALL render dependency, network, and volume relationships in the Build view as horizontal and vertical line segments joined by rounded 90-degree corners. Orthogonal routing SHALL preserve each relationship type's semantic stroke, dash pattern, applicable label, selection state, and animation behavior. Dependency conditions SHALL use distinct coordinated stroke colors without inline condition labels, and the Connection Types legend SHALL group human-readable keys for every supported condition under Depends On. Each relationship type SHALL attach through a dedicated type-specific terminal and use a stable type-specific routing lane offset. Differently colored relationship types SHALL NOT share coincident straight runs. A relationship path SHALL NOT enter the interior rectangle of any unrelated resource block, and SHALL recalculate from the current block rectangles when positions change.

#### Scenario: Render supported relationship types

- **WHEN** the Build view contains dependency, network, or named-volume relationships
- **THEN** every corresponding edge uses straight orthogonal segments with rounded corners instead of a Bézier curve

#### Scenario: Move a connected node manually

- **WHEN** a user drags a connected builder node to a new position
- **THEN** its relationship paths recalculate from the new endpoints and remain orthogonal with rounded corners

#### Scenario: Preserve relationship meaning

- **WHEN** orthogonal edges are displayed or selected
- **THEN** their colors, dash patterns, applicable non-dependency labels, selection emphasis, and applicable animation continue to distinguish relationship types

#### Scenario: Distinguish dependency conditions

- **WHEN** the Build view displays service-started, service-healthy, or service-completed-successfully dependencies
- **THEN** each condition uses its documented distinct line color without condition text on the wire, and the Connection Types legend identifies all three colors under Depends On

#### Scenario: Fan out different relationship types from one service

- **WHEN** a service has outgoing dependency, network, and/or named-volume relationships of more than one type
- **THEN** each differently colored relationship type leaves through its own adjacent terminal and follows a separate routing lane without overlapping another color's straight runs

#### Scenario: Enter through relationship-specific terminals

- **WHEN** a dependency, network, or named-volume relationship enters its target block
- **THEN** the wire ends at the dedicated terminal for that relationship type

#### Scenario: Route around an intervening resource block

- **WHEN** an unrelated resource block lies between a relationship's source and target terminals
- **THEN** every straight segment and rounded corner of that relationship detours around the block with visible clearance and does not enter its interior rectangle

#### Scenario: Drag a block into an existing route

- **WHEN** a user drags an unrelated resource block across an existing relationship path
- **THEN** the relationship deterministically reroutes around the block without entering its interior rectangle
