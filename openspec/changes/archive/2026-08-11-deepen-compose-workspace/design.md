## Context

The existing `useCompose` provider owns browser storage, history, parsing, file import, directory traversal, environment/profile configuration, Dockerfile enrichment, validation, suggestions, AST derivation, and view-facing mutation APIs. Async parsing is split between a parser worker and a synchronous fallback, while enrichment and state commits occur along partially separate paths. This makes it possible for older work to finish after newer user intent and makes failure atomicity difficult to reason about.

The application must remain browser-only and retain storage keys and shapes, Compose output, include and environment resolution, worker fallback, sanitization boundaries, and export filenames.

## Goals / Non-Goals

**Goals:**

- Establish `useComposeWorkspace()` as the narrow public boundary for imported/configured Compose processing.
- Produce a coherent read-only snapshot from one accepted generation: Compose state, AST, YAML, issues, suggestions, processing metadata, and activity.
- Route worker and fallback successes through shared enrichment and commit logic.
- Guarantee latest-intent-wins ordering and failure without partial workspace or persistence mutation.
- Keep `useCompose` temporarily as a delegating adapter so callers can migrate in later dependent changes.

**Non-Goals:**

- Redesign editing/history commands, project comparison, or architecture rendering.
- Introduce a canonical AST mutation model, state library, backend, storage migration, or Compose semantic change.
- Change Dockerfile enrichment from nonfatal to fatal.

## Decisions

### Use a provider-owned generation runtime

Every `replace` and `configure` intent increments a monotonic generation. Parser, fallback, and enrichment completions compare their captured generation before committing state or persistence. `clear` also advances the generation, preventing prior async work from repopulating a cleared workspace.

This is preferred over cancellation alone because worker messages and fetch completions can still arrive after cancellation. A generation guard is the final authority even when best-effort cancellation is available.

### Separate visible intent from committed project data

The snapshot stores configuration intent (`activeProfiles` and `environment`) separately from the last successfully committed source/project. A failed replacement leaves both the old source and project committed. A failed configuration reparse retains and persists the new configuration values but leaves the old project, YAML, AST, and derived data intact while exposing the rejection.

This distinguishes what the user selected from what could be successfully materialized.

### Normalize both parser adapters into one candidate

The parser worker and synchronous parser remain internal real adapters. Their successful results are converted to the same candidate shape, then pass through the same optional Dockerfile enrichment, validation, suggestions, AST derivation, YAML generation, and atomic commit. Worker startup or execution failure invokes the synchronous adapter for the same generation.

### Retain files and effective environment inside source intent

The module owns file classification, normalized relative paths, recursive directory traversal, primary Compose-file selection, and the retained file map used by includes and Dockerfiles. Effective interpolation environment is computed with imported `.env` values followed by explicit environment overrides, preserving the existing precedence.

### Keep a temporary compatibility adapter

The existing `ComposeProvider`/`useCompose` exports delegate to the new provider and translate the snapshot/intents into the old shape until the dependent editing migration is complete. No worker, storage, reducer, or sanitization collaborator is exported from the feature index.

## Risks / Trade-offs

- **[Risk] Compatibility translation can temporarily duplicate derived aliases** → Keep it thin, test storage and YAML parity through the new seam, and remove it after all callers migrate.
- **[Risk] Async races are timing-sensitive** → Test deferred generations at the public hook and assert that superseded outcomes do not change snapshot or storage.
- **[Risk] Worker and fallback metadata could diverge** → Normalize before enrichment and use exactly one commit path.
- **[Risk] Browser storage contains malformed or older values** → Reuse existing validation/defaulting and preserve keys and compatible JSON shapes.

## Migration Plan

1. Add the feature provider, hook, public types, and internal runtime while retaining current parsing utilities and worker manager.
2. Add public-seam regression tests for import/configure/failure/races/storage/clear/download behavior.
3. Wrap the application with the feature provider and make old `useCompose` calls delegate without observable changes.
4. Migrate read-only callers opportunistically; leave editing compatibility for the next change.
5. Roll back by restoring the previous provider implementation; no persisted data migration is required.

## Open Questions

None. The canonical AST seam will be reconsidered only after all four deep-module changes are complete.
