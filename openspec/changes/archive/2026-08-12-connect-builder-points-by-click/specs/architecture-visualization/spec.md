## ADDED Requirements

### Requirement: Connect builder terminals with clicks

The system SHALL create supported Build view relationships through a two-click terminal-selection interaction instead of a press-and-drag gesture. The first click SHALL enter a visible connection mode from either an input or output terminal, and a compatible second click SHALL complete the same canonical output-to-input relationship regardless of endpoint selection order. Supported terminal pairs SHALL be dependency output to dependency input, network output to network input, and named-volume output to named-volume input.

#### Scenario: Start from an output

- **WHEN** a user clicks a supported output terminal while no connection is being selected
- **THEN** the output is visibly selected and the builder prompts the user to choose a compatible input terminal

#### Scenario: Start from an input

- **WHEN** a user clicks a supported input terminal while no connection is being selected
- **THEN** the input is visibly selected and the builder prompts the user to choose a compatible output terminal

#### Scenario: Complete a compatible connection

- **WHEN** a user in connection mode clicks a compatible opposite terminal
- **THEN** the builder exits connection mode and processes the canonical output-to-input relationship through its relationship-specific creation flow

#### Scenario: Select an incompatible terminal

- **WHEN** a user in connection mode clicks an endpoint with the same direction or a different relationship type
- **THEN** the builder creates no relationship and keeps the original terminal selected so the user can choose a compatible point

#### Scenario: Attempt to drag a relationship

- **WHEN** a user presses a terminal and moves the pointer while holding the button
- **THEN** the builder does not start or create a relationship from that drag gesture

#### Scenario: Cancel connection mode

- **WHEN** a user clicks the selected terminal again, clicks the canvas pane, invokes the connection-mode Cancel action, or presses Escape
- **THEN** the builder exits connection mode without changing the Compose project
