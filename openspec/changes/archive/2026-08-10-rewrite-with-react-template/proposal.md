## Why

Compoviz has grown into a feature-rich application on an ad hoc JavaScript/Vite foundation, while the organization now has a maintained React template that standardizes TypeScript, project layout, formatting, routing, CI, and container delivery. Rebuilding on that foundation will make the application consistent with the supported frontend stack without sacrificing its Compose-processing and visualization capabilities.

## What Changes

- Rebase the application foundation on `react-template` commit `16d5dca72baaeda4fca47aa7b0e3ba5dd6866cae`, adopting its React 19, strict TypeScript, Vite 8, React Router, SCSS, ESLint, and Prettier conventions.
- Reorganize application composition around `src/app`, `src/pages`, shared components, and global styles while retaining feature/domain modules where their boundaries remain useful.
- Convert all first-party runtime code, workers, utilities, models, hooks, components, and tests from JavaScript/JSX to TypeScript/TSX and introduce explicit types at Compose AST, parser, worker-message, state, and UI boundaries.
- Preserve every behavior defined by the existing `compose-processing`, `compose-workspace`, `architecture-visualization`, `examples-gallery`, and `project-comparison` specifications, including offline/browser-only operation and existing sanitization boundaries.
- Retain and migrate the Vitest, Testing Library, happy-dom, and Fast Check test suite even though the source template does not include a test stack.
- Adapt the template's Yarn, GitLab CI, Docker, and nginx assets for Compoviz; omit template-specific proxy endpoints and environment variables that do not belong to this browser-only application.
- Update contributor and deployment documentation to the resulting commands and layout.
- **BREAKING**: replace npm and `package-lock.json` with Yarn 4 and `yarn.lock`; local development requires Corepack and Node.js 22.12.0 or newer.
- **BREAKING**: align the Vite development server with the template's strict port `3000` instead of `5173`.

## Capabilities

### New Capabilities

- `application-foundation`: Defines the template-derived TypeScript application shell, package/build/quality toolchain, routing and styling conventions, and browser-only CI/container delivery contract.

### Modified Capabilities

None. The rewrite changes implementation and contributor/deployment tooling, while all existing product capability requirements remain unchanged and serve as migration parity gates.

## Impact

- Affects nearly all first-party source and test files under `src/`, plus entry points, styles, build and lint configuration, dependency metadata, CI, container/nginx assets, and developer documentation.
- Changes the package-manager workflow and development-server address for contributors and CI jobs.
- Introduces TypeScript, React Router, Sass, and Prettier while upgrading the Vite/React plugin toolchain to the template baseline; existing visualization, parsing, analytics, test, and property-testing dependencies remain where required.
- Keeps the public browser experience, Compose data model semantics, local-storage compatibility, downloadable outputs, network access patterns, and production port `80` compatible with the current application.
- Requires staged migration and parity verification because a one-shot file replacement would put parser correctness, Web Worker behavior, local persisted state, remote example loading, and diagram sanitization at risk.
