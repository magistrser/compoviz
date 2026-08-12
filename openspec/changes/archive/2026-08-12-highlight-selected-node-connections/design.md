## Context

`VisualBuilder` stores the resource selected for configuration and separately keeps React Flow edges in controlled state. Custom dependency, network, and volume edge renderers already map an edge's `selected` flag to the correct relationship-specific emphasis, so the missing behavior is associating the selected resource with its incident edges.

## Goals / Non-Goals

**Goals:**

- Reuse the existing selected-edge presentation for every relationship attached to the selected resource.
- Keep the emphasis synchronized with node selection without mutating Compose state or persistent canvas state.
- Preserve direct edge selection and every relationship's routing and semantic styling.

**Non-Goals:**

- Changing relationship colors, dash patterns, labels, animation, or routes.
- Adding multi-node selection behavior or persisting selection.
- Changing how the configuration panel chooses its resource.

## Decisions

- Derive the displayed `selected` flag while building `routedEdges`: an edge is emphasized when it was selected directly or when either endpoint matches the selected resource id. This reuses all custom edge renderers and keeps selection presentation in one established path.
- Do not write the derived flag back through `setEdges`. Keeping node-connected emphasis transient avoids controlled-state synchronization loops and means changing or clearing the selected resource recomputes the result naturally.
- Cover the behavior through the `VisualBuilder` interaction seam by selecting a rendered node and observing the edge data passed to the canvas. This verifies the user-visible contract without testing a private helper.

## Risks / Trade-offs

- [Risk] Mapping edges adds a small comparison for every rendered edge whenever selection changes. → The builder already maps every edge to attach routing data, so the endpoint check is folded into that existing linear pass.
- [Risk] Overwriting direct edge selection could regress keyboard editing. → Combine direct and node-derived selection with logical OR so independent edge selection remains effective.
