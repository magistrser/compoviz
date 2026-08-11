## Context

The visual builder currently maps a service-to-service React Flow connection directly to a `depends-on` relationship edit. That edit stores only the target service name, so every newly drawn dependency becomes `service_started`. The canonical AST, dependency edge renderer, and Connection Types legend already understand Started, Healthy, and Completed successfully, but the editing command and popup system do not carry a condition.

Existing dependency edges already contain their normalized condition in React Flow edge data. The workspace edit transition is the appropriate mutation boundary because it owns validation, one-step history, and the raw Compose state from which YAML and the AST are regenerated.

## Goals / Non-Goals

**Goals:**

- Choose a supported condition before committing a newly drawn dependency.
- Change the condition of an existing dependency through the visual builder.
- Reuse one accessible condition chooser and the existing typed condition palette.
- Preserve sibling dependency conditions and record each confirmed change atomically.
- Keep generated Compose syntax valid and compact when all dependencies are simple Started relationships.

**Non-Goals:**

- Add new Compose conditions or arbitrary condition text.
- Add condition choices to network or volume relationships.
- Infer or automatically select a condition from image, healthcheck, or service role.
- Change dependency direction, edge routing, colors, or legend organization.
- Add editing for other long-form `depends_on` fields beyond preserving supported existing data.

## Decisions

### Add a reusable choice popup to the application popup boundary

Extend the existing popup API with a choice request that accepts labelled string options, an initial value, confirm and cancel labels, and optional visual swatches. The popup returns the confirmed value or `null`, traps focus, supports Escape and backdrop cancellation, and restores focus using the same behavior as the existing text and confirmation popups.

The dependency chooser consumes `DEPENDENCY_CONDITION_VISUALS`, so its labels and colors cannot drift from the edge renderer or legend. A native browser prompt was rejected because the workspace already requires accessible in-application popups. A permanent global condition mode was rejected because it hides which condition will be applied and makes occasional dependency creation stateful.

### Delay new dependency mutation until a condition is confirmed

The connection handler classifies the endpoints first. Network and volume connections continue to commit immediately. For a service dependency, it requests a condition with Started preselected and commits only after confirmation. The provisional React Flow connection is not added to controlled edge state, so cancellation needs no rollback and creates no history transition.

### Activate an existing dependency edge to edit it

The builder keeps a single click as ordinary React Flow selection so keyboard deletion is not interrupted. Double-clicking a dependency edge, or pressing Enter while one is selected, reads its service endpoints and normalized condition and opens the same chooser with the current condition selected. Confirmation sends a condition update through the editing boundary; cancellation sends no edit. Non-dependency edges retain their current selection and deletion behavior without opening the chooser.

Using the same chooser keeps creation and correction consistent. A separate node configuration field was rejected because a condition belongs to one dependency pair and becomes ambiguous when a service has several dependencies.

### Make dependency-condition edits explicit domain data

Refine relationship edit types so dependency creation and condition updates carry a `DependencyCondition`, while network and volume changes cannot carry one. The pure transition validates both services, applies the selected condition to the named dependency, and returns unchanged when the stored condition already matches.

The transition normalizes the current `depends_on` shape into entries that retain each target's supported configuration, updates only the selected entry, and serializes back to a string array only when every entry is a plain Started dependency. Otherwise it writes long-form object syntax. This is preferred over continuing to use `normalizeDependsOn`, which intentionally returns names only and would discard sibling conditions.

### Verify the popup, builder, and transition seams independently

Popup tests cover initial selection, confirmation, keyboard cancellation, focus containment, and focus restoration. Builder tests cover prompting on dependency creation, cancellation, editing an existing edge, and bypassing the prompt for network and volume edges. Compose-editing tests cover all three conditions, short/long syntax, sibling preservation, no-op edits, and one-step undo.

## Risks / Trade-offs

- **[Risk] A choice popup interrupts rapid creation of many default dependencies.** → Preselect Started and allow immediate keyboard confirmation.
- **[Risk] Editing could conflict with ordinary edge selection and deletion.** → Keep single-click selection unchanged and open the editor only on double-click or Enter for a selected dependency edge.
- **[Risk] Converting between short and long syntax could lose sibling configuration.** → Normalize through a typed helper that copies existing per-target configuration and add regression tests with mixed conditions.
- **[Risk] Async popup completion could refer to an edge removed while the popup is open.** → Let the transition revalidate both endpoint services and the dependency before applying; a missing relationship is rejected without history.

## Migration Plan

No persisted-state migration is required because both short and long `depends_on` forms are already accepted. Deploy the popup API, typed relationship edits, transition support, and builder handlers together. Rollback leaves previously written long-form Compose data readable by the existing parser and renderer.

## Open Questions

None.
