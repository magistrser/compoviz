## ADDED Requirements

### Requirement: Apply builder placements atomically
The system SHALL accept an automatic builder placement as one editing intent containing positions for multiple existing resources. It SHALL validate all targets before mutation, persist all changed `_position` values in one history transition, and treat a placement whose coordinates already match the current workspace as unchanged.

#### Scenario: Persist a generated placement
- **WHEN** automatic layout supplies changed positions for multiple existing resources
- **THEN** the system commits every supplied position together as one undoable workspace transition

#### Scenario: Undo and redo automatic placement
- **WHEN** a user undoes or redoes a committed automatic layout
- **THEN** one history operation restores all resource positions from before or after that layout respectively

#### Scenario: Repeat an identical placement
- **WHEN** automatic layout supplies positions identical to the current positions
- **THEN** the workspace state, persistence, and editing-history position remain unchanged

#### Scenario: Reject a stale placement atomically
- **WHEN** an automatic layout references any resource that no longer exists
- **THEN** the system rejects the entire placement and changes no resource position, persistence value, or editing-history position
