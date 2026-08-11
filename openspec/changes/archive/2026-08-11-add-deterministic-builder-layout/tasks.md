## 1. Deterministic Layout Core

- [x] 1.1 Add `@dagrejs/dagre` to the locked client dependencies and define centralized builder node dimensions plus fixed left-to-right spacing configuration.
- [x] 1.2 Add `builderLayout` unit tests for stable output under reordered inputs, identical repeated runs, 15-pixel grid alignment, non-overlapping fixed-size boxes, cycles, disconnected nodes, and empty input.
- [x] 1.3 Implement the pure `builderLayout` adapter with sorted node/edge insertion, top-left coordinate conversion, snap-grid quantization, and immutable outputs.

## 2. Atomic Position Persistence

- [x] 2.1 Add compose-editing transition/provider tests proving batch positions validate all targets, update all resource kinds together, create one undo/redo transition, reject stale input atomically, and remain unchanged on an identical repeat.
- [x] 2.2 Add the batch positioning `ComposeEdit` variant and pure transition implementation while retaining the existing single-node drag intent and `_position` format.

## 3. Orthogonal Relationship Rendering

- [x] 3.1 Add flow-converter and edge regression tests for explicit relationship handles, horizontal/vertical smooth-step paths with rounded corners, recalculation after endpoint movement, and retained labels/styles/selection/animation semantics.
- [x] 3.2 Add the shared rounded orthogonal path helper and migrate dependency, network, and volume edge components away from Bézier paths.
- [x] 3.3 Update service/resource handles and `stateToFlow` edge metadata so dependency and resource wiring follows the left-to-right layout without ambiguous handle selection.

## 4. Build View Cleanup Action

- [x] 4.1 Extend `VisualBuilder` tests for an accessible `Clean layout` action, its disabled empty state, deterministic batch-position commits, identical-repeat no-op behavior, and viewport fitting.
- [x] 4.2 Implement the top-right cleanup action by laying out the current derived graph, committing one batch edit, updating controlled nodes, and fitting the viewport after positions render.
- [x] 4.3 Adjust builder action, handle, and edge styling only as needed for clear focus states and readable rounded orthogonal wires at desktop and narrow widths.

## 5. Validation

- [x] 5.1 Run the focused raw Vitest suites for builder layout, flow conversion, custom edges, compose editing, and `VisualBuilder`.
- [x] 5.2 Run raw `yarn check` and `yarn build`, confirming the Build view remains lazy-loaded and the production bundle succeeds with the new layout dependency.
- [x] 5.3 Run `openspec validate add-deterministic-builder-layout --strict` and resolve every validation error.
- [x] 5.4 Using the `browser-use` harness, import `/Users/franz/workspace/street-falcon-server/docker-compose.yml`, open Build, clean twice, verify identical second-run positions and one-step undo/redo, inspect orthogonal rounded edges and viewport fit at desktop and narrow widths, capture screenshots, and confirm no console errors.

## 6. Relationship Terminal Fan-out

- [x] 6.1 Extend flow-converter regression coverage so dependency, network, and named-volume edges use dedicated relationship-specific source and target terminals.
- [x] 6.2 Replace the shared service resource handle with adjacent dependency, network, and volume terminals in a stable vertical order, style each typed source/target terminal with its semantic wire color, and assign stable separate routing-lane offsets by relationship type.
- [x] 6.3 Run focused and full validation, then use the `browser-use` harness to prove differently colored wires leave a multi-relationship service at distinct SVG endpoints with no console errors.

## 7. Obstacle-Aware Relationship Routing

- [x] 7.1 Add pure regression tests proving an orthogonal route does not cross unrelated block rectangles, remains deterministic for reordered obstacle input, recalculates after a block moves, and preserves separate relationship lanes.
- [x] 7.2 Derive live routing rectangles from rendered builder nodes and replace smooth-step routing with a deterministic Manhattan router whose rounded path stays outside unrelated blocks.
- [x] 7.3 Run focused and full validation, then use the `browser-use` harness with the supplied dense Compose project to verify no rendered relationship crosses a resource block at desktop and narrow widths.
