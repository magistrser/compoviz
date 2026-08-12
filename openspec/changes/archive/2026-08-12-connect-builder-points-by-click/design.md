## Context

The builder uses typed React Flow handles and commits all completed relationships through `VisualBuilder`'s existing `onConnect` callback. React Flow enables click connection by default, but it also retains pointer-drag connection initiation and clears its internal click selection after an incompatible second terminal. The requested interaction needs click-only initiation, visible selection state, input-first or output-first ordering, and compatibility rules based on the builder's relationship-specific terminals.

The existing public test seam renders `VisualBuilder` with React Flow mocked as an external canvas boundary and observes the resulting Compose workspace state.

## Goals / Non-Goals

**Goals:**

- Make supported builder relationship terminals activate and complete connections exclusively through clicks or their keyboard equivalent.
- Let either the input or output be selected first while preserving canonical output-to-input `Connection` objects.
- Keep selection active after an incompatible terminal click and expose clear active/compatible visual states.
- Reuse the existing dependency-condition popup and atomic Compose editing transitions after a connection is completed.

**Non-Goals:**

- Add secret or config relationship editing.
- Change dependency, network, or volume direction or persistence formats.
- Change edge reconnection, edge editing, node selection, or node dragging.

## Decisions

### Own the two-click state at the builder boundary

Add a small builder-terminal context and a reusable relationship handle. `VisualBuilder` owns the currently selected terminal, canonicalizes a terminal pair, validates it, and passes valid pairs through the existing `onConnect` callback. Relationship node components use the shared handle so the gesture and state classes cannot drift between terminal types.

Relying only on React Flow's `connectOnClick` was rejected because it does not replace pointer dragging and it ends click-selection after any second terminal, including an incompatible one. Reimplementing relationship commits in each node was rejected because it would duplicate Compose semantics across presentation components.

### Disable native connection initiation on every displayed terminal

The reusable relationship handle disables React Flow's native connect start/end behavior while retaining pointer events for its explicit click and keyboard handlers. React Flow's canvas-level click connection is also disabled. Existing hidden secret/config handles become non-connectable because those relationships are outside the builder's supported editing contract.

### Validate exact terminal pairs before committing

Canonicalization orders endpoints by handle type so input-first and output-first gestures produce the same `Connection`. A valid pair must also match one exact relationship terminal pair and node-type direction: service dependency output to service dependency input, network output to service network input, or volume output to service volume input. Invalid clicks leave selection mode active and make no workspace change.

### Expose selection mode visually and accessibly

The selected terminal and compatible candidates receive distinct CSS classes. While active, the canvas presents a status prompt naming the selected terminal, instructing the user to select a compatible opposite point, and offering a Cancel action. Clicking the selected terminal again, clicking the pane, pressing Escape, or using Cancel exits the mode without modifying the project.

## Risks / Trade-offs

- **[Risk] Custom click handling could drift from React Flow connection objects.** → Canonicalize to React Flow's public `Connection` shape in one pure helper and retain the existing centralized relationship mapper.
- **[Risk] Small terminal dots remain hard to target.** → Retain their visible size and hover styling while giving them explicit button semantics and active/candidate emphasis.
- **[Risk] Node clicks could fire while selecting a terminal.** → Stop terminal activation events before they reach the node selection handler.

## Migration Plan

No data migration is required. Deploy the shared handle, controller, and styles together. Rollback restores native React Flow connection behavior without changing saved Compose state.

## Open Questions

None.
