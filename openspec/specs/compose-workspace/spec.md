# Compose Workspace Specification

## Purpose

Define the browser workspace for importing, editing, validating, persisting, and exporting a Docker Compose project.

## Requirements

### Requirement: Import Compose project files

The system SHALL accept Compose YAML files, environment files, and project folders through file selection or drag and drop, and SHALL parse imported Compose content without blocking the main UI thread.

#### Scenario: Import a Compose file

- **WHEN** a user selects or drops a `.yml` or `.yaml` file
- **THEN** the system parses it and replaces the current workspace with the resulting project

#### Scenario: Import a project folder

- **WHEN** a user imports a folder containing Compose YAML, included YAML, and `.env` files
- **THEN** the system makes those files available for include resolution and environment interpolation

#### Scenario: Recover from worker failure

- **WHEN** asynchronous parser startup or execution fails
- **THEN** the system attempts simple YAML parsing and reports failure only when the fallback also fails

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

### Requirement: Edit and export Compose YAML

The system SHALL display generated Compose YAML, allow users to edit and reparse it, copy it to the clipboard, and download it as `docker-compose.yml`.

#### Scenario: Save an edited YAML document

- **WHEN** a user edits the YAML preview and saves valid content
- **THEN** the workspace is replaced with the reparsed configuration

#### Scenario: Export the project

- **WHEN** a user requests YAML export
- **THEN** the browser downloads the current generated YAML as `docker-compose.yml`

### Requirement: Validate the current project

The system SHALL surface project issues for services without an image or build, duplicate host-port bindings, duplicate container names, undefined networks, missing dependencies, and parser diagnostics.

#### Scenario: Detect an invalid service reference

- **WHEN** a service references a dependency or network that is not defined
- **THEN** the system shows an actionable issue associated with that service

### Requirement: Preserve local editing state

The system SHALL persist the current Compose state, selected profiles, and environment overrides in browser local storage. The system SHALL maintain up to 50 undoable state transitions and support redo until a new edit is made. Each accepted editing intent that changes Compose state SHALL create exactly one history transition, including template application, resource rename, multi-resource removal, positioning, and relationship changes. Cancelled, rejected, and unchanged editing intents SHALL create no history transition.

#### Scenario: Restore a previous session

- **WHEN** the application starts with valid saved workspace data
- **THEN** it restores the saved Compose state, active profiles, and environment overrides

#### Scenario: Undo and redo edits

- **WHEN** a user invokes undo or redo and a corresponding history state exists
- **THEN** the workspace moves to the previous or next recorded state

#### Scenario: Record one atomic editing transition

- **WHEN** an accepted editing intent changes one or more Compose resources or relationships
- **THEN** one undo returns the complete workspace to its state before that intent and one redo reapplies the complete intent

#### Scenario: Do not record a non-applied intent

- **WHEN** an editing intent is cancelled, rejected, or would leave the Compose state unchanged
- **THEN** the current history position, undo availability, and redo availability remain unchanged

#### Scenario: Limit editing history

- **WHEN** more than 50 accepted state-changing edits are committed
- **THEN** the system retains the most recent 50 undoable transitions

#### Scenario: Invalidate redo after a new edit

- **WHEN** the user undoes an edit and then commits a new state-changing edit
- **THEN** the previous redo branch is discarded

### Requirement: Clear the workspace safely

The system SHALL request confirmation through an in-application popup before clearing the entire current project. It SHALL clear project resources and parser-related workspace selections only after explicit confirmation; cancelling or dismissing the popup SHALL leave the project unchanged.

#### Scenario: Confirm clear all

- **WHEN** a user confirms the clear-all popup
- **THEN** the system resets project resources and parser-related workspace selections

#### Scenario: Cancel clear all

- **WHEN** a user cancels or dismisses the clear-all popup
- **THEN** the current project remains unchanged

### Requirement: Process workspace intents atomically

The system SHALL expose Compose source replacement and profile/environment configuration as workspace intents whose accepted result commits the source, Compose state, AST, generated YAML, issues, suggestions, parser metadata, enrichment metadata, and browser persistence as one coherent transition.

#### Scenario: Commit a successful replacement

- **WHEN** a source replacement parses and completes nonfatal enrichment
- **THEN** every project-derived workspace field and persisted project value reflects the same accepted replacement

#### Scenario: Preserve the workspace after a rejected replacement

- **WHEN** a source replacement cannot be parsed by either the worker or synchronous fallback
- **THEN** the system returns a typed rejection and leaves the previously committed source, project-derived snapshot, and persisted project unchanged

#### Scenario: Apply configuration consistently

- **WHEN** active profiles or explicit environment overrides change and reparsing succeeds
- **THEN** the system reparses the retained source and atomically commits project-derived fields using the new configuration

