## Context

`normalizeToAST` is currently called by the workspace, visual-builder conversion, suggestions, validation, primary Graphviz generation, and comparison. The workspace already publishes both exact raw Compose state and a normalized AST, but read-only consumers do not consistently use that AST. Comparison similarly retains raw documents and normalizes them repeatedly.

## Goals / Non-Goals

**Goals:**

- Normalize once per accepted immutable revision.
- Make every derived read for that revision consume the same AST instance.
- Keep raw state and normalized AST roles explicit at module interfaces.
- Preserve all existing observable output and storage shapes.

**Non-Goals:**

- Use AST as an editing or YAML-serialization model.
- Change Compose normalization semantics.
- Cache mutable inputs by identity.
- Rewrite comparison parsing through the workspace pipeline.

## Decisions

### Raw state remains authoritative for mutation

Compose editing continues to commit exact `ComposeState`. Persistence and YAML generation continue from that state. This avoids round-trip loss through normalized collections and `_raw` metadata.

### AST is authoritative for derived reads

Workspace processing normalizes the committed state once, then passes that AST into AST-native validation and suggestion functions. MainLayout and VisualBuilder use the published snapshot AST for Graphviz and flow reads.

### Comparison owns admitted ASTs internally

Admission retains the simple YAML/root parser but constructs an AST once after parsing. Findings and multi-project DOT generation receive immutable comparison records containing the same raw content and internal AST. The public comparison snapshot need not expose the AST unless a concrete caller requires it.

### Compatibility overloads are temporary

Raw-or-AST signatures may delegate during migration but are removed before completion. Final public seams identify raw mutation input and normalized read input in their types.

## Risks / Trade-offs

- Some validation and suggestion checks intentionally inspect raw syntax through AST `_raw`; parity tests must protect those cases.
- Comparison and DOT utilities currently expose raw-oriented types, so migration must avoid leaking the new internal record.
- Holding raw state and AST together increases retained memory but removes repeated normalization; measure representative large projects before and after.
