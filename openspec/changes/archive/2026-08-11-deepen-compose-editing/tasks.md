## 1. Edit Model and History Seam

- [x] 1.1 Add failing public-hook tests for applied, unchanged, and rejected edits plus exact YAML parity for resource defaults
- [x] 1.2 Add `src/features/compose-editing/` with the discriminated `ComposeEdit` union, pure transition, provider/hook, and typed outcomes
- [x] 1.3 Add public-hook tests for undo/redo, redo invalidation, the 50-transition cap, and one atomic history entry per accepted edit
- [x] 1.4 Replace the workspace's internal reducer-action bridge with an unexported complete-state commit/history seam used by parsing and editing

## 2. Caller Migration

- [x] 2.1 Migrate MainLayout project naming and resource mutations to `commit`, clear interactions to workspace `clear`, and preserve popup cancellation
- [x] 2.2 Migrate template application as one edit and verify literal generated YAML, declared volumes, defaults, and one-step undo/redo
- [x] 2.3 Migrate resource editor views and positioning gestures to Compose edits without constructing reducer actions
- [x] 2.4 Move relationship connect/disconnect semantics from `flowConverter` mutations into pure Compose edits and migrate VisualBuilder gestures
- [x] 2.5 Add view-seam regression tests for cancelled naming/deletion and atomic template, rename, multi-delete, positioning, and relationship behavior

## 3. Remove Shallow Mutation APIs

- [x] 3.1 Remove `useProjectActions`, action-producing `flowConverter` helpers, the temporary `useCompose` adapter/provider, and superseded shallow tests
- [x] 3.2 Remove public `dispatch`, `ComposeAction`, and `ComposeDispatch` exports and delete unused reducer/history action machinery
- [x] 3.3 Confirm no production mutation caller bypasses `useComposeEditing` and no workspace public export exposes reducers or history internals

## 4. Validation

- [x] 4.1 Run focused editing, layout, editor, visual-builder, YAML, and workspace tests
- [x] 4.2 Validate `deepen-compose-editing` strictly, run `yarn check` and `yarn build`, and smoke-test editing/undo/redo in the browser
