## MODIFIED Requirements

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
