## Why

The builder's dependency input and output terminals use different vertical offsets, so the matching endpoints appear visually misaligned on service nodes. Aligning them makes the connection direction easier to read while preserving the dedicated lanes for network and volume relationships.

## What Changes

- Place the dependency output terminal at the same vertical offset as the dependency input terminal.
- Halve the vertical spacing between the three service input terminals while keeping the group centered.
- Ensure every builder relationship line starts and ends at the rendered center of its corresponding terminal dot.
- Add regression coverage for the matching dependency terminal offsets.
- Preserve the existing left/right terminal sides and distinct network and volume input offsets.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `architecture-visualization`: Require the builder's matching dependency input and output terminals on service nodes to share a horizontal alignment.

## Impact

- Affects builder-node entrance styling, service-node handle geometry, and focused geometry verification.
- No API, dependency, or data-model changes.
