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

The system SHALL let users create, select, update, and delete services, networks, volumes, secrets, and configs through the visual workspace. The system SHALL also offer predefined service templates.

#### Scenario: Add a resource

- **WHEN** a user adds a supported resource type or selects a service template
- **THEN** the resource appears in the current project and is available to the resource tree, editors, code preview, and diagrams

#### Scenario: Update a resource

- **WHEN** a user changes a supported resource field
- **THEN** the generated Compose YAML and all derived views reflect the new state

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

The system SHALL persist the current Compose state, selected profiles, and environment overrides in browser local storage. The system SHALL maintain up to 50 undoable state transitions and support redo until a new edit is made.

#### Scenario: Restore a previous session

- **WHEN** the application starts with valid saved workspace data
- **THEN** it restores the saved Compose state, active profiles, and environment overrides

#### Scenario: Undo and redo edits

- **WHEN** a user invokes undo or redo and a corresponding history state exists
- **THEN** the workspace moves to the previous or next recorded state

### Requirement: Clear the workspace safely

The system SHALL request confirmation before clearing the entire current project.

#### Scenario: Confirm clear all

- **WHEN** a user confirms the clear-all prompt
- **THEN** the system resets project resources and parser-related workspace selections

#### Scenario: Cancel clear all

- **WHEN** a user cancels the clear-all prompt
- **THEN** the current project remains unchanged
