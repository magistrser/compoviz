## ADDED Requirements

### Requirement: Present accessible workspace action popups

The system SHALL render resource naming, resource deletion, and clear-all interactions as application modal popups rather than native browser dialogs. Each popup SHALL expose an accessible name and modal dialog semantics, move keyboard focus into the popup, keep keyboard navigation within it while open, support keyboard cancellation, and restore focus to the initiating control after closing.

#### Scenario: Open a resource naming popup

- **WHEN** a keyboard user starts an action that requires a resource name
- **THEN** the system opens an application modal popup and places focus in its name input

#### Scenario: Cancel a popup with the keyboard

- **WHEN** a user presses Escape while a workspace action popup is open
- **THEN** the system closes the popup, treats the result as cancelled, and restores focus to the control that opened it

#### Scenario: Navigate within an open popup

- **WHEN** a user navigates forward or backward with Tab while a workspace action popup is open
- **THEN** keyboard focus remains within the popup until it is submitted or cancelled

## MODIFIED Requirements

### Requirement: Edit Compose resources

The system SHALL let users create, select, update, and delete services, networks, volumes, secrets, and configs through the visual workspace. When resource creation requires a user-provided name, the system SHALL collect it through an in-application naming popup and SHALL create the resource only after the user submits a non-empty trimmed name. The system SHALL request confirmation through an in-application popup before deleting a resource. The system SHALL also offer predefined service templates.

#### Scenario: Add a named resource

- **WHEN** a user starts adding a supported resource type from the workspace controls or by dropping it into the visual builder
- **THEN** the system presents a naming popup and adds the resource to the project only after a non-empty trimmed name is submitted

#### Scenario: Cancel resource naming

- **WHEN** a user cancels or dismisses a resource naming popup
- **THEN** the system leaves project resources and the current selection unchanged

#### Scenario: Add a resource from a template

- **WHEN** a user selects a predefined service template
- **THEN** the configured service and any template-provided resources appear in the current project and are available to the resource tree, editors, code preview, and diagrams

#### Scenario: Update a resource

- **WHEN** a user changes a supported resource field
- **THEN** the generated Compose YAML and all derived views reflect the new state

#### Scenario: Confirm resource deletion

- **WHEN** a user confirms a resource deletion popup
- **THEN** the resource is removed from the project and a deleted current selection is cleared

#### Scenario: Cancel resource deletion

- **WHEN** a user cancels or dismisses a resource deletion popup
- **THEN** the resource and current selection remain unchanged

### Requirement: Clear the workspace safely

The system SHALL request confirmation through an in-application popup before clearing the entire current project. It SHALL clear project resources and parser-related workspace selections only after explicit confirmation; cancelling or dismissing the popup SHALL leave the project unchanged.

#### Scenario: Confirm clear all

- **WHEN** a user confirms the clear-all popup
- **THEN** the system resets project resources and parser-related workspace selections

#### Scenario: Cancel clear all

- **WHEN** a user cancels or dismisses the clear-all popup
- **THEN** the current project remains unchanged
