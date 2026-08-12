## Context

The Build view uses Dagre to assign both axes of every resource position. Dagre produces suitable left-to-right ranks, but its crossing minimization leaves nodes at many slightly different vertical offsets and stacks disconnected components below the main graph. Each network relationship is then routed independently, so a network shared by many services produces repeated long paths instead of a readable bus.

The existing constraints remain: cleanup must be deterministic and grid-aligned, relationships must leave right-side outputs and enter left-side inputs, paths must avoid unrelated nodes, and each Compose relationship must remain an independent React Flow edge.

## Goals / Non-Goals

**Goals:**

- Preserve Dagre's deterministic left-to-right ranks while compacting compatible nodes into aligned horizontal lanes.
- Reuse one visible network trunk for two or more services when a safe common route exists.
- Apply the same deterministic cleanup automatically on the first Build presentation of a newly loaded project without saved positions.
- Preserve obstacle avoidance, per-edge selection, semantic styling, and deterministic output.
- Improve the supplied shared-network topology without changing Compose data or stored position semantics.

**Non-Goals:**

- Replace Dagre or add a new layout dependency.
- Bundle dependency or volume relationships.
- Add editable junction resources to the Compose model.
- Persist routing junctions or change exported Compose YAML.

## Decisions

### Preserve horizontal ranks and compact only the vertical axis

Cleanup will continue to feed the complete relationship graph to Dagre. Dagre's node-center X coordinates define ordered columns and therefore retain its cycle breaking and left-to-right rank guarantees. A deterministic lane pass will replace only the Y coordinates:

- group nodes with the same Dagre center X into a column;
- process columns from left to right;
- prioritize nodes with the longest path into later columns, then stable resource id;
- place each node in the free lane closest to its already placed incoming neighbors;
- align node centers on fixed, grid-snapped lanes sized for the tallest builder node.

This makes dependency chains naturally continue across one row and lets disconnected nodes fill unused lanes in earlier columns. Keeping Dagre's X coordinates avoids reimplementing ranking and cycle handling. The alternative of changing to a top-to-bottom graph would conflict with directional terminal requirements, while using Dagre's raw Y output leaves the reported problem intact.

### Render network fan-out as overlapping edge paths on a shared bus

`VisualBuilder` will identify network edges with the same source and provide their sorted target ids in routing context. For groups of at least two edges whose targets are all to the right of the network, the orthogonal router will try a top-side bus outside the current obstacle bounds. Every member path will share the segment from the network to that bus, follow the same trunk, then turn through a target-specific branch and enter the service's existing left-side network input.

The paths remain separate React Flow edges. Their coincident segments visually form one trunk, while their distinct final branches remain selectable and preserve deletion behavior. This avoids introducing synthetic junction nodes or relationships that could leak into editing and persistence.

### Fall back when a bus is not safe

The bundled candidate will be checked with the same expanded obstacle rectangles as other orthogonal paths. If every target is not to the right or any candidate segment enters an unrelated block, that edge will use the existing individual router. This makes manual dragging safe and keeps bundling an opportunistic presentation improvement.

### Auto-clean only an unpositioned loaded project

`VisualBuilder` will treat an accepted workspace source generation as eligible for automatic cleanup only when it has visible nodes and none of its resources has a valid stored `_position`. The automatic path will reuse the same atomic `position-resources` edit, local node update, viewport fit, and deterministic layout as the explicit action.

The source generation will be guarded before committing so React Strict Mode and state synchronization cannot apply the same automatic transition twice. Returning to Build remounts the component, but the persisted positions make that generation ineligible. A project with any stored position is treated as user-arranged and is preserved. An empty hand-built workspace has no accepted source descriptor, so adding its first resource does not unexpectedly trigger cleanup.

## Risks / Trade-offs

- [A shared trunk consists of coincident SVG paths, so clicking the trunk selects the topmost member] → Keep distinct branches exposed for individual selection and preserve all relationship ids and behaviors.
- [A top-side bus slightly expands fitted bounds] → Reserve only one clearance lane above the highest block and use it only for fan-out groups.
- [Vertical compaction can increase crossings in unusual graphs] → Prefer incoming-neighbor lanes and retain the obstacle-aware edge router; deterministic ordering keeps repeated cleanup stable.
- [Measured node heights can differ from fixed cleanup dimensions] → Continue using the existing dimension fallbacks during cleanup and live measured rectangles during routing.
- [Automatic cleanup could overwrite a partially arranged project or run twice in development] → Require an accepted source with no stored resource positions and guard each source generation before committing.

## Migration Plan

No data migration is required. The change affects positions produced by the next `Clean layout` invocation and transient edge paths. Reverting the implementation restores the previous cleanup and routing behavior without changing saved Compose content.

## Open Questions

None.
