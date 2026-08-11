## Why

Comparison admission, project identity, collection state, conflict analysis, severity totals, and summary prose are split between `useMultiProject`, `CompareView`, and comparison utilities. A deep comparison module is needed so projects, findings, and summary always derive from the same immutable collection and a rejected fourth project cannot partially affect the view.

## What Changes

- Add `src/features/project-comparison/` with `useProjectComparison()` exposing a read-only snapshot plus `admit`, `remove`, and `clear`.
- Move admission parsing, project identity, collection ordering, conflict findings, severity counts, and summary prose behind the module boundary.
- Check the three-project capacity before YAML parsing; reject a fourth admission with a typed outcome and no mutation.
- Return typed parsing rejections without changing projects, findings, counts, ordering, or summary.
- Preserve the simple comparison YAML/root parser rather than reusing the Compose workspace pipeline.
- Preserve naming precedence: non-empty Compose name, imported filename without its final extension, then `Untitled`.
- Recompute findings and summary from the same immutable project collection after every accepted admission, removal, or clear.
- Remove unused active-project, update-project, and compare-mode APIs and delete `useMultiProject` after the comparison view migrates.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `project-comparison`: Define pre-parse capacity rejection without mutation, typed invalid-input rejection, identity precedence, and synchronized collection/findings/summary transitions.

## Impact

The change affects the comparison hook/view, simple YAML parsing boundary, comparison utility integration, tests, and project identity generation. It does not reuse workspace parsing, change comparison algorithms, add persistence, change the three-project cap, or alter diagram rendering in this stage.
