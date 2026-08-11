## Why

Compose mutations are currently expressed as reducer actions across layout callbacks, editor views, templates, and React Flow helpers, so one user intent can create multiple history entries and callers depend on low-level state machinery. A dedicated editing module is needed to make every accepted intent an atomic, undoable Compose transition.

## What Changes

- Add a discriminated `ComposeEdit` model, pure transition function, and `useComposeEditing()` public hook with `commit`, `moveHistory`, `canUndo`, and `canRedo`.
- Route project naming, resource creation/update/removal/rename, template application, positioning, and relationship changes through complete Compose edits.
- Commit the complete next Compose state once per accepted edit; return typed applied, unchanged, or rejected outcomes.
- Preserve existing defaults, template output, volume targets, relationship encodings, `_position`, generated YAML, 50-transition history capacity, and redo invalidation.
- Keep existing rename behavior without reference rewriting or a new duplicate-name policy.
- **BREAKING**: Remove public reducer `dispatch`, `ComposeAction`, and `ComposeDispatch`, along with `useProjectActions`, mutation helpers in `flowConverter`, and the temporary `useCompose` compatibility hook after all callers migrate.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `compose-workspace`: Require exactly one history transition per accepted Compose edit and no transition for cancelled, rejected, or unchanged intents.

## Impact

The change affects the workspace history seam, MainLayout, resource editors, template application, VisualBuilder and React Flow gesture translation, model exports, reducer/action helpers, tests, and generated YAML verification. It adds no dependency, storage migration, Compose semantic change, rename-reference rewriting, or new duplicate policy.
