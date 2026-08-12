## Why

The builder currently emphasizes a relationship only when the edge itself is selected, so users cannot quickly trace every relationship attached to a selected resource block. Highlighting incident lines together with the selected block makes dense Compose architectures easier to inspect.

## What Changes

- Emphasize every builder relationship whose source or target is the selected resource node.
- Preserve existing direct edge-selection emphasis and relationship-specific colors, patterns, labels, routing, and animation.
- Recompute connected-line emphasis when node selection changes or is cleared, without emphasizing unrelated relationships.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `architecture-visualization`: Extend builder selection behavior so selecting a resource block also emphasizes every relationship incident to that block.

## Impact

- `src/components/VisualBuilder.tsx` edge presentation derived for the React Flow canvas.
- `src/components/VisualBuilder.test.tsx` builder interaction regression coverage.
- No API, dependency, persistence, or Compose model changes.
