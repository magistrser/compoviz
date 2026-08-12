## Why

Builder cleanup spreads peer services across unnecessary vertical levels and draws a complete network path for every connected service. Large Compose projects therefore become taller and visually noisy even when their topology could be expressed with compact aligned rows and a shared network trunk.

## What Changes

- Make `Clean layout` place services with equivalent relationship ranks on shared horizontal rows using deterministic spacing.
- Bundle fan-out connections from a network into one common trunk with individual branches to connected services when the bundled route is clearer.
- Keep every network relationship individually selectable and obstacle-safe after bundling.
- Apply the clean layout automatically the first time a newly loaded Compose project without saved positions is shown in Build view.
- Add regression coverage using a representative multi-service, shared-network topology.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `architecture-visualization`: Strengthen builder cleanup and orthogonal routing requirements for aligned peer rows and bundled shared-network connections.

## Impact

- Builder layout and routing utilities under `src/utils/` and `src/components/edges/`.
- Build-view initial-layout lifecycle and edge routing context in `src/components/VisualBuilder.tsx`.
- Adjacent Vitest coverage for the supplied topology's relevant relationship graph.
- No Compose model, persistence format, or external API changes.
