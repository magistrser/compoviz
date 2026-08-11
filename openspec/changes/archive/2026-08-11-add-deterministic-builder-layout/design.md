## Context

The Build view converts the canonical workspace AST into React Flow nodes and custom edges. `stateToFlow` currently assigns unsaved nodes to fixed type-specific grids, while saved `_position` metadata preserves manual dragging. All three custom relationship edges call React Flow's Bézier path helper, so the canvas remains visually curved even though `defaultEdgeOptions` names `smoothstep`. Node moves are committed one at a time through the compose-editing boundary and therefore cannot represent a whole-canvas cleanup as one undoable operation.

The supplied Street Falcon Compose project contains ten services, one shared network, dependency chains, and bind mounts. It is the required dense browser-smoke input, but its content remains external and is not copied into the repository.

## Goals / Non-Goals

**Goals:**

- Produce a readable left-to-right, relationship-aware placement for every builder resource.
- Make layout output deterministic, grid-aligned, and idempotent for unchanged node and edge input.
- Draw every supported relationship with horizontal/vertical segments and small rounded corners.
- Fan different relationship types out through dedicated adjacent terminals in a stable LabVIEW-style order.
- Route wires around every unrelated resource block with fixed clearance, recalculating from current block rectangles after manual movement.
- Preserve edge semantics, manual dragging, persisted `_position` compatibility, and atomic undo/redo.
- Keep graph calculation independently testable outside React.

**Non-Goals:**

- Re-layout the rendered Graphviz View tab or comparison diagrams.
- Continuously move nodes after every edit or prevent users from manually overriding the generated positions.
- Change Compose relationship semantics, node contents, resource creation defaults, SVG filenames, or persisted storage/YAML schemas beyond existing `_position` values.
- Guarantee globally optimal wire-to-wire crossing minimization for every possible graph.

## Decisions

### Use a pure deterministic layout adapter around Dagre

Add a focused `builderLayout` utility that accepts React Flow-compatible nodes and edges and returns new node coordinates without mutating its inputs. Use `@dagrejs/dagre` with fixed node dimensions, left-to-right rank direction, fixed rank/node/edge spacing, and margins. Insert nodes and edges in stable ID order, translate Dagre's center coordinates to React Flow's top-left coordinates, and quantize the result to the existing 15-pixel snap grid.

The helper ignores current `_position` values when explicitly cleaning so the output depends only on stable resource identities, relationships, node types, and fixed configuration. Disconnected nodes participate in the same sorted graph. Empty input returns an empty result.

Dagre is preferred over expanding the current hand-written grids because it handles dependency depth, cycles, disconnected components, and resource fan-out behind a small pure seam. ELK was considered for combined placement and edge routing, but persisting ELK bend points would become stale after manual node movement and would add a larger asynchronous integration. A custom topological layout was rejected because cycle breaking and component packing would duplicate graph-layout machinery.

### Persist the generated placement through one batch editing intent

Extend `ComposeEdit` with a batch positioning variant containing resource kind, resource name, and position entries. Its pure transition validates that every referenced resource exists before changing anything, applies all `_position` values to one next `ComposeState`, and delegates equality detection to the existing `finish` behavior. `commit` therefore creates one history entry for a changed layout and none for an identical second run. Undo and redo restore the complete before/after placement in one step.

Keeping this operation in compose editing is preferred over updating only React Flow state because positions already belong to the persisted raw Compose state. Dispatching one existing position edit per node was rejected because it would make one cleanup require many undo operations and expose partially applied layouts.

### Route custom edges with a shared deterministic obstacle-aware helper

Replace the Bézier helper in dependency, network, and volume edge renderers with one shared pure Manhattan router. Build a deterministic rectilinear visibility grid from the live React Flow node rectangles, expand every unrelated rectangle by a fixed relationship-specific clearance, and choose a shortest available route with a stable bend penalty and stable tie-breaking. Convert the resulting horizontal/vertical points to an SVG path with a fixed corner radius. Continue to use each edge component's current stroke color, width, dash pattern, selection class, label content, and animation setting.

