# Change: Centralize Compose AST Reads

## Why

The four deep-module refactors leave six production normalization call sites across workspace processing, validation, suggestions, visual-builder conversion, diagram generation, and project comparison. A single accepted workspace revision is normalized separately for its public AST, validation issues, and suggestions, while several downstream APIs still accept either raw Compose input or AST. This preserves competing read semantics and creates avoidable work and drift risk.

## What Changes

- Establish one canonical AST per accepted Compose revision and pass it to read-only consumers.
- Make validation, suggestions, flow conversion, and primary DOT generation AST-native at their module boundaries.
- Give project comparison one AST per admitted immutable project rather than renormalizing on each findings/diagram recomputation.
- Retain raw Compose state as the editing, persistence, and YAML-generation source; do not make the normalized AST a mutation model.
- Remove compatibility signatures that accept ambiguous raw-or-AST input after all callers migrate.

## Impact

- Depends on completion and synchronization of the four `deepen-*` changes.
- Affected specs: `compose-workspace`, `project-comparison`
- Affected code: compose workspace derivation, validation, suggestions, flow conversion, Graphviz generation, comparison analysis
- No intended Compose semantic, storage, YAML, editing, comparison, or diagram behavior change
