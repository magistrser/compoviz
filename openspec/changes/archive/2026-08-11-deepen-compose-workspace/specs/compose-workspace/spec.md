## ADDED Requirements

### Requirement: Process workspace intents atomically

The system SHALL expose Compose source replacement and profile/environment configuration as workspace intents whose accepted result commits the source, Compose state, AST, generated YAML, issues, suggestions, parser metadata, enrichment metadata, and browser persistence as one coherent transition.

#### Scenario: Commit a successful replacement

- **WHEN** a source replacement parses and completes nonfatal enrichment
- **THEN** every project-derived workspace field and persisted project value reflects the same accepted replacement

#### Scenario: Preserve the workspace after a rejected replacement

- **WHEN** a source replacement cannot be parsed by either the worker or synchronous fallback
- **THEN** the system returns a typed rejection and leaves the previously committed source, project-derived snapshot, and persisted project unchanged

#### Scenario: Apply configuration consistently

- **WHEN** active profiles or explicit environment overrides change and reparsing succeeds
- **THEN** the system reparses the retained source and atomically commits project-derived fields using the new configuration

#### Scenario: Preserve the project after rejected configuration

- **WHEN** active profiles or explicit environment overrides change and reparsing fails
- **THEN** the new configuration remains visible and persisted while the previously committed source and project-derived snapshot remain unchanged

### Requirement: Prefer the latest workspace intent

The system SHALL prevent asynchronous processing started for an older workspace generation from mutating the snapshot or browser persistence after a newer replacement, configuration, or clear intent begins.

#### Scenario: Supersede overlapping replacement work

- **WHEN** an older replacement completes parsing or enrichment after a newer workspace intent has started
- **THEN** the older intent returns a typed superseded outcome and makes no state or persistence change

#### Scenario: Clear during processing

- **WHEN** the workspace is cleared while replacement or configuration processing is still active
- **THEN** later completion of that processing does not repopulate the cleared workspace or persisted project

### Requirement: Use consistent parser fallback and enrichment

The system SHALL use the parser worker as the primary adapter, SHALL attempt synchronous parsing when worker startup or execution fails, and SHALL route successful results from both adapters through the same nonfatal enrichment and commit behavior.

#### Scenario: Recover from worker failure consistently

- **WHEN** worker processing fails and synchronous parsing succeeds
- **THEN** the accepted snapshot contains the same classes of metadata, derived data, and enrichment result as a worker success

#### Scenario: Continue after enrichment failure

- **WHEN** parsing succeeds but Dockerfile enrichment fails
- **THEN** the system accepts the parsed project, reports enrichment metadata, and commits all other project-derived fields coherently

### Requirement: Resolve imported workspace sources

The system SHALL classify selected or recursively dropped files, retain normalized project-relative file paths, select the existing preferred Compose filename when multiple YAML files are present, make the retained map available to include resolution, and interpolate with imported `.env` values overridden by explicit workspace environment values.

#### Scenario: Import a directory with includes and environment

- **WHEN** a directory contains a preferred primary Compose file, included YAML files, Dockerfiles, and a `.env` file
- **THEN** the system parses the primary source with retained project-relative files and uses explicit environment overrides in preference to matching `.env` values

#### Scenario: Reject a source without Compose YAML

- **WHEN** selected or dropped files contain no supported Compose YAML source
- **THEN** the system returns a typed rejection and leaves the current workspace unchanged

### Requirement: Expose the Compose workspace boundary

The system SHALL provide a `useComposeWorkspace()` interface with a read-only snapshot and `replace`, `configure`, `clear`, and `downloadYaml` intents, and SHALL return typed accepted, rejected, or superseded outcomes from asynchronous processing intents.

#### Scenario: Download generated YAML

- **WHEN** a caller invokes `downloadYaml` for a populated workspace
- **THEN** the browser downloads the current generated Compose YAML as `docker-compose.yml`

#### Scenario: Clear the public workspace

- **WHEN** a caller invokes `clear`
- **THEN** the Compose project, retained source, parser selections, and project persistence are reset without exposing internal reducer or adapter operations
