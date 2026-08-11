## 1. Directional Builder Terminals

- [x] 1.1 Add failing flow-conversion and rendered-node tests proving inputs are left and outputs are right across resource types.
- [x] 1.2 Add shared builder connection geometry and apply it to generated node metadata and rendered handles.

## 2. Directional Edge Routing

- [x] 2.1 Add a failing orthogonal-routing regression test for missing React Flow position metadata.
- [x] 2.2 Make routing fall back to right-side output and left-side input geometry.

## 3. Terminal-Aware Cleanup

- [x] 3.1 Add failing deterministic layout tests for typed acyclic connections, terminal clearance, and cyclic graphs.
- [x] 3.2 Make cleanup ranking use the shared terminal-lane clearance and explicit directed-edge constraints.

## 4. Validation

- [x] 4.1 Run focused regression tests and strict OpenSpec validation.
- [x] 4.2 Run the repository check/build gates.
- [x] 4.3 Browser-smoke the builder cleanup with screenshot and console inspection.

## 5. Resource-to-Service Direction

- [x] 5.1 Add failing regression tests proving network and volume resources expose right-side outputs, services expose matching left-side inputs, and generated edges run resource-to-service.
- [x] 5.2 Reverse network and volume flow edges and move the affected resource/service handles to their corrected sides.
- [x] 5.3 Add a failing builder interaction test for manually connecting and removing a resource input.
- [x] 5.4 Update builder relationship mapping so manual connections and deletions preserve resource-to-service semantics.

## 6. Corrected-Direction Validation

- [x] 6.1 Update cleanup fixtures for resource-to-service ordering, run focused regression tests, and validate OpenSpec strictly.
- [x] 6.2 Run the full repository check and production build.
- [x] 6.3 Browser-smoke the corrected builder cleanup with browser-use, including a screenshot and console inspection.
