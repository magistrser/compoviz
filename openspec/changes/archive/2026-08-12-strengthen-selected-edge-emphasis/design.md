## Context

Each custom builder edge renderer owns its semantic stroke color, normal width, and optional dash pattern. Selection is already represented by the renderer's `selected` prop, but the current width changes—from `2` to `3` pixels for dependencies and `1.5` to `2.5` pixels for networks and volumes—are too subtle on the dark canvas.

## Goals / Non-Goals

**Goals:**

- Make selected relationships immediately distinguishable from nearby unselected relationships.
- Apply the same strength of emphasis to dependency, network, and volume edges.
- Retain semantic colors, dashes, labels, routing, and animation.

**Non-Goals:**

- Changing how node-connected or direct edge selection is derived.
- Dimming unrelated relationships or changing their normal appearance.
- Changing relationship routing or interaction hit areas.

## Decisions

- Render every selected edge with a `4px` visible stroke. This is at least twice the normal dependency width and more than twice the normal network and volume width, producing an obvious distinction without obscuring nearby nodes and handles. A larger width was considered but would consume too much clearance on tightly routed parallel lanes.
- Add a compact drop shadow using the edge's own semantic color. The glow adds separation where lines cross or pass over the grid while preserving dependency-condition, network, and volume identity. A global fixed-color outline was rejected because it would weaken the existing color language.
- Keep the emphasis in the custom edge renderers' inline SVG styles. Dependency color is data-dependent, and colocating its glow with its stroke avoids duplicating the condition palette in SCSS.
- Verify the contract through the rendered `BaseEdge` SVG seam for all three relationship types. This observes the visual output while remaining independent of how selection is derived in `VisualBuilder`.

## Risks / Trade-offs

- [Risk] Glow can blur very short dash gaps. → Keep the shadow radius compact and retain the existing `strokeDasharray` values unchanged.
- [Risk] Inline filter strings repeat across renderers. → The renderer-specific semantic colors make the small duplication explicit; extract a shared visual helper only if additional edge types are introduced.
