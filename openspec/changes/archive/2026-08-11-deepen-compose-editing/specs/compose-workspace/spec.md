## MODIFIED Requirements

### Requirement: Preserve local editing state

The system SHALL persist the current Compose state, selected profiles, and environment overrides in browser local storage. The system SHALL maintain up to 50 undoable state transitions and support redo until a new edit is made. Each accepted editing intent that changes Compose state SHALL create exactly one history transition, including template application, resource rename, multi-resource removal, positioning, and relationship changes. Cancelled, rejected, and unchanged editing intents SHALL create no history transition.

#### Scenario: Restore a previous session

- **WHEN** the application starts with valid saved workspace data
- **THEN** it restores the saved Compose state, active profiles, and environment overrides

#### Scenario: Undo and redo edits

- **WHEN** a user invokes undo or redo and a corresponding history state exists
- **THEN** the workspace moves to the previous or next recorded state

#### Scenario: Record one atomic editing transition

- **WHEN** an accepted editing intent changes one or more Compose resources or relationships
- **THEN** one undo returns the complete workspace to its state before that intent and one redo reapplies the complete intent

#### Scenario: Do not record a non-applied intent

- **WHEN** an editing intent is cancelled, rejected, or would leave the Compose state unchanged
- **THEN** the current history position, undo availability, and redo availability remain unchanged

#### Scenario: Limit editing history

- **WHEN** more than 50 accepted state-changing edits are committed
- **THEN** the system retains the most recent 50 undoable transitions

#### Scenario: Invalidate redo after a new edit

- **WHEN** the user undoes an edit and then commits a new state-changing edit
- **THEN** the previous redo branch is discarded
