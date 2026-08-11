## Context

`useMultiProject` currently owns projects plus unused active-project and mode state, while `CompareView` parses files and generates summaries and `comparison.ts` computes findings. Admission checks happen after parsing and the view derives projects, conflicts, counts, and prose along separate render paths. The three-project capacity and simple YAML/root parsing behavior must remain, but a rejected admission must be provably side-effect free.

## Goals / Non-Goals

**Goals:**

- Establish `useProjectComparison()` as the only collection and admission boundary.
- Keep projects, findings, severity counts, and summary prose synchronized from one immutable collection transition.
- Check capacity before parsing and return typed capacity/parsing rejections without mutation.
- Preserve admission order and deterministic naming precedence.
- Remove unused active-project, update-project, and compare-mode state.

**Non-Goals:**

- Reuse the Compose workspace parser, worker, enrichment, profiles, includes, or storage.
- Change conflict/overlap detection rules or the maximum of three projects.
- Refactor Graphviz rendering or shared diagram controls until the dependent diagram change.

## Decisions

### Keep admission and derived snapshot in one reducer transition

The module stores an immutable project array. An accepted admission, removal, or clear constructs the next array once and derives findings, severity counts, and summary from that exact array before publishing a single snapshot. Rejections return outcomes without dispatching.

This is preferred over independent memos in the view because synchronization becomes an invariant of the module result rather than a convention among callers.

### Check capacity before invoking the simple parser

`admit` reads the current collection through a ref, rejects when it already has three projects, and only then invokes `js-yaml` with the existing object-root check. Tests observe parsing through invalid fourth input: the capacity outcome takes precedence and the snapshot remains referentially equal.

### Preserve a narrow admission input

The public input is `{ yaml, importedFilename? }`. Identity is derived after a valid root parse: trimmed non-empty Compose `name`, otherwise the imported filename with only its final extension removed, otherwise `Untitled`. An internal monotonic id prevents collisions without exposing identity-generation mechanics.

### Derive summary prose inside the feature

Summary contains the same project count and severity totals as the findings/count snapshot. Existing detailed `ComparisonResult` values remain produced by the focused `compareProjects` deep utility and are not duplicated in React.

## Risks / Trade-offs

- **[Risk] IDs based on render timing can make tests brittle** → Use a provider-local monotonic counter and assert ordering/names rather than implementation-specific id text.
- **[Risk] Summary wording can drift from counts** → Generate both from the same findings array and test exact synchronization after admit/remove/clear.
- **[Risk] Moving parsing changes error messages** → Preserve simple YAML/root acceptance and expose a stable typed parsing rejection while keeping diagnostic text secondary.

## Migration Plan

1. Add the feature provider/hook, public types, immutable transition, and public-seam tests.
2. Migrate `CompareView` to `admit`, `remove`, `clear`, and the provided snapshot.
3. Delete `useMultiProject` and its unused state/API.
4. Keep `compareProjects` and multi-project DOT generation in their existing focused modules.
5. Roll back by restoring the old hook/view integration; no persisted data exists.

## Open Questions

None.
