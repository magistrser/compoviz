## 1. Shared Render Lifecycle

- [x] 1.1 Add failing component tests for safe insertion, malformed SVG, loading/error state, stale results, and listener cleanup
- [x] 1.2 Add `RenderedArchitectureDiagram` with DOT, optional overlay, accessible label, and opaque node activation
- [x] 1.3 Internalize Graphviz rendering, timeout/fatal retry adapter usage, stale-result protection, sanitization, and node listener cleanup

## 2. Shared Navigation and Export

- [x] 2.1 Add failing tests for button/wheel zoom bounds `0.3–3`, fit, and centered scale-1 reset
- [x] 2.2 Implement the common controls and pan lifecycle
- [x] 2.3 Add failing tests proving display and export sanitize SVG and use `docker-compose-diagram.svg`
- [x] 2.4 Implement component-owned safe SVG export

## 3. Caller Migration and Cleanup

- [x] 3.1 Migrate MainLayout to `RenderedArchitectureDiagram`, retaining its legend, add-resource overlay, and service activation
- [x] 3.2 Migrate CompareView to caller-generated DOT plus the shared renderer, retaining its analysis overlay
- [x] 3.3 Delete `GraphvizDiagram`, comparison `DiagramView`, and MainLayout's global DOM export path

## 4. Validation

- [x] 4.1 Run focused diagram, MainLayout, CompareView, renderer, sanitization, and DOT tests
- [x] 4.2 Strictly validate this change and dependent active changes, run `yarn check` and `yarn build`
- [x] 4.3 Smoke-test workspace and comparison diagrams in the browser and capture updated screenshots
