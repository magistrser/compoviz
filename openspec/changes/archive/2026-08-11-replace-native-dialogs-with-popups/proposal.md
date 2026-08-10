## Why

Native browser `prompt()` and `confirm()` windows interrupt the workspace, cannot match Compoviz's interface, and provide inconsistent keyboard and focus behavior across browsers. Resource and workspace actions should stay inside the application with clear, accessible popups that preserve the same confirmation safeguards.

## What Changes

- Add reusable, app-styled popups for text entry and confirmation, with explicit titles, actions, keyboard handling, focus management, and accessible dialog semantics.
- Replace native naming prompts when users add resources from the resource controls or the visual builder, including drag-and-drop creation.
- Replace native confirmations when users delete resources or clear the entire workspace.
- Preserve current action semantics: blank resource names are not submitted, confirmed actions run once, and cancelling or dismissing a popup leaves the project unchanged.
- Keep existing toast notifications for transient success, warning, and error feedback; they are not replaced by this change.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `compose-workspace`: Resource creation, resource deletion, and clear-all confirmation use accessible in-application popups instead of native browser dialogs.

## Impact

- Affects the shared UI/provider layer, application provider composition, resource action hooks, the visual builder, Compose reset action typing, styles, and adjacent component/hook tests.
- Changes resource and clear-all handlers from blocking browser calls to asynchronous popup results while preserving user-visible outcomes.
- Introduces no backend, storage-schema, Compose-format, export, or third-party dependency changes.
