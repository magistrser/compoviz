# Suggested commands
- Enable the pinned package manager: `corepack enable`.
- Immutable install: `yarn install --immutable`.
- Dev: `yarn dev` at port 3000. Production preview: `yarn preview` at port 4173.
- Full quality gate: `yarn check` (lint, strict typecheck, formatting check, complete Vitest suite).
- Individual checks: `yarn lint`, `yarn typecheck`, `yarn format:check`, `yarn test`, `yarn build`.
- Focused tests: `yarn vitest run <test-file-or-pattern>`.
- OpenSpec: `openspec list`, `openspec show <change>`, `openspec validate <change> --strict`.
- Docker dev: `yarn docker:dev`; production image: `docker build -t compoviz-dev .`.
- Prefer RTK for noisy exploration; use raw commands for final proof and exact failures.