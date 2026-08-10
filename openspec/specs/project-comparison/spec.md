# Project Comparison Specification

## Purpose

Define side-by-side analysis and visualization of multiple Docker Compose projects.

## Requirements

### Requirement: Load comparison projects

The system SHALL allow users to load up to three Compose YAML projects for comparison and SHALL identify each project by its Compose name or imported filename.

#### Scenario: Load multiple projects

- **WHEN** a user selects or drops valid Compose YAML files while fewer than three projects are loaded
- **THEN** the system parses and adds the files to the comparison workspace

#### Scenario: Reach the project limit

- **WHEN** three projects are already loaded and the user attempts to add another
- **THEN** the system does not add the project and informs the user of the three-project limit

### Requirement: Detect cross-project conflicts

The system SHALL report error-level conflicts for identical host IP and port bindings and duplicate explicit container names used by different projects.

#### Scenario: Detect a host-port conflict

- **WHEN** services in different projects publish the same host port on the same effective IP binding
- **THEN** the comparison reports an error naming the binding and involved projects

#### Scenario: Allow distinct IP bindings

- **WHEN** different projects publish the same port number on distinct explicit IP addresses
- **THEN** the comparison does not report a port conflict for those mappings

### Requirement: Identify shared resources

The system SHALL report shared host paths as warnings and shared named volumes, networks, environment files, and service names as informational overlaps.

#### Scenario: Share a host path

- **WHEN** services in different projects mount the same relative or absolute host path
- **THEN** the comparison reports a warning for that path

#### Scenario: Share a named resource

- **WHEN** different projects use the same named volume or define the same network
- **THEN** the comparison reports the overlap as informational

### Requirement: Summarize comparison findings

The system SHALL group comparison findings by error, warning, and informational severity and display counts for each category.

#### Scenario: Compare projects with findings

- **WHEN** two or more loaded projects produce comparison results
- **THEN** the system displays severity totals and the detailed involved resources and projects

### Requirement: Visualize multiple projects

The system SHALL render loaded projects in a combined sanitized diagram and visually highlight error-level conflicts. Users SHALL be able to pan, zoom, and reset this diagram.

#### Scenario: Open a multi-project diagram

- **WHEN** at least two projects are loaded
- **THEN** the comparison view renders their services and relationships together with conflict context
