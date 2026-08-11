## Why

Dependency-condition labels sit directly on builder wires, adding visual noise and making dense Compose graphs harder to scan. The builder can preserve the same semantic detail more cleanly by encoding each dependency condition with a related color and explaining those colors in the existing connection legend.

## What Changes

- Remove inline text labels from `depends_on` relationship wires.
- Give `service_started`, `service_healthy`, and `service_completed_successfully` dependency wires distinct, coordinated colors.
- Redesign the Connection Types legend so dependency conditions are grouped under Depends On with clear human-readable labels, while Network and Volume remain easy to distinguish.
- Preserve existing orthogonal routing, animation, and selected-edge emphasis.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `architecture-visualization`: Change how builder dependency conditions are visually distinguished and documented in the connection legend.

## Impact

The change affects the custom dependency edge renderer, the Build view connection legend, shared builder styling, and their colocated component tests. It does not change Compose parsing, saved project data, graph topology, public APIs, or dependencies.
