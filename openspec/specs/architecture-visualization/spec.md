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

The system SHALL provide an accessible `Clean layout` action in the Build view that assigns every visible resource node a relationship-aware position using stable resource identities and fixed layout configuration, and SHALL fit the completed layout within the builder viewport. The system SHALL apply that same cleanup once on the first Build presentation of each newly loaded Compose source that has visible resources and no stored resource positions. Cleanup SHALL rank acyclic relationships from output toward input in a left-to-right direction and reserve enough horizontal space between connected ranks for the relationship-specific right-side output and left-side input leads. Cleanup SHALL compact compatible nodes into stable horizontal lanes, aligning node centers across different ranks whenever they can share a lane without overlap or reversing an acyclic relationship. Directed cycles SHALL be broken deterministically for ranking without moving an input or output to another side. The same unchanged project graph SHALL produce the same position for every node on every invocation.

#### Scenario: Clean a populated builder

- **WHEN** a user invokes `Clean layout` for a project containing resource nodes
- **THEN** the system arranges every visible node into a spaced relationship-aware layout and fits the resulting bounds in the viewport outside persistent canvas overlays

#### Scenario: Auto-clean a newly loaded project

- **WHEN** a newly accepted Compose source contains visible resources and none has a stored position
- **THEN** the first Build presentation automatically applies one atomic clean-layout transition and fits the resulting bounds in the viewport

#### Scenario: Preserve an arranged project

- **WHEN** a loaded project contains any stored resource position or the user returns to Build after its automatic cleanup
- **THEN** the system preserves the current resource positions and does not automatically clean the layout again

#### Scenario: Add to an empty hand-built project

- **WHEN** the workspace has no accepted Compose source and the user adds its first resource in Build view
- **THEN** the system does not invoke automatic cleanup

#### Scenario: Clean around directional terminals

- **WHEN** cleanup arranges an acyclic dependency, network, or named-volume relationship
- **THEN** the source rank appears to the left of the target rank with enough horizontal clearance for the line to leave the source's right-side output and enter the target's left-side input

#### Scenario: Clean supporting resources before their service

- **WHEN** cleanup arranges a network or named volume consumed by a service
- **THEN** the supporting resource appears in a source rank to the left of the consuming service and its line enters the service from the left

#### Scenario: Align compatible nodes across ranks

- **WHEN** nodes in different ranks can occupy the same horizontal lane without overlapping or reversing an acyclic relationship
- **THEN** cleanup aligns their vertical centers in an existing lane before introducing another vertical level

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

The system SHALL render dependency, network, and volume relationships in the Build view as horizontal and vertical line segments joined by rounded 90-degree corners. Every relationship SHALL start at an output on the right side of its source resource and end at an input on the left side of its target resource. Network and named-volume relationships SHALL start at their supporting resource and end at the service that consumes it. Dependency relationships SHALL start at the depended-on service and end at the dependent service. When two or more services consume the same network and an obstacle-safe common route exists, their network relationships SHALL share one visible trunk with a distinct branch to each service. Orthogonal routing SHALL preserve each relationship type's semantic stroke, dash pattern, applicable label, selection state, and animation behavior. Dependency conditions SHALL use distinct coordinated stroke colors without inline condition labels, and the Connection Types legend SHALL group human-readable keys for every supported condition under Depends On. Each relationship type SHALL attach through a dedicated type-specific terminal and use a stable type-specific routing lane offset. Differently colored relationship types SHALL NOT share coincident straight runs. A relationship path SHALL NOT enter the interior rectangle of any unrelated resource block, and SHALL recalculate from the current block rectangles when positions change.

#### Scenario: Render supported relationship types

- **WHEN** the Build view contains dependency, network, or named-volume relationships
- **THEN** every corresponding edge uses straight orthogonal segments with rounded corners instead of a Bézier curve

#### Scenario: Attach lines directionally

- **WHEN** the builder displays a relationship between any supported source and target resource
- **THEN** the line leaves a right-side output on the source and enters a left-side input on the target

#### Scenario: Feed a service from a network or named volume

- **WHEN** a service consumes a network or named volume
- **THEN** the relationship starts at the supporting resource's dedicated right-side output and ends at the service's matching left-side input

