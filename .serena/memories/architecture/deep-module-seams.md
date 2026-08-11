# Deep module seams

Compoviz's intended feature boundaries are:

- `features/compose-workspace`: `ComposeWorkspaceProvider` / `useComposeWorkspace` own source replacement, configuration reparsing, latest-generation ordering, parser fallback, enrichment, validation/suggestions/AST/YAML derivation, persistence, clear, and YAML download. Exact raw `ComposeState` remains the editing/persistence/YAML source.
- `features/compose-editing`: `useComposeEditing` accepts discriminated `ComposeEdit` intents, commits one complete-state history transition per applied edit, and owns undo/redo (50-transition cap). UI and React Flow callers must not dispatch reducer actions or mutate Compose state directly.
- `features/project-comparison`: `ProjectComparisonProvider` / `useProjectComparison` own simple YAML admission, three-project capacity, identity, immutable projects/findings/counts/summary snapshots, removal, and clear. Capacity is checked before parsing.
- `features/diagram`: `RenderedArchitectureDiagram` accepts DOT, an accessible label, optional overlay, and optional opaque node activation. It owns Graphviz worker lifecycle, stale-result protection, SVG sanitization/insertion/export, native listeners, pan/zoom/fit/reset, and the fixed `docker-compose-diagram.svg` filename. DOT generation stays with callers.

A deferred, unimplemented OpenSpec proposal `centralize-compose-ast-reads` records that normalization still crosses workspace, validation, suggestions, flow conversion, Graphviz, and comparison. Its direction is one AST per immutable revision for read-side consumers while raw state stays authoritative for editing and serialization.