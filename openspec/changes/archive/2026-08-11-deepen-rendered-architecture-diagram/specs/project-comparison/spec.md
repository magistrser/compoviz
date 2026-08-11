## MODIFIED Requirements

### Requirement: Visualize multiple projects

The system SHALL render loaded projects in a combined sanitized diagram and visually highlight error-level conflicts. The comparison diagram SHALL provide the shared pan, zoom, fit, centered reset, and SVG export controls.

#### Scenario: Open a multi-project diagram

- **WHEN** at least two projects are loaded
- **THEN** the comparison view renders their services and relationships together with conflict context using the shared controls

#### Scenario: Export a comparison diagram

- **WHEN** a user exports a successfully rendered comparison diagram
- **THEN** the browser downloads its sanitized SVG as `docker-compose-diagram.svg`
