## 1. Regression Coverage

- [x] 1.1 Extend builder node handle tests to assert matching dependency input/output offsets and distinct supporting-resource input offsets.

## 2. Handle Alignment

- [x] 2.1 Align the service dependency output offset with the dependency input offset without changing terminal sides or other lanes.

## 3. Validation

- [x] 3.1 Run the focused component test and strict OpenSpec validation.
- [x] 3.2 Verify the aligned terminals in the running Build view with browser-use.

## 4. Endpoint Anchoring

- [x] 4.1 Remove transform-based entrance animation from handle-bearing builder nodes while retaining a safe fade-in.
- [x] 4.2 Re-run the browser geometry assertion and focused/full validation to confirm every line endpoint coincides with its dot center.

## 5. Compact Terminal Spacing

- [x] 5.1 Halve the adjacent service input-terminal spacing around the node midpoint and keep the dependency output aligned.
- [x] 5.2 Run focused/full validation and verify the rendered spacing and endpoint centers with browser-use.
