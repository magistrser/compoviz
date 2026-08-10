# Repository Guidelines

## Project Structure & Module Organization

Compoviz is a browser-only React/Vite application. `src/app/` owns the provider/router shell and `src/pages/` owns lazy route entries. Reusable UI lives in `components/`, feature slices in `features/`, stateful logic in `hooks/` and `context/`, Compose AST code in `models/`, helpers in `utils/`, and background parsing in `workers/`. Keep tests beside their code as `*.test.ts` or `*.test.tsx`. Shared Compose samples belong in `fixtures/`; static assets belong in `public/`; global styling belongs in `src/styles/global.scss`. Docker files are at the root and in `compose/`.

## Build, Test, and Development Commands

Use Node 22.12.0 (`.nvmrc`), enable Corepack, and install the locked dependency graph with `yarn install --immutable`.

- `yarn dev` starts Vite with hot reload at `http://localhost:3000`.
- `yarn test` runs Vitest once; `yarn test:watch` reruns affected tests.
- `yarn test:ui` opens Vitest's interactive test UI.
- `yarn lint`, `yarn typecheck`, and `yarn format:check` run individual quality gates; `yarn check` runs all gates except the production build.
- `yarn build` typechecks and creates the production bundle in `dist/`; `yarn preview` serves it at `http://localhost:4173`.
- `yarn docker:dev` runs the development container.

## Coding Style & Naming Conventions

Write strict TypeScript ES modules and functional React components. Follow surrounding formatting; Prettier is authoritative. Name components and files in PascalCase (`ServiceNode.tsx`), hooks with `use` (`useCompose.tsx`), and utilities in camelCase. Prefer feature-local code under `src/features/`; expose public APIs through nearby `index.ts` files. Narrow untrusted values at YAML, storage, network, DOM, and worker boundaries; do not use `any`, blanket assertions, or disabled strict flags as migration shortcuts.

## Testing Guidelines

Vitest runs in `happy-dom`, with setup in `src/test/setup.ts` and Testing Library helpers in `src/test/utils.tsx`. Add regression tests for behavior changes. Use `.integration.test.ts` for cross-module flows and `.property.test.ts` with Fast Check for generated-input invariants. Mock network access and keep representative Compose inputs in `fixtures/`. No numeric coverage threshold is configured; cover changed paths.

## Commit & Pull Request Guidelines

Recent commits favor Conventional Commit subjects such as `feat:`, `fix:`, `refactor:`, `perf(scope):`, and `chore:`. Keep commits focused and subjects imperative. Pull requests should describe the change, link an issue (`Fixes #123`) or explain its absence, identify the change type, and include screenshots for UI work. Complete the PR checklist: test locally, run lint/build/tests, confirm no console errors, and update the package version for release-worthy changes.

## Configuration & Security

Copy `.env.example` to `.env` for local overrides. Never commit credentials or private Compose data. Treat fetched YAML, Dockerfiles, and SVG as untrusted input and retain existing validation and sanitization boundaries.