#### Scenario: Preserve the project after rejected configuration

- **WHEN** active profiles or explicit environment overrides change and reparsing fails
- **THEN** the new configuration remains visible and persisted while the previously committed source and project-derived snapshot remain unchanged

### Requirement: Prefer the latest workspace intent

The system SHALL prevent asynchronous processing started for an older workspace generation from mutating the snapshot or browser persistence after a newer replacement, configuration, or clear intent begins.

#### Scenario: Supersede overlapping replacement work

- **WHEN** an older replacement completes parsing or enrichment after a newer workspace intent has started
- **THEN** the older intent returns a typed superseded outcome and makes no state or persistence change

#### Scenario: Clear during processing

- **WHEN** the workspace is cleared while replacement or configuration processing is still active
- **THEN** later completion of that processing does not repopulate the cleared workspace or persisted project

### Requirement: Use consistent parser fallback and enrichment

The system SHALL use the parser worker as the primary adapter, SHALL attempt synchronous parsing when worker startup or execution fails, and SHALL route successful results from both adapters through the same nonfatal enrichment and commit behavior.

#### Scenario: Recover from worker failure consistently

- **WHEN** worker processing fails and synchronous parsing succeeds
- **THEN** the accepted snapshot contains the same classes of metadata, derived data, and enrichment result as a worker success

#### Scenario: Continue after enrichment failure

- **WHEN** parsing succeeds but Dockerfile enrichment fails
- **THEN** the system accepts the parsed project, reports enrichment metadata, and commits all other project-derived fields coherently

### Requirement: Resolve imported workspace sources

The system SHALL classify selected or recursively dropped files, retain normalized project-relative file paths, select the existing preferred Compose filename when multiple YAML files are present, make the retained map available to include resolution, and interpolate with imported `.env` values overridden by explicit workspace environment values.

#### Scenario: Import a directory with includes and environment

- **WHEN** a directory contains a preferred primary Compose file, included YAML files, Dockerfiles, and a `.env` file
- **THEN** the system parses the primary source with retained project-relative files and uses explicit environment overrides in preference to matching `.env` values

#### Scenario: Reject a source without Compose YAML

- **WHEN** selected or dropped files contain no supported Compose YAML source
- **THEN** the system returns a typed rejection and leaves the current workspace unchanged

### Requirement: Expose the Compose workspace boundary

The system SHALL provide a `useComposeWorkspace()` interface with a read-only snapshot and `replace`, `configure`, `clear`, and `downloadYaml` intents, and SHALL return typed accepted, rejected, or superseded outcomes from asynchronous processing intents.

#### Scenario: Download generated YAML

- **WHEN** a caller invokes `downloadYaml` for a populated workspace
- **THEN** the browser downloads the current generated Compose YAML as `docker-compose.yml`

#### Scenario: Clear the public workspace

- **WHEN** a caller invokes `clear`
- **THEN** the Compose project, retained source, parser selections, and project persistence are reset without exposing internal reducer or adapter operations

### Requirement: Apply builder placements atomically

The system SHALL accept an automatic builder placement as one editing intent containing positions for multiple existing resources. It SHALL validate all targets before mutation, persist all changed `_position` values in one history transition, and treat a placement whose coordinates already match the current workspace as unchanged.

#### Scenario: Persist a generated placement

- **WHEN** automatic layout supplies changed positions for multiple existing resources
- **THEN** the system commits every supplied position together as one undoable workspace transition

#### Scenario: Undo and redo automatic placement

- **WHEN** a user undoes or redoes a committed automatic layout
- **THEN** one history operation restores all resource positions from before or after that layout respectively

#### Scenario: Repeat an identical placement

- **WHEN** automatic layout supplies positions identical to the current positions
- **THEN** the workspace state, persistence, and editing-history position remain unchanged

#### Scenario: Reject a stale placement atomically

- **WHEN** an automatic layout references any resource that no longer exists
- **THEN** the system rejects the entire placement and changes no resource position, persistence value, or editing-history position

### Requirement: Use one canonical interpretation per workspace revision

The system SHALL derive validation issues, suggestions, builder data, and architecture visualization from the same canonical interpretation of each accepted Compose workspace revision while retaining exact raw state for editing, persistence, and YAML generation.

#### Scenario: Derive an accepted revision

- **WHEN** workspace processing accepts a new Compose revision
- **THEN** its AST, issues, suggestions, builder data, diagram input, and generated YAML all describe that same revision

#### Scenario: Preserve raw-dependent checks

- **WHEN** validation or suggestions require an exact raw Compose value
- **THEN** the canonical interpretation retains access to that revision's raw value without renormalizing a competing input
