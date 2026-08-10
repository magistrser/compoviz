# Architecture Visualization Specification

## Purpose

Define how Compoviz turns a Compose project into navigable visual architecture views and safe downloadable output.

## Requirements

### Requirement: Generate an architecture diagram

The system SHALL generate a diagram containing each Compose service and its relevant image or build identity, published ports, dependencies, networks, and mounted storage.

#### Scenario: Visualize a populated project

- **WHEN** the current project contains one or more services
- **THEN** the diagram includes a node for each service and edges for declared service dependencies

#### Scenario: Visualize network and storage structure

- **WHEN** services use networks or volumes
- **THEN** the diagram groups services by network and represents mounted storage in the storage area

### Requirement: Represent port mappings accurately

The system SHALL display published host ports and protocols from short-form Compose mappings, including IPv4 bindings, bracketed IPv6 bindings, ranges, TCP, and UDP.

#### Scenario: Render a bound UDP port

- **WHEN** a service publishes a UDP port with an explicit host address
- **THEN** the diagram displays the host port and UDP protocol for that service

### Requirement: Use enriched Dockerfile metadata

The system SHALL use resolved image and exposed-port metadata from a service Dockerfile when the Compose service omits the corresponding explicit values. Explicit Compose values SHALL take precedence.

#### Scenario: Visualize a build-only service

- **WHEN** a build-only service has successfully resolved Dockerfile metadata
- **THEN** the diagram uses the resolved base image and ports to describe and classify the service

### Requirement: Provide an interactive builder canvas

The system SHALL provide a node-based builder view with resource nodes, relationship edges, a background grid, zoom and pan controls, and a minimap.

#### Scenario: Open the builder

- **WHEN** a user switches to the Build view
- **THEN** the canvas renders nodes and edges derived from the current Compose state with navigation controls

### Requirement: Navigate the rendered diagram

The system SHALL allow users to pan, zoom, and reset the rendered architecture diagram.

#### Scenario: Inspect a large diagram

- **WHEN** a user drags the diagram or uses wheel or button zoom controls
- **THEN** the viewport changes within the supported pan and zoom bounds

### Requirement: Sanitize and export diagram output

The system SHALL sanitize rendered SVG before inserting it into the page and SHALL allow the current diagram to be downloaded as `docker-compose-diagram.svg`.

#### Scenario: Render untrusted SVG content

- **WHEN** generated SVG contains scripts, event handlers, or JavaScript URLs
- **THEN** the system removes those executable constructs before displaying the SVG

#### Scenario: Export a diagram

- **WHEN** a user requests diagram export after rendering succeeds
- **THEN** the browser downloads the current SVG as `docker-compose-diagram.svg`
