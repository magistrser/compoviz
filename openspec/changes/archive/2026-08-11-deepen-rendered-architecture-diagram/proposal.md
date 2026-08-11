# Change: Deepen Rendered Architecture Diagram

## Why

The primary and comparison diagrams duplicate Graphviz rendering, SVG insertion, navigation, and cleanup while exposing rendering details to their callers. Their controls and reset behavior have already drifted, and only the primary view provides export.

## What Changes

- Add one `RenderedArchitectureDiagram` interface that accepts DOT, an optional domain overlay, an accessible label, and optional opaque node activation.
- Internalize Graphviz rendering, retry/timeout behavior, stale-result protection, sanitization, loading/error UI, listeners, pan/zoom/fit/reset, and SVG download.
- Give both views the same `0.3–3` zoom bounds, fit control, centered scale-1 reset, and sanitized `docker-compose-diagram.svg` export.
- Remove `GraphvizDiagram`, the comparison renderer, and MainLayout's document-query export path.

## Impact

- Affected specs: `architecture-visualization`, `project-comparison`
- Affected code: diagram feature, MainLayout, CompareView, renderer tests
- Preserved: caller-owned DOT generation, worker mechanics and fatal retry, sanitization boundary, node selection semantics, right-click resource creation in the main view
