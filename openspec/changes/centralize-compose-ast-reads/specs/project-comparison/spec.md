## ADDED Requirements

### Requirement: Use one canonical interpretation per admitted comparison project

The system SHALL derive comparison findings and combined diagram input from the same canonical interpretation created for each admitted immutable project.

#### Scenario: Recompute comparison outputs

- **WHEN** a project is admitted or the comparison collection changes
- **THEN** findings, summary, and diagram input use the canonical interpretation associated with every project in that collection
