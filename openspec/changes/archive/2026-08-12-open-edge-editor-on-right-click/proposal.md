## Why

Opening a dependency editor by double-click is easy to trigger accidentally and is less discoverable as an edge-specific action. A right-click matches the requested direct manipulation and gives the edit action a dedicated mouse gesture.

## What Changes

- Open the existing dependency-condition editor when the user right-clicks a dependency edge.
- Stop opening the editor when the user double-clicks a dependency edge.
- Preserve keyboard access through Enter on a selected dependency edge and preserve ordinary selection and deletion behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `architecture-visualization`: Change the mouse gesture for opening an existing dependency condition from double-click to right-click.

## Impact

- Builder edge interaction wiring in `src/components/VisualBuilder.tsx`.
- Existing `VisualBuilder` interaction regression tests.
- No API, persistence, dependency, or Compose-model changes.
