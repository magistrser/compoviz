# Completion gates
- Run the closest unit/regression tests first, then the raw final gate: `yarn check`.
- Run `yarn build`; verify both parser and Graphviz worker chunks are emitted.
- Spec changes require `openspec validate <change-id> --strict`.
- UI changes require browser smoke testing at dev port 3000 or preview port 4173 and screenshots for material visual changes; inspect console/runtime behavior.
- Container changes require `docker compose config`, a production image build, and health/root/static-asset/history-fallback smoke checks.
- Cross-boundary changes require relevant integration tests; generalized parser inputs should retain property tests.
- Use raw commands for final proof; never claim an unrun check passed.