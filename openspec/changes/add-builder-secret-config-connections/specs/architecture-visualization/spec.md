## ADDED Requirements

### Requirement: Represent builder secret and config relationships
The system SHALL derive a Build-view relationship edge for every service reference to a defined top-level secret or config, whether that reference uses Compose short syntax or long syntax. Secret and config relationships SHALL use distinct semantic colors and dotted patterns, SHALL participate in connected-node and direct-edge selection emphasis, and SHALL be identified in the Connection Types legend. Selecting and deleting one of these edges SHALL request removal of the represented service reference through the same relationship-editing boundary as other builder edges.

#### Scenario: Render existing short-form references
- **WHEN** a service references a defined secret or config by name
- **THEN** the Build view renders a relationship from that resource node to the consuming service

#### Scenario: Render an existing long-form reference
- **WHEN** a service references a defined secret or config with `source` and additional long-form attributes
- **THEN** the Build view renders one relationship for the referenced `source`

#### Scenario: Distinguish secrets and configs
- **WHEN** the Build view displays both secret and config relationships
- **THEN** their edge colors and dotted patterns distinguish the two relationship types
- **AND** the Connection Types legend identifies both visual keys

#### Scenario: Highlight a selected secret or config connection
- **WHEN** a secret node, config node, consuming service, or corresponding edge is selected
- **THEN** every incident selected relationship receives the standard builder relationship emphasis without losing its semantic color or pattern

#### Scenario: Delete a secret or config edge
- **WHEN** a user deletes a selected secret or config relationship edge
- **THEN** the builder submits one disconnect change for the represented resource reference

### Requirement: Lay out and route builder secret and config relationships
The system SHALL treat secret and config relationships as directed supporting-resource relationships from the resource's dedicated right-side output to the consuming service's dedicated left-side input. Deterministic cleanup SHALL rank each acyclic secret or config source before its consuming service. Each relationship SHALL use its own stable routing lane and SHALL follow the same orthogonal, rounded, obstacle-avoiding, endpoint-centered routing rules as other builder relationships.

#### Scenario: Clean a service with secret and config inputs
- **WHEN** cleanup arranges a service that consumes a secret or config
- **THEN** each supporting resource appears in a source rank to the left of the service
- **AND** its relationship enters the service through the matching input

#### Scenario: Route around unrelated resources
- **WHEN** an unrelated resource block lies between a secret or config output and its consuming service input
- **THEN** the relationship deterministically routes around the block without entering its interior

#### Scenario: Separate relationship lanes
- **WHEN** a service consumes resources of multiple relationship types
- **THEN** secret and config relationships use dedicated terminals and stable lanes that do not share coincident straight runs with differently colored relationship types

## MODIFIED Requirements

### Requirement: Align matching builder dependency terminals
The system SHALL place the dependency input and dependency output terminals of every builder service node at the same vertical offset. The dependency, network, named-volume, secret, and config inputs SHALL form a centered, evenly spaced group with `12.5` percentage points between adjacent terminals.

#### Scenario: Display relationship terminals on a service
- **WHEN** the Build view renders a service node
- **THEN** its dependency input and dependency output terminals share one horizontal alignment
- **AND** its dependency, network, named-volume, secret, and config inputs use vertical offsets of `25%`, `37.5%`, `50%`, `62.5%`, and `75%`, respectively

### Requirement: Anchor builder relationships to terminal centers
The system SHALL render every builder relationship line from the center of its source terminal dot to the center of its target terminal dot after node entrance effects complete.

#### Scenario: Display a builder relationship
- **WHEN** the Build view renders a dependency, network, named-volume, secret, or config relationship
- **THEN** the first point of its line coincides with the center of its source terminal dot
- **AND** the last point of its line coincides with the center of its target terminal dot

### Requirement: Connect builder terminals with clicks
The system SHALL create supported Build view relationships through a two-click terminal-selection interaction instead of a press-and-drag gesture. The first click SHALL enter a visible connection mode from either an input or output terminal, and a compatible second click SHALL complete the same canonical output-to-input relationship regardless of endpoint selection order. Supported terminal pairs SHALL be dependency output to dependency input, network output to network input, named-volume output to named-volume input, secret output to secret input, and config output to config input.

#### Scenario: Start from an output
- **WHEN** a user clicks a supported output terminal while no connection is being selected
- **THEN** the output is visibly selected and the builder prompts the user to choose a compatible input terminal

#### Scenario: Start from an input
- **WHEN** a user clicks a supported input terminal while no connection is being selected
- **THEN** the input is visibly selected and the builder prompts the user to choose a compatible output terminal

#### Scenario: Complete a compatible connection
- **WHEN** a user in connection mode clicks a compatible opposite terminal
- **THEN** the builder exits connection mode and processes the canonical output-to-input relationship through its relationship-specific creation flow

#### Scenario: Connect a secret or config
- **WHEN** a user completes a secret-output-to-secret-input or config-output-to-config-input connection
- **THEN** the builder submits one relationship change that connects the resource to the consuming service without presenting a dependency-condition popup

#### Scenario: Select an incompatible terminal
- **WHEN** a user in connection mode clicks an endpoint with the same direction or a different relationship type
- **THEN** the builder creates no relationship and keeps the original terminal selected so the user can choose a compatible point

#### Scenario: Attempt to drag a relationship
- **WHEN** a user presses a terminal and moves the pointer while holding the button
- **THEN** the builder does not start or create a relationship from that drag gesture

#### Scenario: Cancel connection mode
- **WHEN** a user clicks the selected terminal again, clicks the canvas pane, invokes the connection-mode Cancel action, or presses Escape
- **THEN** the builder exits connection mode without changing the Compose project
