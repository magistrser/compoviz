# Project Comparison Specification

## Purpose

Define side-by-side analysis and visualization of multiple Docker Compose projects.

## Requirements

### Requirement: Load comparison projects

The system SHALL allow users to load up to three Compose YAML projects for comparison and SHALL identify each project by a non-empty trimmed Compose name, otherwise by its imported filename without the final extension, otherwise as `Untitled`. The system SHALL check capacity before parsing a new admission and SHALL return typed capacity or parsing rejections without mutating the comparison snapshot.

#### Scenario: Load multiple projects

- **WHEN** a user selects or drops valid Compose YAML files while fewer than three projects are loaded
- **THEN** the system parses and adds the files in admission order to the comparison workspace

#### Scenario: Prefer the Compose project name

- **WHEN** admitted YAML has a non-empty Compose `name` and an imported filename
- **THEN** the project uses the trimmed Compose name

#### Scenario: Fall back to filename and Untitled

- **WHEN** admitted YAML has no non-empty Compose name
- **THEN** the project uses the imported filename without its final extension or `Untitled` when no filename is supplied

#### Scenario: Reject a fourth project before parsing

- **WHEN** three projects are already loaded and the user attempts to admit another input
- **THEN** the system returns a typed capacity rejection without parsing and leaves projects, ordering, findings, severity counts, and summary unchanged

#### Scenario: Reject invalid comparison input

- **WHEN** an admission below capacity contains invalid YAML or a non-object root
- **THEN** the system returns a typed parsing rejection and leaves projects, ordering, findings, severity counts, and summary unchanged

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

The system SHALL derive comparison findings, error/warning/informational severity counts, and summary prose from the same immutable project collection after every accepted admission, removal, or clear.

#### Scenario: Compare projects with findings

- **WHEN** two or more loaded projects produce comparison results
- **THEN** the system displays detailed findings and summary severity totals that match those findings

#### Scenario: Recompute after removal

- **WHEN** a loaded project is removed
- **THEN** projects, findings, severity counts, and summary all reflect the same remaining ordered collection

#### Scenario: Clear comparison projects

- **WHEN** comparison projects are cleared
- **THEN** projects and findings are empty and every summary severity count is zero

### Requirement: Visualize multiple projects

The system SHALL render loaded projects in a combined sanitized diagram and visually highlight error-level conflicts. The comparison diagram SHALL provide the shared pan, zoom, fit, centered reset, and SVG export controls.

#### Scenario: Open a multi-project diagram

- **WHEN** at least two projects are loaded
- **THEN** the comparison view renders their services and relationships together with conflict context using the shared controls

#### Scenario: Export a comparison diagram

- **WHEN** a user exports a successfully rendered comparison diagram
- **THEN** the browser downloads its sanitized SVG as `docker-compose-diagram.svg`
