## Why

Secrets and configs already appear as first-class resources in the Build view, but unlike networks and named volumes they cannot be connected to the services that consume them and their existing service references are not rendered as edges. This breaks the canvas's visual editing model and forces users to discover a separate configuration-panel workflow for relationships that look connectable.

## What Changes

- Render service-to-secret and service-to-config references as distinct relationship edges in the Build view.
- Add dedicated secret and config terminals that participate in the existing accessible two-click connection interaction.
- Let users create and remove secret/config service references as atomic, undoable relationship edits.
- Preserve long-form Compose reference attributes such as `target`, `uid`, `gid`, and `mode` when unrelated relationships change.
- Extend deterministic layout, orthogonal routing, selection highlighting, and the connection legend to cover the two new relationship types.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `architecture-visualization`: Build-canvas rendering, terminals, connection interaction, routing, layout, selection highlighting, and legend behavior will include secret and config relationships.
- `compose-workspace`: Relationship editing will create and remove service secret/config references atomically while retaining the supported syntax and attributes of unaffected references.

## Impact

- Build-view flow conversion, resource nodes, connection classification, edge rendering, deterministic layout, routing lanes, legend content, styles, and interaction tests.
- Compose editing intents/transitions and tests for secret/config relationship creation, removal, preservation, serialization, undo, and redo.
- Compose AST/service-reference reads used to derive Build edges.
- No new runtime dependencies, external APIs, or persistence formats are required.
