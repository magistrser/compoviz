## ADDED Requirements

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
