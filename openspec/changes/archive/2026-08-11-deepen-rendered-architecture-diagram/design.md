## Context

Both architecture views render caller-generated DOT through the same worker adapter but independently own DOM insertion and navigation. The primary view also exposes export through a MainLayout-wide DOM query. This makes rendering safety and interaction behavior shallow and inconsistent.

## Goals / Non-Goals

**Goals:**

- Make one component responsible for the complete rendered-SVG lifecycle.
- Sanitize before DOM insertion and sanitize the serialized SVG again before export.
- Retain the worker client's timeout and one fatal retry while preventing stale results from committing.
- Use identical navigation and export controls in primary and comparison views.
- Keep optional caller overlays and opaque node activation independent of Compose domain types.

**Non-Goals:**

- Move `generateGraphviz` or `generateMultiProjectGraphviz` into the component.
- Change DOT structure or comparison findings.
- Change the Graphviz worker protocol, timeout duration, or fatal-error classification.
- Redesign the visual style of diagram overlays.

## Decisions

### Component interface

`RenderedArchitectureDiagram` receives DOT, `ariaLabel`, optional `overlay`, and optional `onNodeActivate(nodeId)`. It renders overlay content without interpreting it. MainLayout translates opaque node IDs into service selection.

### Safe render lifecycle

Each DOT render receives a monotonically increasing generation. Only the current generation may sanitize, insert SVG, attach node handlers, or update loading/error state. Cleanup removes listeners and invalidates the generation. The Graphviz client remains the internal worker/fatal-retry adapter and is reset when the final diagram instance unmounts.

### Navigation

All wheel and button zoom operations clamp to `0.3–3`. Reset sets scale `1` and position `{x: 0, y: 0}` with a centered transform origin. Fit measures the current SVG and viewport, clamps the result to the same bounds, and recenters.

### Export

The component serializes its current SVG, passes the serialized form through the sanitizer, and downloads only the resulting safe SVG as `docker-compose-diagram.svg`. No parent queries global DOM.

## Risks / Trade-offs

- Resetting a shared Graphviz client while multiple views are mounted could disrupt an active render. Only one routed view is currently mounted at once; instance-count cleanup avoids resets while another instance remains.
- SVG size measurement differs between browsers. Fit falls back from `getBBox()` to viewBox and dimensions, then clamps conservatively.
- Opaque node activation intentionally does not expose DOM nodes or Compose resource types through the module interface.