Set explicit, relationship-specific source and target handles in `stateToFlow` and align them with the left-to-right layout. Service outputs use a fixed top-to-bottom order of dependency, network, then volume terminals; service dependency inputs and network/volume resource inputs use their matching typed terminal. Give each terminal the corresponding wire color. Assign the three relationship types stable, grid-spaced lead distances and obstacle clearances so backward, fan-out, and detour routes do not collapse onto one shared lane. The controlled canvas derives routing rectangles from current node positions and measured dimensions, so paths recalculate while nodes are dragged. Source and target blocks remain valid endpoints, while every other block is a hard routing obstacle.

The visibility-grid adapter is preferred over persisted bend points because it responds immediately to manual moves and derives the same path from the same endpoint and obstacle geometry. A fixed outer routing boundary supplies a deterministic path around dense arrangements when no interior corridor is available. Rounded corners remain inside the clearance envelope and therefore do not enter the underlying resource rectangle.

### Keep cleanup user-invoked and fit the result

Add an icon button to the existing top-right builder actions with accessible name and tooltip `Clean layout`. Disable it when the canvas has no nodes. Activation lays out the current derived graph, submits one batch positioning edit, updates the controlled canvas, and fits the resulting bounds after React Flow receives the positions. Repeating the action may fit the viewport again, but it SHALL not change coordinates or history when the project is unchanged.

Existing saved and manually dragged positions remain authoritative during ordinary rendering; only the explicit action replaces them. This avoids surprising movement while a user is editing.

### Verify the pure seams before browser appearance

Unit tests cover stable output under reordered inputs, non-overlapping fixed-size boxes, 15-pixel alignment, empty and disconnected graphs, and equality across repeated runs. Compose-editing tests cover all-or-nothing validation, one transition, no-op repetition, and undo/redo. Edge tests assert obstacle-free orthogonal segments, deterministic rerouting after endpoint movement, separate relationship lanes, and retained labels/styles. `VisualBuilder` tests assert the accessible action, batch commit, disabled empty state, live routing context, and fit behavior.

Final UI verification imports `/Users/franz/workspace/street-falcon-server/docker-compose.yml`, opens Build, activates `Clean layout` twice, and checks node placement, orthogonal rounded paths, identical second-run positions, viewport fit, and browser console output at desktop and a narrow viewport.

## Risks / Trade-offs

- **[Risk] Dagre placement can still contain crossings in highly connected or cyclic graphs.** → Use stable ordering and generous fixed spacing, retain pan/zoom, and keep the layout utility isolated so configuration or the adapter can be replaced later.
- **[Risk] Declared layout dimensions can diverge from rendered node dimensions.** → Centralize conservative dimensions per node type and add browser checks against overlap using the representative dense project.
- **[Risk] Routing every edge against live node rectangles can add work during dragging.** → Keep the router pure and synchronous, share one memoized obstacle list across rendered edges, use a bounded rectilinear visibility grid, and verify the dense representative project interactively.
- **[Risk] A rounded bend at an obstacle corner could clip the block.** → Expand unrelated rectangles by more than the fixed corner radius before routing and test every unrounded segment against the original block rectangle.
- **[Risk] A stale UI graph could reference a resource removed during cleanup.** → Validate every batch target before mutation and reject the entire transition on any missing resource.
- **[Risk] A new dependency increases the client bundle.** → Use the focused Dagre package only in the lazy-loaded Build chunk and confirm production bundle output during final validation.

## Migration Plan

1. Add the layout dependency, pure helper, dimensions/configuration, and unit tests.
2. Add batch positioning to compose editing with transition and history tests.
3. Update flow handles and custom edge path generation, then wire the Clean layout control and viewport fit.
4. Add deterministic obstacle-aware routing from live block rectangles and regression-test segment/rectangle separation.
5. Run focused tests, raw `yarn check`, `yarn build`, strict OpenSpec validation, and the required browser smoke test with screenshots.

Rollback removes the button and layout dependency, restores the Bézier helpers and prior handles, and removes the batch intent. Existing `_position` values remain valid, so no data migration is required in either direction.

## Open Questions

None.
