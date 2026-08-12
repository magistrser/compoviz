## 1. Compact Clean Layout

- [x] 1.1 Add a failing regression test for compact horizontal lanes on the supplied shared-network topology
- [x] 1.2 Implement deterministic vertical lane compaction while preserving Dagre's horizontal ranks

## 2. Bundle Network Fan-out

- [x] 2.1 Add failing routing tests for a shared obstacle-safe network trunk and unsafe-layout fallback
- [x] 2.2 Supply stable network sibling groups through the builder routing context
- [x] 2.3 Implement shared-trunk network paths while preserving endpoint anchoring, obstacle avoidance, and edge styling

## 3. Validation

- [x] 3.1 Run focused layout, routing, and builder component tests
- [x] 3.2 Run formatting, lint, type checking, the full test suite, and strict OpenSpec validation
- [x] 3.3 Verify the supplied Compose topology visually in the Build view when the in-app browser is available

## 4. Automatic Initial Cleanup

- [x] 4.1 Add failing VisualBuilder tests for one-time cleanup of an unpositioned loaded source and preservation of arranged projects
- [x] 4.2 Reuse the clean-layout transition automatically once per eligible workspace source generation
- [x] 4.3 Run automated validation and verify first-load cleanup with the supplied Compose file in browser-use
