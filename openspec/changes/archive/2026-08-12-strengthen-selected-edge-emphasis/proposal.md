## Why

Selected builder relationships currently gain only a small stroke-width increase, so connected lines remain difficult to distinguish from unhighlighted lines in a dense diagram. The selected state needs stronger visual contrast without losing the colors and patterns that communicate relationship meaning.

## What Changes

- Render selected dependency, network, and volume relationships with a substantially thicker stroke.
- Add a color-matched glow to selected relationships so the emphasis remains apparent across the dark canvas and intersecting routes.
- Preserve each relationship's condition color, dash pattern, label, route, and animation when highlighted.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `architecture-visualization`: Strengthen the required selection emphasis for highlighted builder relationships.

## Impact

- `src/components/edges/DependsOnEdge.tsx`, `NetworkEdge.tsx`, and `VolumeEdge.tsx` selected-state presentation.
- `src/components/edges/BuilderEdges.test.tsx` renderer regression coverage.
- No API, dependency, persistence, or Compose model changes.
