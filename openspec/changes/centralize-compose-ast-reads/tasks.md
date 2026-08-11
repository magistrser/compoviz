## 1. Workspace Canonical Derivation

- [ ] 1.1 Add public workspace tests proving AST, issues, suggestions, YAML, and metadata describe the same accepted revision
- [ ] 1.2 Add parity tests for raw-dependent validation and suggestion checks through AST-native interfaces
- [ ] 1.3 Normalize once in workspace commit processing and pass the resulting AST to validation and suggestions

## 2. Read-Side Caller Migration

- [ ] 2.1 Change visual-builder flow conversion to accept the workspace AST and retain node/edge/position parity
- [ ] 2.2 Change primary Graphviz generation to accept AST only and retain exact DOT tests
- [ ] 2.3 Remove ambiguous raw-or-AST compatibility signatures and recount production normalization call sites

## 3. Comparison Canonical Derivation

- [ ] 3.1 Add public comparison tests proving one admitted revision drives synchronized findings, summary, and diagram input
- [ ] 3.2 Construct one internal AST per admitted project while preserving simple parsing, name precedence, and public snapshot compatibility
- [ ] 3.3 Migrate comparison analysis and multi-project DOT generation to the admitted ASTs without exposing internal records

## 4. Validation

- [ ] 4.1 Benchmark representative large workspace and three-project comparison normalization before and after
- [ ] 4.2 Run focused workspace, validation, suggestions, flow, graphviz, and comparison tests
- [ ] 4.3 Strictly validate this change, run `yarn check` and `yarn build`, and smoke-test workspace and comparison parity
