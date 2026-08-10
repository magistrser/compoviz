## Context

Compoviz currently uses native browser dialogs in three layers: `useProjectActions` prompts for resource names and confirms resource deletion, `VisualBuilder` repeats those flows for toolbar and drag-and-drop actions, and `ComposeProvider.resetProject` confirms clear-all before mutating workspace state. These calls block JavaScript execution, render outside the application's visual system, and give the application little control over accessibility or testing.

The application already has a shared UI barrel, an app-level provider composition, modal animation/style primitives, and toast notifications. Toasts remain appropriate for transient feedback but cannot collect a name or gate a destructive action. The replacement must remain browser-only, use existing React/SCSS conventions, and add no dependency.

## Goals / Non-Goals

**Goals:**

- Provide one reusable in-application popup API for text entry and confirmation.
- Replace every runtime `prompt()` and `confirm()` call used by resource and clear-all actions.
- Preserve action results while making cancellation, validation, keyboard operation, and focus behavior explicit.
- Keep presentation concerns out of Compose state mutation logic.
- Cover the shared popup and each migrated consumer with regression tests.

**Non-Goals:**

- Replacing toast notifications, the examples gallery, template chooser, or What's New modal.
- Redesigning resource forms, adding rename validation, or changing duplicate-name behavior.
- Changing Compose state, local-storage formats, undo history, exports, or parser behavior.
- Adding a general-purpose third-party modal library.

## Decisions

### Use a shared promise-based popup provider

Add a shared popup provider and hook under `src/components/ui` and mount the provider in the application shell. The hook will expose typed operations for requesting text and confirming an action. Each operation returns a promise that resolves to the submitted value/confirmation result or to a cancellation result.

This preserves the straightforward control flow of the native APIs while allowing the popup UI to be rendered declaratively in one place. A discriminated request type will ensure text-entry and confirmation popups provide only their valid options. The provider will settle a pending request on submit, cancel, dismiss, or unmount so callers cannot remain suspended.

Alternatives considered:

- Local popup state in each consumer would avoid a provider but duplicate presentation, validation, and accessibility logic across `MainLayout` and `VisualBuilder`.
- Toast actions cannot provide modal confirmation or validated text entry.
- A third-party modal package is unnecessary for two small dialog variants and would expand the locked dependency graph.

### Keep confirmation at the user-action boundary

`ComposeProvider.resetProject` will become an unconditional state action returning `void`. The clear-all handler will await the popup confirmation and call `resetProject` only when confirmed. Resource add and delete handlers will follow the same pattern: await the popup result first, then dispatch exactly once.

Separating confirmation from state mutation prevents the Compose provider from depending on UI presentation and keeps direct state helpers testable. The application-level handlers remain responsible for satisfying the requirement that user-triggered destructive actions are confirmed.

Alternative considered: injecting the popup hook into `ComposeProvider` would retain the current `resetProject(): boolean` contract, but it would couple domain state management to modal rendering and force the popup provider above the Compose provider solely for that dependency.

### Render one modal popup with safe dismissal semantics

The provider will render the active popup in a portal attached to `document.body`, using existing design tokens and modal animations so it is not clipped by workspace stacking or overflow contexts. Only one popup is active at a time; the modal overlay prevents normal users from starting a second conflicting action.

Text-entry popups will use a form, trim submitted names, and keep the primary action disabled until the value is non-empty. Confirmation popups will use explicit cancel and confirm labels, with destructive styling for delete and clear-all actions. Cancel, Escape, and backdrop dismissal will all resolve as cancellation and perform no mutation. Enter submits a valid text-entry form; destructive confirmations require activation of their explicit confirm action.

### Make focus and dialog semantics part of the component contract

The popup will use `role="dialog"`, `aria-modal="true"`, and stable title/description associations. It will capture the previously focused element, move focus to the text input or safest initial action, keep Tab navigation inside the popup, and restore focus after closure. The implementation will use small DOM helpers and React refs rather than a new focus-management dependency.

This behavior will be verified with Testing Library assertions for accessible names, keyboard submit/cancel behavior, focus placement/restoration, input validation, and non-mutation on dismissal.

## Risks / Trade-offs

- [Async handlers can dispatch after their initiating component changes] → Capture required resource type, name, and drop position before opening the popup; settle requests during provider cleanup; test migrated handlers with awaited interactions.
- [A hand-built focus trap can miss unusual focusable elements] → Keep popup controls intentionally small, query only standard enabled controls, and add forward/backward Tab regression tests.
- [Changing `resetProject` from `boolean` to `void` can affect callers] → Update the exported context type and all references together; current impact analysis finds only `MainLayout` through `useProjectActions` as a user-action caller.
- [Multiple rapid requests could leave unresolved promises] → Maintain a single active request, block pointer interaction behind the modal, and define provider behavior so every accepted request is settled exactly once.

## Migration Plan

1. Add and test the shared popup provider, hook, styles, and application/test provider composition.
2. Migrate resource add/delete handlers and visual-builder drag/drop flows to await popup results.
3. Move clear-all confirmation to the action handler and simplify the Compose reset contract.
4. Remove all runtime native dialog calls and run focused tests, repository quality gates, a production build, and browser smoke checks.

No data migration or deployment coordination is required. Rollback is a source revert because the change does not alter persisted data or external contracts.

## Open Questions

None.
