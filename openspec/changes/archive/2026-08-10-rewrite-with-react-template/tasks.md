## 1. Baseline and Migration Inventory

- [x] 1.1 Run the current npm lint, complete Vitest suite, and production build; record any pre-existing failures before changing the toolchain.
- [x] 1.2 Inventory browser-storage keys and shapes, Vite environment variables, worker entry points/messages, public asset paths, download filenames, and remote network calls that must remain compatible.
- [x] 1.3 Capture desktop and mobile reference screenshots and smoke-test notes for import, edit, build, diagram, examples, comparison, undo/redo, and export workflows.
- [x] 1.4 Record the adopted template source and commit in supporting documentation so future updates can be compared against `16d5dca72baaeda4fca47aa7b0e3ba5dd6866cae`.

## 2. Template Toolchain Foundation

- [x] 2.1 Adapt `package.json` to Compoviz with Yarn 4.14.1, Node `>=22.12.0`, the template dependencies, retained runtime/test dependencies, and the full dev/build/check/test script contract.
- [x] 2.2 Add the template-derived `.yarnrc.yml`, enable Corepack, generate `yarn.lock`, prove `yarn install --immutable`, and remove `package-lock.json` only after the immutable install succeeds.
- [x] 2.3 Add the strict template `tsconfig.json`, including DOM, Vite, Vitest, Testing Library, worker, and `@app` alias typing required by this application.
- [x] 2.4 Replace `vite.config.js` with typed template-derived Vite 8 configuration that preserves React, vendor chunking, Vitest/happy-dom setup, the `@app` alias, strict dev port `3000`, and strict preview port `4173`.
- [x] 2.5 Adapt the template ESLint and Prettier configurations for TypeScript/TSX, tests, workers, and configuration files without weakening strict compiler rules.
- [x] 2.6 Update ignore files for Yarn state, TypeScript build info, coverage/test artifacts, and the resulting Docker build context.

## 3. Domain Contracts and Compose AST

- [x] 3.1 Define shared TypeScript contracts for Compose documents, services, networks, volumes, secrets, configs, port/volume forms, recursive extension values, parser diagnostics, and parser results.
- [x] 3.2 Convert `ComposeAST`, normalization, AST query/export modules, and their unit tests to TypeScript while preserving serialized shapes and export behavior.
- [x] 3.3 Convert shared object, YAML, validation, and port-extraction utilities and tests; narrow parsed or external values before use.
- [x] 3.4 Convert static data catalogs, templates, announcements, constants, and service-icon resolution to typed modules without changing catalog order, values, or public asset URLs.
- [x] 3.5 Run the focused AST, YAML, validation, and object/port test groups and fix type discoveries without changing Compose behavior.

## 4. Compose Processing Pipeline and Workers

- [x] 4.1 Convert variable interpolation and profile filtering modules plus their unit/property tests to typed contracts.
- [x] 4.2 Convert path, include, and extends resolution modules plus their unit tests, preserving missing-file and cycle diagnostics.
- [x] 4.3 Convert Dockerfile parsing, fetching, and enrichment modules plus unit/integration/property tests, preserving explicit-Compose precedence and mocked network boundaries.
- [x] 4.4 Convert Compose parser orchestration, flow conversion, suggestions, and related unit/integration tests to TypeScript.
- [x] 4.5 Define discriminated, serializable parser worker request/success/error messages and convert the parser worker and worker manager while preserving lazy startup, fallback, timeout, error, and termination behavior.
- [x] 4.6 Run all compose-processing, Dockerfile, and worker tests and verify a production build emits the parser worker chunk correctly.

## 5. State, Persistence, and Project Workflows

- [x] 5.1 Convert the Compose reducer/provider and its actions/state/selectors to TypeScript without changing local-storage keys or serialized state shape.
- [x] 5.2 Convert history, file import, project actions, and profile-related hooks with typed browser/file APIs and the existing 50-transition undo/redo contract.
- [x] 5.3 Convert the UI context and shared toast/provider state with explicit context value and component prop types.
- [x] 5.4 Convert multi-project state, comparison utilities, `CompareView`, and their tests while retaining the three-project limit and conflict semantics.
- [x] 5.5 Add or migrate regression coverage proving pre-rewrite persisted data restores and parser-worker failure still falls back safely.

## 6. Visualization and Feature UI

