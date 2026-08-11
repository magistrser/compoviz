## 1. Workspace Canonical Derivation

- [x] 1.1 Add public workspace tests proving AST, issues, suggestions, YAML, and metadata describe the same accepted revision
- [x] 1.2 Add parity tests for raw-dependent validation and suggestion checks through AST-native interfaces
- [x] 1.3 Normalize once in workspace commit processing and pass the resulting AST to validation and suggestions

## 2. Read-Side Caller Migration

- [x] 2.1 Change visual-builder flow conversion to accept the workspace AST and retain node/edge/position parity
- [x] 2.2 Change primary Graphviz generation to accept AST only and retain exact DOT tests
- [x] 2.3 Remove ambiguous raw-or-AST compatibility signatures and recount production normalization call sites

## 3. Comparison Canonical Derivation

- [x] 3.1 Add public comparison tests proving one admitted revision drives synchronized findings, summary, and diagram input
- [x] 3.2 Construct one internal AST per admitted project while preserving simple parsing, name precedence, and public snapshot compatibility
- [x] 3.3 Migrate comparison analysis and multi-project DOT generation to the admitted ASTs without exposing internal records

## 4. Validation

- [x] 4.1 Benchmark representative large workspace and three-project comparison normalization before and after
  - 250 services, 25 networks, and 50 volumes per project; seven-sample median. Workspace model: 137.11 ms/500 calls before, 27.34 ms/100 calls after. Three-project comparison over 100 recomputations: 81.45 ms/300 calls before, 0.81 ms/3 admission-time calls after.
- [x] 4.2 Run focused workspace, validation, suggestions, flow, graphviz, and comparison tests
- [x] 4.3 Strictly validate this change, run `yarn check` and `yarn build`, and smoke-test workspace and comparison parity
  - Strict validation, `yarn check` (47 files/517 tests), and `yarn build` pass. Browser smoke confirmed workspace Build/View parity, synchronized comparison findings/diagram output, and no captured runtime errors.
