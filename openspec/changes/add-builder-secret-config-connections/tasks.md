## 1. Compose Relationship Domain

- [ ] 1.1 Add regression tests for secret/config connect, duplicate connect, short- and long-form disconnect, undefined-resource rejection, sibling attribute/order preservation, and atomic undo/redo.
- [ ] 1.2 Extend Compose reference types and relationship edit unions with typed secret/config relationship variants.
- [ ] 1.3 Implement lossless secret/config reference matching and mutation in the compose-editing transition boundary until the domain tests pass.

## 2. Flow Conversion and Edge Presentation

- [ ] 2.1 Add flow-converter tests proving defined short- and long-form secret/config references produce stable resource-to-service edges while undefined references do not.
- [ ] 2.2 Extend `stateToFlow` with secret and config edge derivation and relationship-specific handle ids.
- [ ] 2.3 Add secret and config edge component tests for orthogonal paths, distinct dotted semantic styles, standard selection emphasis, terminal-center endpoints, and absence of sensitive resource data.
- [ ] 2.4 Implement and register the secret/config edge components using the shared orthogonal routing engine.

## 3. Builder Terminals and Interaction

- [ ] 3.1 Add node tests for accessible secret/config outputs and the five centered service inputs at the specified offsets, including dependency input/output alignment and click-only behavior.
- [ ] 3.2 Replace the disabled secret/config handles with `BuilderHandle` outputs and add the matching service inputs.
- [ ] 3.3 Add VisualBuilder tests for compatible endpoint highlighting, either-order two-click connection, incompatible pairs, immediate commit without a popup, duplicate no-op behavior, edge deletion, batched deletion, and connected-node highlighting.
- [ ] 3.4 Extend connection and edge classifiers, deletion mapping, and the Connection Types legend for secret and config relationships.

## 4. Layout and Routing

- [ ] 4.1 Extend routing-lane geometry and orthogonal-path tests with stable, non-coincident secret and config lanes and rank separation derived from the longest lead.
- [ ] 4.2 Add deterministic layout tests proving secret/config resources rank before consuming services, remain non-overlapping, and produce identical coordinates across repeated and reordered inputs.
- [ ] 4.3 Update routing and layout configuration until the new relationship types satisfy obstacle avoidance, terminal anchoring, and deterministic cleanup tests.

## 5. Validation and Visual Verification

- [ ] 5.1 Run the focused compose-editing, flow-converter, node, edge, VisualBuilder, routing, and layout test suites with raw output and resolve all failures.
- [ ] 5.2 Run `yarn format:check`, `yarn lint`, `yarn typecheck`, `yarn test`, and `yarn build` and resolve all failures.
- [ ] 5.3 Run `openspec validate add-builder-secret-config-connections --strict` and resolve all validation failures.
- [ ] 5.4 Verify in the browser that imported short- and long-form references render correctly, connections can be created from either endpoint order, edges can be deleted and undone/redone, clean layout remains readable, generated YAML preserves long-form siblings, and no console errors or secret contents appear.
