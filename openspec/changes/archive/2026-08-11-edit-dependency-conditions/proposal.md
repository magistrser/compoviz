## Why

Drawing a dependency in the visual builder always creates the default `service_started` condition, even though the graph already displays all three supported Compose dependency conditions. Users must be able to choose the intended condition while creating a dependency and correct it later without editing YAML by hand.

## What Changes

- Ask the user to choose Started, Healthy, or Completed successfully after drawing a service dependency and before committing it.
- Let the user select an existing dependency edge and change its condition through the same in-application control.
- Treat cancellation as a non-edit so it creates neither a relationship nor a history entry.
- Preserve dependency conditions in Compose state and generated YAML, using valid short or long `depends_on` syntax as appropriate.
- Keep dependency colors, condition labels in the legend, and condition choices driven by the same supported-condition model.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `architecture-visualization`: Add condition selection when a dependency is drawn and condition editing for an existing dependency edge.
- `compose-workspace`: Preserve the selected dependency condition as an atomic, undoable Compose relationship edit.

## Impact

The change affects the React Flow connection and edge-selection handlers, accessible popup controls, the typed compose-editing command and transition, dependency serialization, and focused UI/domain tests. No new runtime dependency or data migration is required.
