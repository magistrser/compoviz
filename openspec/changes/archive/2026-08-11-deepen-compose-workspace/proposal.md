## Why

Compose workspace behavior is currently spread across a broad React hook, import helpers, parser adapters, enrichment, persistence, validation, and view-specific callbacks. A deep module is needed so every source replacement and configuration reparse follows one atomic, latest-intent-wins lifecycle without exposing its internal machinery.

## What Changes

- Add a `compose-workspace` feature module whose provider and `useComposeWorkspace()` hook expose a read-only snapshot plus `replace`, `configure`, `clear`, and YAML download intents with typed outcomes.
- Move file selection and recursive directory import, primary-file selection, retained files, `.env` precedence, parser selection and fallback, enrichment, metadata, validation, suggestions, AST derivation, persistence, and download behavior behind the module boundary.
- Make asynchronous workspace processing atomic and generation-guarded so superseded work cannot update state or storage.
- Preserve the prior committed project when replacement or configuration reparsing fails; keep failed configuration intent visible and persisted.
- Retain the existing `useCompose` API temporarily as a delegating compatibility adapter while callers migrate.
- Preserve existing local-storage keys and compatible persisted JSON shapes, Compose semantics, browser-only processing, worker fallback, and `docker-compose.yml` export.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `compose-workspace`: Define atomic source replacement and configuration reparsing, latest-intent ordering, consistent worker/fallback commits, and failure without partial mutation.

## Impact

The change affects the Compose provider/hook, file import path, parser worker and synchronous fallback integration, Dockerfile enrichment, local persistence, derived workspace data, and tests. It introduces no backend, dependency, storage migration, Compose semantic change, or new public parser/reducer surface.
