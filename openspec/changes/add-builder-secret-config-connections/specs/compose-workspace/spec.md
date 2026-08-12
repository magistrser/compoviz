## ADDED Requirements

### Requirement: Preserve secret and config relationship edits
The system SHALL represent service-to-secret and service-to-config connections as domain relationship changes. Connecting a defined resource SHALL add one short-form reference only when no short-form or long-form reference with the same source exists. Disconnecting SHALL remove the matching reference regardless of its syntax. Every edit SHALL preserve the representation, order, and supported and unknown attributes of all unaffected references, including long-form `target`, `uid`, `gid`, and `mode` values. An applied relationship intent SHALL be one atomic history transition, while duplicate, missing, rejected, or unchanged intents SHALL create no transition.

#### Scenario: Connect a defined secret
- **WHEN** a service is connected to a defined secret that it does not already reference
- **THEN** the service gains one short-form secret reference and generated YAML reflects the connection

#### Scenario: Connect a defined config
- **WHEN** a service is connected to a defined config that it does not already reference
- **THEN** the service gains one short-form config reference and generated YAML reflects the connection

#### Scenario: Preserve an existing long-form connection
- **WHEN** a connect intent targets a resource already referenced through long syntax
- **THEN** the existing reference and all of its attributes remain unchanged
- **AND** no duplicate reference or history transition is created

#### Scenario: Disconnect a long-form reference
- **WHEN** a disconnect intent targets a secret or config represented with long syntax
- **THEN** the complete matching reference is removed and unrelated references remain unchanged

#### Scenario: Preserve sibling reference details
- **WHEN** a secret or config connection is added or removed from a service with other long-form references
- **THEN** every unaffected reference retains its syntax, order, and attributes

#### Scenario: Reject an undefined resource connection
- **WHEN** a relationship intent connects a service to a secret or config that is not defined in the current project
- **THEN** the intent is rejected and the workspace and editing history remain unchanged

#### Scenario: Undo and redo a relationship edit
- **WHEN** a user applies a secret or config relationship edit and invokes undo and redo
- **THEN** undo restores the complete prior reference list in one step and redo reapplies the complete edit in one step
