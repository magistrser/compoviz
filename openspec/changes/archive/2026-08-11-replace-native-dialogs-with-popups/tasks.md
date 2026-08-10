## 1. Shared Popup UI

- [x] 1.1 Add focused component tests for accessible naming and confirmation popups, including submit/cancel results, non-empty trimmed input, Escape, backdrop dismissal, Tab containment, focus placement/restoration, and provider cleanup.
- [x] 1.2 Implement the typed promise-based popup provider and hook with text-entry and confirmation request variants, single-request settlement, portal rendering, accessible dialog semantics, safe destructive defaults, and no third-party dependency.
- [x] 1.3 Add popup styles using existing Compoviz tokens and modal animations, export the API through the shared UI barrel, and mount the provider in both the application shell and shared test renderer.

## 2. Workspace Action Migration

- [x] 2.1 Make `ComposeProvider.resetProject` an unconditional `void` state action, update the exported context contract, and add a provider regression test for resetting project and parser-related state.
- [x] 2.2 Add tests for `useProjectActions` naming, deletion, and clear-all confirm/cancel paths, then migrate the handlers to await popup results before dispatching or changing selection.
- [x] 2.3 Add visual-builder regression tests for toolbar and drag-and-drop naming plus delete confirmation, then replace its native dialogs while preserving trimmed names, captured drop positions, selection changes, and cancellation behavior.
- [x] 2.4 Remove all runtime `prompt()` and `confirm()` usage and verify existing toasts and unrelated modals remain unchanged.

## 3. Validation

- [x] 3.1 Run the focused popup, Compose provider, project-action, visual-builder, and workspace integration tests and fix any accessibility or async regressions.
- [x] 3.2 Run `openspec validate replace-native-dialogs-with-popups --strict`, followed by the raw final quality gates `yarn check` and `yarn build`.
- [x] 3.3 Smoke-test resource add, drag-and-drop add, resource delete, and clear-all confirmation/cancellation in the browser at desktop and mobile viewports; verify focus behavior and console output and capture screenshots of the new popup states.
