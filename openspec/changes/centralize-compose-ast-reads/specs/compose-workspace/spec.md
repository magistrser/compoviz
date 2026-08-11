## ADDED Requirements

### Requirement: Use one canonical interpretation per workspace revision

The system SHALL derive validation issues, suggestions, builder data, and architecture visualization from the same canonical interpretation of each accepted Compose workspace revision while retaining exact raw state for editing, persistence, and YAML generation.

#### Scenario: Derive an accepted revision

- **WHEN** workspace processing accepts a new Compose revision
- **THEN** its AST, issues, suggestions, builder data, diagram input, and generated YAML all describe that same revision

#### Scenario: Preserve raw-dependent checks

- **WHEN** validation or suggestions require an exact raw Compose value
- **THEN** the canonical interpretation retains access to that revision's raw value without renormalizing a competing input
