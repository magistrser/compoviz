## ADDED Requirements

### Requirement: Preserve dependency condition edits

The system SHALL represent a supported dependency condition as domain data in relationship editing intents, SHALL preserve the conditions and configuration of unaffected dependencies, and SHALL serialize the resulting `depends_on` value using valid Compose syntax. Each confirmed creation or condition change SHALL be one atomic editing transition; cancelled and unchanged choices SHALL create no transition.

#### Scenario: Store a non-default dependency condition

- **WHEN** a user confirms Healthy or Completed successfully for a dependency
- **THEN** the service stores long-form `depends_on` data with the corresponding Compose condition and generated YAML reflects that condition

#### Scenario: Store only default dependency conditions

- **WHEN** every dependency of a service uses Started and has no other long-form configuration
- **THEN** the service may store and generate the compact short-form `depends_on` list without changing dependency semantics

#### Scenario: Preserve sibling dependencies

- **WHEN** a user creates or changes one dependency condition on a service that has other dependencies
- **THEN** the system preserves every unaffected dependency target, condition, and supported configuration

#### Scenario: Undo a confirmed dependency condition edit

- **WHEN** a user confirms creation of a conditioned dependency or changes an existing dependency condition and then invokes undo
- **THEN** the complete dependency edit is reverted in one history step

#### Scenario: Confirm the existing condition

- **WHEN** a user confirms the condition already stored on an existing dependency
- **THEN** the workspace state and editing history remain unchanged

#### Scenario: Cancel dependency condition selection

- **WHEN** a user cancels condition selection for a new or existing dependency
- **THEN** the workspace state and editing history remain unchanged