- [x] 6.1 Convert Graphviz generation/rendering, Graphviz worker integration, SVG sanitization, icon helpers, and their unit/property tests to TypeScript.
- [x] 6.2 Convert diagram components and edge/node registries, preserving sanitized insertion, pan/zoom/reset, export, conflict highlighting, and worker behavior.
- [x] 6.3 Convert visual-builder configuration panels, canvas components, and tests with typed React Flow nodes, edges, callbacks, and resource updates.
- [x] 6.4 Convert editor feature components for services, networks, volumes, secrets, and configs, retaining supported fields and validation feedback.
- [x] 6.5 Convert sidebar, code-preview, profile, issue, resource-tree, and toolbar components and their tests to typed props and state.
- [x] 6.6 Convert examples-gallery data/loading modules, cards/modals, and unit/integration/property tests while preserving catalog caching, filtering, retries, and accessible modal behavior.
- [x] 6.7 Convert remaining shared UI primitives, layout, empty/error states, announcements, footer, and colocated component tests without changing accessibility or interaction behavior.

## 7. Template Application Shell and Styles

- [x] 7.1 Add `src/main.tsx` with explicit root validation and global SCSS loading, and create `src/app` with the existing provider stack inside `BrowserRouter`.
- [x] 7.2 Add typed route constants/router and a lazy `src/pages/home` route that renders the Compoviz main workspace at `/`, with a test for root-route composition.
- [x] 7.3 Translate `src/index.css` design tokens, reset, utilities, animations, responsive rules, and every Tailwind `@apply` expansion into `src/styles/global.scss`.
- [x] 7.4 Convert component CSS files to SCSS, update imports, and remove the Tailwind Vite plugin/dependency after proving no Tailwind directives remain.
- [x] 7.5 Adapt `index.html` metadata, language, icons, fonts, and entry script to Compoviz and `src/main.tsx` without copying template branding.
- [x] 7.6 Compare the migrated application with baseline screenshots on desktop and mobile and correct material layout, typography, color, state, or interaction regressions.

## 8. CI, Container, and Hosting

- [x] 8.1 Add a template-derived `.gitlab-ci.yml` for immutable install, lint, format check, typecheck, tests, and build using Compoviz identity and no unrelated registry/Sentry variables.
- [x] 8.2 Convert retained GitHub CI and Docker-image workflows from npm to Corepack/Yarn, supported Node versions, and `yarn.lock` cache keys.
- [x] 8.3 Adapt the multi-stage Dockerfile to immutable Yarn build and create a Compoviz nginx configuration with SPA fallback, gzip, static caching, logs, port `80`, and the existing health check.
- [x] 8.4 Verify nginx has no template API/websocket/product proxy routes and that Docker Compose and Vercel deployment configuration remain compatible.
- [x] 8.5 Build the production image and smoke-test its health endpoint, root SPA response, static assets, history fallback, and startup without backend environment variables.

## 9. Documentation and Cleanup

- [x] 9.1 Update README, CONTRIBUTING, AGENTS, `.nvmrc`, environment setup, and command examples for Yarn/Corepack, Node requirements, port `3000`, strict TypeScript, SCSS, and the target layout.
- [x] 9.2 Update Docker/self-hosting and CI documentation while retaining the public image name, production port, environment behavior, and Compose examples.
- [x] 9.3 Remove superseded `.js`, `.jsx`, and component `.css` files, npm/Tailwind configuration, obsolete entry points, and unused dependencies only after replacement coverage passes.
- [x] 9.4 Confirm no first-party `.js`/`.jsx` remains under `src/`, no Tailwind directive/plugin remains, no duplicate lockfile exists, and no React Template branding or unrelated infrastructure was introduced.

## 10. Final Parity and Validation

- [x] 10.1 Run focused raw test commands for any failures discovered during migration, then run `yarn lint`, `yarn typecheck`, `yarn format:check`, and the complete `yarn test` suite.
- [x] 10.2 Run `yarn build` and `yarn preview`, verify parser and Graphviz workers load, and smoke-test all five existing OpenSpec capability flows in the browser.
- [x] 10.3 Verify import/export filenames, remote example error handling, SVG sanitization, local-storage restoration, comparison limits/conflicts, and undo/redo against the pre-rewrite baseline.
- [x] 10.4 Run `openspec validate rewrite-with-react-template --strict` and resolve every validation error before marking the implementation complete.
- [x] 10.5 Review the final exact Git diff and status to ensure generated output, private Compose data, template-only infrastructure, and unrelated user changes are absent.
