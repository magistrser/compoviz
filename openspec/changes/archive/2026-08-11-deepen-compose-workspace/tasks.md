## 1. Public Workspace Seam

- [x] 1.1 Add failing public-hook tests for replacement outcomes, coherent snapshots, invalid input preservation, clear, and exact YAML download filename
- [x] 1.2 Add `src/features/compose-workspace/` public types, provider, hook, and feature index with a read-only snapshot and typed intents/outcomes
- [x] 1.3 Preserve existing local-storage keys and restore compatible saved Compose state, profiles, and environment values through the new provider

## 2. Atomic Processing Runtime

- [x] 2.1 Add failing tests for normalized selected/dropped directory sources, preferred primary files, include paths, and `.env` precedence
- [x] 2.2 Move file classification, recursive traversal, primary selection, retained files, and effective environment construction behind the workspace runtime
- [x] 2.3 Add failing tests for worker success/fallback parity, nonfatal enrichment failure, atomic metadata, and failed configuration reparsing
- [x] 2.4 Normalize worker and synchronous parser results through shared enrichment, validation, suggestions, AST, YAML, persistence, and commit logic
- [x] 2.5 Add failing deferred-work tests and guard replacement, configuration, enrichment, persistence, and clear with a latest-generation token

## 3. Compatibility and Validation

- [x] 3.1 Make the existing `ComposeProvider` and `useCompose` exports delegate to the feature module without changing current callers
- [x] 3.2 Run focused workspace tests and repair storage, parsing, enrichment, and UI compatibility regressions
- [x] 3.3 Validate `deepen-compose-workspace` strictly, run `yarn check` and `yarn build`, and smoke-test workspace import/configuration in the browser
