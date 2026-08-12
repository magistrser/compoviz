## Why

Creating builder relationships currently depends on holding a pointer button while dragging between small terminals, which is awkward and error-prone. A two-click interaction gives users time to identify the matching terminal and works consistently whether they begin at an input or output.

## What Changes

- Replace drag-to-connect in the Build view with a click-only connection gesture.
- Enter a visible connection-selection mode after the first terminal click and complete the relationship after clicking a compatible second terminal.
- Allow the first click to be either endpoint while retaining the builder's output-to-input relationship direction.
- Reject incompatible endpoint and relationship-type combinations without modifying the Compose project.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `architecture-visualization`: Change builder relationship creation from press-and-drag to a visible, directional two-click interaction between compatible terminals.

## Impact

- Affects the Build view's React Flow interaction configuration and connection validation in `src/components/VisualBuilder.tsx`.
- Affects builder terminal connection-mode styling in `src/styles/global.scss`.
- Adds regression coverage to the existing builder interaction test seam.
- Does not change Compose data, saved positions, relationship direction, public APIs, or dependencies.
