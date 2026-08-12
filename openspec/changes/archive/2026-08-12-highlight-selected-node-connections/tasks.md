## 1. Regression Coverage

- [x] 1.1 Extend the VisualBuilder interaction test seam to expose node selection and rendered edge selection state.
- [x] 1.2 Add a failing regression test proving that selecting a resource emphasizes all incident relationships and leaves unrelated relationships unchanged.

## 2. Builder Selection Behavior

- [x] 2.1 Derive connected-edge selection emphasis from the selected resource while preserving independently selected edges.
- [x] 2.2 Verify changing and clearing resource selection recomputes connected-edge emphasis without changing Compose state.

## 3. Validation

- [x] 3.1 Run focused VisualBuilder tests and the project quality/build gates.
- [x] 3.2 Validate the OpenSpec change strictly and smoke-test the builder interaction in a browser without console errors.
