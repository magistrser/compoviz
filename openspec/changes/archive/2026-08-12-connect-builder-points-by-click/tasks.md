## 1. Two-click connection core

- [x] 1.1 Add a failing builder interaction test for selecting an output and completing a network relationship with a second click
- [x] 1.2 Implement the shared relationship handle and builder-owned terminal selection controller to pass the output-first test

## 2. Direction, validation, and cancellation

- [x] 2.1 Add failing interaction tests for input-first completion, incompatible terminal selection, and cancellation
- [x] 2.2 Canonicalize endpoint order, validate exact typed pairs, and implement every specified cancellation path
- [x] 2.3 Add regression coverage that native React Flow click/drag connection initiation is disabled and make unsupported hidden handles inert

## 3. Connection-mode feedback

- [x] 3.1 Add active, compatible, and incompatible terminal styling plus the accessible connection-mode prompt
- [x] 3.2 Update handle-level tests for click-only button semantics and selection-state metadata
- [x] 3.3 Replace the stale drag-to-connect help hint with two-click guidance and cover the copy

## 4. Validation

- [x] 4.1 Run focused builder interaction and handle tests
- [x] 4.2 Run formatting, lint, typecheck, the full test suite, and strict OpenSpec validation
