# Examples Gallery Specification

## Purpose

Define discovery and loading of curated and remote Docker Compose examples for architecture visualization.

## Requirements

### Requirement: Browse curated examples

The system SHALL present a curated set of valid Compose examples with names, descriptions, categories, technology tags, service counts, and source links.

#### Scenario: Open the curated gallery

- **WHEN** a user opens the examples gallery
- **THEN** the system displays the curated examples and states that they are provided for visualization only

#### Scenario: Filter curated examples

- **WHEN** a user enters search text or selects a category
- **THEN** the gallery displays only matching examples without changing the underlying catalog order or data

### Requirement: Browse remote awesome-compose examples

The system SHALL fetch available example directories from Docker's `awesome-compose` GitHub repository, exclude hidden and known non-example entries, and cache the resulting catalog for five minutes.

#### Scenario: Load the remote catalog

- **WHEN** a user opens the Browse All gallery tab for the first time
- **THEN** the system fetches and displays the available remote example directories

#### Scenario: Fail to load the remote catalog

- **WHEN** the GitHub catalog request fails
- **THEN** the gallery displays the error and offers a retry action

### Requirement: Fetch remote Compose content

The system SHALL load a selected remote example by trying supported Compose filenames in order and SHALL report an error when no supported Compose file is available.

#### Scenario: Use a fallback Compose filename

- **WHEN** a remote example does not contain `compose.yaml` but does contain a later supported filename
- **THEN** the system loads the first available fallback file

#### Scenario: Find no Compose file

- **WHEN** none of the supported Compose filenames exists in the selected remote example
- **THEN** the gallery reports that the example could not be loaded

### Requirement: Load an example into the workspace

The system SHALL parse the selected example into the current workspace and produce a non-empty architecture diagram for examples containing services.

#### Scenario: Select an example

- **WHEN** a user selects a valid curated or remote example
- **THEN** the gallery closes and the workspace loads the example for visualization

### Requirement: Provide accessible modal behavior

The system SHALL expose the gallery as a labeled modal dialog and allow it to be closed with its close button, a backdrop click, or the Escape key.

#### Scenario: Close with the keyboard

- **WHEN** the gallery is open and the user presses Escape
- **THEN** the gallery closes
