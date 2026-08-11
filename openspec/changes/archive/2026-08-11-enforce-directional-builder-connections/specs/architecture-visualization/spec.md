## MODIFIED Requirements

### Requirement: Clean the builder layout deterministically

The system SHALL provide an accessible `Clean layout` action in the Build view that assigns every visible resource node a relationship-aware position using stable resource identities and fixed layout configuration, and SHALL fit the completed layout within the builder viewport. Cleanup SHALL rank acyclic relationships from output toward input in a left-to-right direction and reserve enough horizontal space between connected ranks for the relationship-specific right-side output and left-side input leads. Directed cycles SHALL be broken deterministically for ranking without moving an input or output to another side. The same unchanged project graph SHALL produce the same position for every node on every invocation.

#### Scenario: Clean a populated builder

- **WHEN** a user invokes `Clean layout` for a project containing resource nodes
- **THEN** the system arranges every visible node into a spaced relationship-aware layout and fits the resulting bounds in the viewport outside persistent canvas overlays

#### Scenario: Clean around directional terminals

- **WHEN** cleanup arranges an acyclic dependency, network, or named-volume relationship
- **THEN** the source rank appears to the left of the target rank with enough horizontal clearance for the line to leave the source's right-side output and enter the target's left-side input

#### Scenario: Clean supporting resources before their service

- **WHEN** cleanup arranges a network or named volume consumed by a service
- **THEN** the supporting resource appears in a source rank to the left of the consuming service and its line enters the service from the left

#### Scenario: Clean a directed cycle

- **WHEN** cleanup arranges resource relationships containing a directed cycle
- **THEN** the system chooses the same cycle break and non-overlapping positions on every invocation while every line retains its required input and output sides

#### Scenario: Repeat cleanup without changes

- **WHEN** a user invokes `Clean layout` again without changing project resources, relationships, or node positions
- **THEN** every node receives the same coordinates as the preceding cleanup

#### Scenario: Preserve project contents during cleanup

- **WHEN** the system applies a generated builder layout
- **THEN** it changes resource positions only and preserves all resource configuration and relationships

#### Scenario: Open an empty builder

- **WHEN** the Build view contains no resource nodes
- **THEN** the `Clean layout` action is disabled and no workspace transition occurs

### Requirement: Route builder relationships orthogonally

The system SHALL render dependency, network, and volume relationships in the Build view as horizontal and vertical line segments joined by rounded 90-degree corners. Every relationship SHALL start at an output on the right side of its source resource and end at an input on the left side of its target resource. Network and named-volume relationships SHALL start at their supporting resource and end at the service that consumes it. Dependency relationships SHALL start at the depended-on service and end at the dependent service. Orthogonal routing SHALL preserve each relationship type's semantic stroke, dash pattern, applicable label, selection state, and animation behavior. Dependency conditions SHALL use distinct coordinated stroke colors without inline condition labels, and the Connection Types legend SHALL group human-readable keys for every supported condition under Depends On. Each relationship type SHALL attach through a dedicated type-specific terminal and use a stable type-specific routing lane offset. Differently colored relationship types SHALL NOT share coincident straight runs. A relationship path SHALL NOT enter the interior rectangle of any unrelated resource block, and SHALL recalculate from the current block rectangles when positions change.

#### Scenario: Render supported relationship types

- **WHEN** the Build view contains dependency, network, or named-volume relationships
- **THEN** every corresponding edge uses straight orthogonal segments with rounded corners instead of a Bézier curve

#### Scenario: Attach lines directionally

- **WHEN** the builder displays a relationship between any supported source and target resource
- **THEN** the line leaves a right-side output on the source and enters a left-side input on the target

#### Scenario: Feed a service from a network or named volume

- **WHEN** a service consumes a network or named volume
- **THEN** the relationship starts at the supporting resource's dedicated right-side output and ends at the service's matching left-side input

#### Scenario: Move a connected node manually

- **WHEN** a user drags a connected builder node to a new position
- **THEN** its relationship paths recalculate from the new endpoints and remain orthogonal with rounded corners

#### Scenario: Preserve relationship meaning

- **WHEN** orthogonal edges are displayed or selected
- **THEN** their colors, dash patterns, applicable non-dependency labels, selection emphasis, and applicable animation continue to distinguish relationship types

#### Scenario: Distinguish dependency conditions

- **WHEN** the Build view displays service-started, service-healthy, or service-completed-successfully dependencies
- **THEN** each condition uses its documented distinct line color without condition text on the wire, and the Connection Types legend identifies all three colors under Depends On

#### Scenario: Receive different relationship types at one service

- **WHEN** a service has incoming dependency, network, and/or named-volume relationships of more than one type
- **THEN** each relationship enters through its own adjacent left-side input and follows a separate routing lane without overlapping another color's straight runs

#### Scenario: Enter through relationship-specific terminals

- **WHEN** a dependency, network, or named-volume relationship enters its target block
- **THEN** the wire ends at the dedicated left-side input for that relationship type

#### Scenario: Route around an intervening resource block

- **WHEN** an unrelated resource block lies between a relationship's source and target terminals
- **THEN** every straight segment and rounded corner of that relationship detours around the block with visible clearance and does not enter its interior rectangle

#### Scenario: Drag a block into an existing route

- **WHEN** a user drags an unrelated resource block across an existing relationship path
- **THEN** the relationship deterministically reroutes around the block without entering its interior rectangle
