## Why

The Build canvas uses fixed grid placement and Bézier relationship paths, so realistic Compose projects quickly become crowded and difficult to trace. Users need a one-click, repeatable cleanup that produces a readable LabVIEW-style diagram without manually arranging every resource.

## What Changes

- Add a **Clean layout** action to the Build view that arranges all visible Compose resource nodes from their relationships and then fits the result in the viewport.
- Make automatic placement deterministic and idempotent: the same unchanged project produces the same node coordinates every time, and repeating the action does not create another editing-history transition.
- Persist the complete automatic placement as one atomic Compose edit so it participates in undo/redo while preserving manual node dragging.
- Render dependency, network, and volume relationships as straight horizontal/vertical segments with rounded right-angle corners while preserving their existing semantic colors, dash patterns, labels, selection behavior, and animation where applicable.
- Fan differently colored relationship types out through dedicated adjacent node terminals and stable separate routing lanes so their straight runs do not overlap.
- Route every relationship around unrelated resource blocks with deterministic clearance so wires never pass through container interiors, including after a connected block is dragged.
- Add pure layout/transition regression coverage and UI coverage, plus a browser smoke test using `/Users/franz/workspace/street-falcon-server/docker-compose.yml` as the representative dense project.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `architecture-visualization`: Define deterministic Build-canvas cleanup and orthogonal rounded relationship routing.
- `compose-workspace`: Require automatic multi-resource positioning to commit atomically and remain a no-op when the generated positions already match.

## Impact

- Build-view UI and React Flow integration in `src/components/VisualBuilder.tsx`.
- Compose-to-flow conversion, a new pure deterministic layout seam, and adjacent tests under `src/utils/`.
- Custom relationship edge renderers under `src/components/edges/` and related styling.
- Compose editing intent types and transition tests under `src/features/compose-editing/`.
- The layout implementation may add one focused client-side graph-layout dependency; browser-only operation, Compose YAML semantics, saved `_position` compatibility, and existing export filenames remain unchanged.
