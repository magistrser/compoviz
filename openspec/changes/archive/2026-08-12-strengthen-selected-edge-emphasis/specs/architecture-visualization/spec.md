## MODIFIED Requirements

### Requirement: Highlight relationships connected to the selected builder resource

The system SHALL apply strong selection emphasis to every builder relationship whose source or target is the selected resource block and to every independently selected relationship. Selected relationships SHALL use a visible stroke at least twice as wide as their unselected stroke together with a color-matched glow, while preserving relationship-specific colors, patterns, labels, routing, and animation.

#### Scenario: Select a connected resource block

- **WHEN** a user selects a builder resource block with incoming or outgoing relationships
- **THEN** every relationship incident to that block uses the thicker, glowing selected emphasis
- **AND** relationships that are not incident to the selected block remain unchanged unless selected independently

#### Scenario: Select a relationship directly

- **WHEN** a user selects a builder relationship independently
- **THEN** that relationship uses the same thicker, glowing selected emphasis

#### Scenario: Change the selected resource block

- **WHEN** a user changes the selected builder resource block
- **THEN** node-connected emphasis moves to the relationships incident to the newly selected block

#### Scenario: Clear resource selection

- **WHEN** a user clears the selected builder resource block
- **THEN** node-connected relationship emphasis is removed
- **AND** any independently selected relationship retains its selected emphasis