#### Scenario: Bundle a shared network

- **WHEN** two or more services consume one network and a common orthogonal route can avoid every resource block
- **THEN** their network lines share one visible trunk and separate into a distinct branch entering each service's network input

#### Scenario: Fall back from unsafe network bundling

- **WHEN** a common network trunk would enter a resource block or cannot remain between the required output and inputs
- **THEN** the affected network relationships use separate obstacle-safe orthogonal routes

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

### Requirement: Highlight relationships connected to the selected builder resource

The system SHALL apply the existing relationship-selection emphasis to every builder relationship whose source or target is the selected resource block, while preserving direct relationship selection and relationship-specific colors, patterns, labels, routing, and animation.

#### Scenario: Select a connected resource block

- **WHEN** a user selects a builder resource block with incoming or outgoing relationships
- **THEN** every relationship incident to that block uses its selected emphasis
- **AND** relationships that are not incident to the selected block remain unchanged unless selected independently

#### Scenario: Change the selected resource block

- **WHEN** a user changes the selected builder resource block
- **THEN** node-connected emphasis moves to the relationships incident to the newly selected block

#### Scenario: Clear resource selection

- **WHEN** a user clears the selected builder resource block
- **THEN** node-connected relationship emphasis is removed
- **AND** any independently selected relationship retains its selected emphasis

### Requirement: Align matching builder dependency terminals

The system SHALL place the dependency input and dependency output terminals of every builder service node at the same vertical offset. The dependency, network, and named-volume inputs SHALL form a centered, evenly spaced group with `12.5` percentage points between adjacent terminals.

#### Scenario: Display dependency terminals on a service

- **WHEN** the Build view renders a service node
- **THEN** its dependency input and dependency output terminals share one horizontal alignment
- **AND** its dependency, network, and named-volume inputs use vertical offsets of `37.5%`, `50%`, and `62.5%`, respectively

### Requirement: Anchor builder relationships to terminal centers

The system SHALL render every builder relationship line from the center of its source terminal dot to the center of its target terminal dot after node entrance effects complete.

#### Scenario: Display a builder relationship

- **WHEN** the Build view renders a dependency, network, or named-volume relationship
- **THEN** the first point of its line coincides with the center of its source terminal dot
- **AND** the last point of its line coincides with the center of its target terminal dot

### Requirement: Choose builder dependency conditions

The system SHALL let users choose `service_started`, `service_healthy`, or `service_completed_successfully` when creating a dependency relationship in the Build view and SHALL let users change the condition of an existing dependency relationship. The condition control SHALL be an accessible in-application popup, SHALL use the same labels and visual keys as the dependency-condition legend, and SHALL commit a relationship edit only after confirmation.

#### Scenario: Draw a dependency relationship

- **WHEN** a user draws a valid relationship from one service's dependency output to another service's dependency input
- **THEN** the system presents the condition popup with Started selected by default and does not create the relationship before confirmation

#### Scenario: Confirm a new dependency condition

- **WHEN** a user chooses a supported condition and confirms the popup for a newly drawn dependency
- **THEN** the system creates the dependency with that condition and renders the edge using the corresponding condition color

#### Scenario: Cancel a new dependency condition

- **WHEN** a user cancels or dismisses the condition popup for a newly drawn dependency
- **THEN** the system creates no relationship and leaves the graph unchanged

#### Scenario: Open an existing dependency condition

- **WHEN** a user right-clicks an existing dependency edge or presses Enter while that edge is selected
- **THEN** the system presents the condition popup with that edge's current condition selected

#### Scenario: Double-click an existing dependency

- **WHEN** a user double-clicks an existing dependency edge
- **THEN** the system does not present the condition popup

#### Scenario: Change an existing dependency condition

- **WHEN** a user chooses a different supported condition and confirms the popup for an existing dependency
- **THEN** the system updates the dependency and immediately renders the edge using the newly selected condition color

#### Scenario: Cancel an existing dependency edit

- **WHEN** a user cancels or dismisses the condition popup for an existing dependency
- **THEN** the system preserves the relationship and its current condition

#### Scenario: Draw a relationship without conditions

- **WHEN** a user draws a supported network or named-volume relationship
- **THEN** the system creates that relationship without presenting the dependency-condition popup
