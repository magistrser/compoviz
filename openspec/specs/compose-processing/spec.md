# Compose Processing Specification

## Purpose

Define how Compoviz parses Docker Compose input and resolves supported multi-file, inheritance, variable, and profile semantics.

## Requirements

### Requirement: Parse Compose YAML

The system SHALL parse a YAML document whose root is an object into a Compose configuration and SHALL report invalid YAML or a non-object root as a fatal parsing error.

#### Scenario: Parse a valid Compose document

- **WHEN** a user supplies valid Compose YAML
- **THEN** the system returns a Compose configuration and parser metadata

#### Scenario: Reject invalid YAML

- **WHEN** a user supplies malformed YAML
- **THEN** the system returns no Compose configuration and reports a fatal error from the YAML parsing stage

### Requirement: Resolve included Compose files

The system SHALL resolve string and object-form `include` directives relative to the containing file when the referenced files are available in the imported file set. Included resource maps SHALL be merged, with the containing file taking precedence over included values.

#### Scenario: Resolve nested includes

- **WHEN** a Compose file includes available files using relative paths
- **THEN** the system recursively merges their services, networks, volumes, secrets, and configs into the resulting configuration

#### Scenario: Report an include problem

- **WHEN** an included file is missing, invalid, or part of a circular include chain
- **THEN** the system reports an include-resolution error and continues processing the available configuration

### Requirement: Resolve service inheritance

The system SHALL resolve local service `extends` chains, concatenate list-valued fields such as ports and volumes, deep-merge supported map-valued fields, and let the extending service override scalar fields.

#### Scenario: Extend a service

- **WHEN** a service extends another service in the same configuration
- **THEN** the resulting service contains the merged inherited and overriding configuration without an `extends` field

#### Scenario: Report invalid inheritance

- **WHEN** an extends chain references a missing service or contains a cycle
- **THEN** the system reports an extends-resolution error without turning it into a fatal YAML error

### Requirement: Interpolate environment variables

The system SHALL interpolate Compose variable expressions across nested objects and arrays using the supplied environment, including direct references, default-value operators, required-value operators, and escaped dollar signs.

#### Scenario: Resolve defined and defaulted variables

- **WHEN** input contains defined variables or variables with applicable defaults
- **THEN** the system substitutes their effective values in the parsed configuration

#### Scenario: Surface undefined variables

- **WHEN** input references variables that are not supplied and have no applicable default
- **THEN** the system preserves processing, reports the undefined variable names as metadata, and emits a warning or interpolation error as appropriate

### Requirement: Apply Compose profiles

The system SHALL discover all declared service profiles before filtering and SHALL retain unprofiled services plus services matching at least one active profile.

#### Scenario: Filter by active profiles

- **WHEN** one or more profiles are active
- **THEN** the result contains unprofiled services and services assigned to any active profile

#### Scenario: Use no active profiles

- **WHEN** no profiles are active
- **THEN** the result excludes services that declare profiles and retains services without profiles
