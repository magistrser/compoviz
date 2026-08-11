## ADDED Requirements

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

- **WHEN** a user double-clicks an existing dependency edge or presses Enter while that edge is selected
- **THEN** the system presents the condition popup with that edge's current condition selected

#### Scenario: Change an existing dependency condition

- **WHEN** a user chooses a different supported condition and confirms the popup for an existing dependency
- **THEN** the system updates the dependency and immediately renders the edge using the newly selected condition color

#### Scenario: Cancel an existing dependency edit

- **WHEN** a user cancels or dismisses the condition popup for an existing dependency
- **THEN** the system preserves the relationship and its current condition

#### Scenario: Draw a relationship without conditions

- **WHEN** a user draws a supported network or named-volume relationship
- **THEN** the system creates that relationship without presenting the dependency-condition popup
