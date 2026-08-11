## Context

The workspace currently exposes reducer `dispatch`, action types, and history operations. MainLayout and `useProjectActions` construct resource actions, editors emit partial objects, templates dispatch multiple actions, and React Flow helpers directly mutate relationships through dispatch. Because history records every reducer dispatch, a single template, rename, multi-delete, or relationship gesture can become several undo steps.

The preceding workspace module owns the committed Compose snapshot and persistence. Editing must depend on that boundary while retaining current defaults, YAML output, UI cancellation behavior, and the 50-transition history contract.

## Goals / Non-Goals

**Goals:**

- Define one discriminated `ComposeEdit` vocabulary for all supported editing intents.
- Compute a complete next `ComposeState` with a pure transition before committing anything.
- Record exactly one history transition for each accepted state-changing edit and none for unchanged, rejected, or cancelled work.
- Expose only `commit`, `moveHistory`, `canUndo`, and `canRedo` to React callers.
- Translate React Flow node/edge gestures into edits without leaking reducer actions into the visualization layer.

**Non-Goals:**

- Rewrite references when resources are renamed or introduce a different duplicate-name policy.
- Change resource defaults, template definitions, relationship encodings, volume targets, `_position`, YAML generation, or the 50-state capacity.
- Make the AST the mutation source, add a state library, or alter workspace source replacement behavior.

## Decisions

### Use a closed discriminated edit union

`ComposeEdit` variants cover project naming; resource add, update, remove, rename, and positioning; atomic template application; and relationship connect/disconnect. Each variant contains domain data rather than reducer implementation details. The pure transition returns an applied state, unchanged result, or typed rejection.

A generic public reducer action or arbitrary state callback is rejected because it would recreate the shallow interface this change removes.

### Commit complete state once

`commit(edit)` reads the current workspace state, evaluates the pure transition, and sends one complete next state to the internal workspace history seam only for an applied result. Template additions, multi-resource removals, rename, and relationship changes are calculated entirely before this commit.

This preserves atomic undo even when an edit changes several Compose maps or service fields.

### Keep history next to the workspace state but owned publicly by editing

The workspace provider retains an unexported replace-state/history mechanism because parsing and editing share the same current Compose state. Only `useComposeEditing()` exposes editing history controls. Source replacement may reset or replace the present state through the internal seam; UI callers cannot dispatch reducer actions.

### Preserve transition semantics from existing implementations

Resource factory functions copy the exact current defaults. Templates are converted to the same services and declared volumes currently dispatched by `useProjectActions`. React Flow relationship translators preserve list/object `depends_on`, service network arrays/maps, and short/long volume syntax behavior from `flowConverter`; node moves continue to write `_position`.

### Reject structurally invalid edits and treat equal states as unchanged

Missing target resources, unsupported relationship endpoints, and invalid empty names return typed rejection. If a valid edit produces a state deeply equal to the current state, it returns `unchanged` and does not touch history or persistence. The existing duplicate overwrite behavior remains unchanged where it already exists.

## Risks / Trade-offs

- **[Risk] Migrating many callbacks can subtly alter YAML** → Add literal YAML parity tests for every edit category and existing templates before deleting old helpers.
- **[Risk] Relationship representations have several Compose forms** → Port existing conversion behavior into pure transition helpers and test connect/disconnect examples through `commit`.
- **[Risk] Workspace parsing and editing share history storage** → Keep the low-level commit seam internal and verify undo/redo only through `useComposeEditing()`.
- **[Risk] Removing exported action types breaks tests and mocks** → Migrate all production callers and public-seam tests in one change, then use `rg`, typecheck, and build as removal proof.

## Migration Plan

1. Add the edit types, pure transition, provider/hook, and public-seam tests while the legacy adapter still works.
2. Route MainLayout, resource editors, templates, VisualBuilder, and React Flow gestures through `commit`.
3. Migrate undo/redo controls to `moveHistory` and read Compose state from `useComposeWorkspace`.
4. Delete `useProjectActions`, action-producing `flowConverter` functions, the compatibility `useCompose` hook/provider, reducer action exports, and unused reducer machinery.
5. Roll back by restoring the compatibility hook and old action callers; persisted Compose state remains compatible.

## Open Questions

None. Canonical AST mutation remains deferred until the post-refactor seam review.
