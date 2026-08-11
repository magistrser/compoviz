# Architecture Visualization Specification

## Purpose

Define how Compoviz turns a Compose project into navigable visual architecture views and safe downloadable output.

## Requirements

### Requirement: Generate an architecture diagram

The system SHALL generate a diagram containing each Compose service and its relevant image or build identity, published ports, dependencies, networks, and mounted storage.

#### Scenario: Visualize a populated project

- **WHEN** the current project contains one or more services
- **THEN** the diagram includes a node for each service and edges for declared service dependencies

#### Scenario: Visualize network and storage structure

- **WHEN** services use networks or volumes
- **THEN** the diagram groups services by network and represents mounted storage in the storage area

### Requirement: Represent port mappings accurately

The system SHALL display published host ports and protocols from short-form Compose mappings, including IPv4 bindings, bracketed IPv6 bindings, ranges, TCP, and UDP.

#### Scenario: Render a bound UDP port

- **WHEN** a service publishes a UDP port with an explicit host address
- **THEN** the diagram displays the host port and UDP protocol for that service

### Requirement: Use enriched Dockerfile metadata

The system SHALL use resolved image and exposed-port metadata from a service Dockerfile when the Compose service omits the corresponding explicit values. Explicit Compose values SHALL take precedence.

#### Scenario: Visualize a build-only service

- **WHEN** a build-only service has successfully resolved Dockerfile metadata
- **THEN** the diagram uses the resolved base image and ports to describe and classify the service

### Requirement: Provide an interactive builder canvas

The system SHALL provide a node-based builder view with resource nodes, relationship edges, a background grid, zoom and pan controls, and a minimap.

#### Scenario: Open the builder

- **WHEN** a user switches to the Build view
- **THEN** the canvas renders nodes and edges derived from the current Compose state with navigation controls

### Requirement: Navigate the rendered diagram

The system SHALL provide the same pan, zoom, fit, and reset controls for every rendered architecture diagram. Zoom SHALL remain within `0.3–3`, fit SHALL center the current SVG within those bounds, and reset SHALL center the diagram at scale `1`.

#### Scenario: Inspect a large diagram

- **WHEN** a user drags the diagram or uses wheel or button zoom controls
- **THEN** the viewport changes while zoom remains between `0.3` and `3`

#### Scenario: Fit a rendered diagram

- **WHEN** a user requests fit after rendering succeeds
- **THEN** the current SVG is centered at a scale within `0.3–3` that fits the viewport

#### Scenario: Reset diagram navigation

- **WHEN** a user requests reset after panning or zooming
- **THEN** the diagram is centered at scale `1`

### Requirement: Sanitize and export diagram output

The system SHALL sanitize rendered SVG before inserting it into the page and SHALL sanitize the current serialized SVG again before downloading it as `docker-compose-diagram.svg`.

#### Scenario: Render untrusted SVG content

- **WHEN** generated SVG contains scripts, event handlers, or JavaScript URLs
- **THEN** the system removes those executable constructs before displaying the SVG

#### Scenario: Reject malformed SVG content

- **WHEN** generated output cannot be parsed as SVG
- **THEN** the system displays a rendering error and does not insert partial output

#### Scenario: Export a diagram

- **WHEN** a user requests diagram export after rendering succeeds
- **THEN** the browser downloads a sanitized current SVG as `docker-compose-diagram.svg`

### Requirement: Protect the rendered diagram lifecycle

The system SHALL ignore stale Graphviz results, clean up diagram event listeners, surface rendering failures, and retain the worker adapter's timeout and one fatal retry behavior.

#### Scenario: DOT changes during rendering

- **WHEN** an earlier render completes after a newer DOT render was requested
- **THEN** only the newer render may update the displayed diagram or state

#### Scenario: Rendering times out or fails fatally

- **WHEN** the worker times out or returns a fatal rendering error
- **THEN** the renderer retries once with a fresh worker and then displays an error if rendering still fails

### Requirement: Clean the builder layout deterministically

The system SHALL provide an accessible `Clean layout` action in the Build view that assigns every visible resource node a relationship-aware position using stable resource identities and fixed layout configuration, and SHALL fit the completed layout within the builder viewport. The same unchanged project graph SHALL produce the same position for every node on every invocation.

#### Scenario: Clean a populated builder

- **WHEN** a user invokes `Clean layout` for a project containing resource nodes
- **THEN** the system arranges every visible node into a spaced relationship-aware layout and fits the resulting bounds in the viewport

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
