## Context

Compoviz is a browser-only React 19/Vite application with 137 JavaScript/JSX source files and 37 colocated Vitest files. Its durable behavior is already described by five OpenSpec capabilities covering Compose processing, the editing workspace, architecture visualization, examples, and comparison. The application also contains sensitive boundaries that must survive a rewrite: untrusted YAML and Dockerfile parsing, worker serialization, fetched remote content, sanitized SVG insertion, local-storage restoration, and file downloads.

The target `react-template` was inspected at commit `16d5dca72baaeda4fca47aa7b0e3ba5dd6866cae`. It supplies React 19.2.4, TypeScript 5.9 with strict compiler options, Vite 8, Yarn 4.14.1 using the `node-modules` linker, React Router 7, SCSS, ESLint, Prettier, an `@app` alias, an `app/pages/styles` shell, GitLab quality jobs, and an nginx container. It is intentionally minimal: it has no testing setup or Compoviz dependencies, and its nginx file contains proxy routes for unrelated products. The template is therefore a baseline to adapt, not a tree to copy without review.

## Goals / Non-Goals

**Goals:**

- Move every first-party application and test module to strict TypeScript/TSX.
- Adopt the template's package manager, application shell, routing, styling, formatting, linting, CI, and container conventions where they apply to Compoviz.
- Preserve all existing OpenSpec behavior, visual workflows, persisted browser data, files, public asset URLs, and security boundaries.
- Keep parsing and Graphviz work off the UI thread and make their cross-thread protocols explicit and type-safe.
- Leave the repository with one reproducible dependency lock, one documented command set, and automated lint, format, type, test, and build gates.
- Make the migration reviewable and bisectable instead of replacing the application in one opaque step.

**Non-Goals:**

- Redesigning the UI, changing Compose semantics, adding product features, or changing existing OpenSpec requirements.
- Introducing a backend, server-side rendering, API proxying, a new state-management library, or a new component library.
- Replacing Graphviz, React Flow, js-yaml, Vercel Analytics, Vitest, Testing Library, happy-dom, or Fast Check merely because they are absent from the template.
- Copying template branding, Sentry placeholders, internal registry assumptions, or product-specific nginx proxy routes.
- Changing local-storage keys/schema or exported filenames unless a separate behavior change specifies a migration.

## Decisions

### 1. Pin the template snapshot and document adaptations

Commit `16d5dca72baaeda4fca47aa7b0e3ba5dd6866cae` is the reproducible baseline. Compoviz will adopt the template's general-purpose files and conventions, but every copied artifact will be renamed and reduced to the needs of this product. In particular, CI uses `compoviz` as the project identity and nginx serves only the static SPA with history fallback, compression, cache policy, and the existing health check.

Using an unpinned template branch was rejected because the migration could change while it is in progress. Copying the template verbatim was rejected because it would remove tests and import unrelated backend proxy surfaces.

### 2. Migrate in place behind existing behavioral contracts

The rewrite will happen inside this repository. The existing OpenSpec specs, fixtures, assets, tests, Compose samples, deployment identity, and Git history remain authoritative. Modules will be converted in dependency order, with tests kept green at each boundary; old `.js`/`.jsx` modules are removed as their typed replacements land. There will be no long-lived parallel application or second source root.

Creating a fresh repository and porting features afterward was rejected because it makes omissions difficult to detect and loses a useful regression baseline.

### 3. Use the template shell and extend it with Compoviz feature layers

The target composition is:

```text
src/
├── app/                 # App component, providers, router, route constants
├── pages/home/          # Root page that composes the Compoviz workspace
├── components/          # Cross-feature reusable UI
├── features/            # Editor, diagram, code preview, sidebar
├── context/ and hooks/  # Existing state boundaries, typed
├── models/              # Compose AST and domain contracts
├── utils/ and workers/  # Parsing, rendering, remote loading, worker protocols
├── data/ and constants/ # Catalogs and supporting data
├── test/                # Shared test setup/helpers
└── styles/              # Global SCSS and design tokens
```

`src/main.tsx` performs root validation and mounts the app in `StrictMode`. `src/app/index.tsx` owns `BrowserRouter` and the existing provider stack. The `/` route lazy-loads `HomePage`, which renders the current workspace layout. This follows the template without flattening useful Compoviz domain and feature boundaries.

Collapsing everything into the template's four minimal directories was rejected because a starter layout is not sufficient for this application's parser and editor modules.

### 4. Convert domain and trust boundaries before leaf UI modules

TypeScript migration proceeds from low-level contracts upward: Compose input/AST types and parser results; normalization/export/query utilities; parser and Graphviz worker request/response unions; reducers, hooks, and contexts; feature components; then the application shell. Untrusted YAML, fetched JSON/text, local storage, DOM/file APIs, and worker events enter as `unknown` or platform types and are narrowed before use. Public module contracts receive explicit types; `any`, blanket assertions, and disabling strict flags are not migration shortcuts.

Worker messages use discriminated unions with request IDs and serializable payloads. Pending requests retain their existing timeout, rejection, and terminate behavior. Local persisted data keeps its existing keys and shape; types describe it without silently changing it.

Converting files alphabetically was rejected because leaf UI types depend on stable domain and state contracts. Temporarily weakening the template's strict compiler configuration was rejected because it defers the highest-risk work and makes completion ambiguous.

### 5. Adopt Yarn 4 and the template quality toolchain, while retaining tests

`package.json`, `.yarnrc.yml`, `.prettierrc`, `eslint.config.js`, `tsconfig.json`, and `vite.config.ts` follow the template. The package is named `compoviz`, declares `packageManager: yarn@4.14.1`, requires Node `>=22.12.0`, and uses the `node-modules` linker. Runtime and test packages Compoviz actually uses remain dependencies. Vite keeps required chunking and Vitest configuration while adding the `@app` alias, strict port `3000`, and template preview port `4173`.

Scripts include `dev`, `build`, `preview`, `lint`, `typecheck`, `format`, `format:check`, `test`, `test:watch`, `test:ui`, and aggregate `check`. `check` covers lint, type checking, formatting, and tests; production build remains a separate explicit gate. `yarn.lock` becomes the only dependency lock after an immutable install succeeds.

Retaining npm in parallel was rejected because two lockfiles permit dependency drift. Dropping tests to match the template was rejected because migration parity cannot be established without them.

### 6. Replace Tailwind processing with SCSS without redesigning the UI

The template's Sass pipeline and global SCSS entry replace the Tailwind Vite plugin. Existing design tokens, reset rules, utilities, animations, and component styles are translated to SCSS/CSS rules, including expansion of current `@apply` usage. Component-local `.css` files become `.scss`; selectors, class names, responsive behavior, fonts, colors, and interaction states remain visually compatible. The generated bundle no longer depends on Tailwind directives or its Vite plugin.

Keeping Tailwind alongside SCSS was rejected because it would not actually adopt the template styling foundation and would leave two global styling systems. A visual redesign was rejected as unrelated scope that would make parity review unreliable.

### 7. Treat current specs and regression tests as acceptance gates

All tests are renamed to `.test.ts`/`.test.tsx` and typed without reducing assertions or generated-input coverage. Vitest continues to run in happy-dom with the existing setup and Testing Library helpers. New foundation tests cover root mounting/routing, application provider composition, worker message typing/behavior where runtime tests add value, and continued loading of the workspace at `/`.

Migration completion requires `yarn lint`, `yarn typecheck`, `yarn format:check`, `yarn test`, and `yarn build` to pass. Tests for all five existing OpenSpec capabilities are the feature-parity proof; manual visual smoke testing covers the main workspace, builder, diagrams, examples modal, comparison, import/export, and responsive layout.

### 8. Adapt CI and static delivery without changing hosting behavior

The template's GitLab pipeline is added with immutable install and separate lint, format, typecheck, test, and build jobs. Existing GitHub CI and image workflows are retained and converted to Corepack/Yarn so the public repository and GHCR release path continue to work. CI runtimes use a Node version satisfying the template baseline and cache by `yarn.lock`.

The multi-stage Dockerfile uses Yarn for the build and nginx for production. The nginx configuration keeps SPA history fallback, static caching, gzip, IPv4/IPv6 port 80, logs, and the current health check, but has no `/api`, websocket, camera, mail, or other template proxy locations. Existing Compose deployment and Vercel static configuration remain compatible.

Replacing existing delivery with the template's internal registry assumptions was rejected because registry migration was not requested. Keeping npm-based GitHub automation was rejected because it would fail once `package-lock.json` is removed.

## Risks / Trade-offs

- [Strict typing exposes ambiguous Compose shapes across many modules] → Define a permissive-but-explicit recursive Compose value model, narrow at behavioral boundaries, and migrate domain modules before UI consumers.
- [A large rename can hide behavior regressions] → Convert in dependency-sized slices, preserve file-local tests, review exact diffs, and run narrow tests before the full parity suite.
- [SCSS conversion can subtly change layout or interaction states] → Preserve selectors and tokens, expand each Tailwind utility deliberately, and capture desktop/mobile screenshots for before/after comparison during implementation.
- [Vite 8 or worker URL changes can break production-only bundling] → Keep the `new URL(..., import.meta.url)` worker pattern, add production build smoke checks, and test both parser and Graphviz worker paths.
- [React Router can make static hosting return 404 for direct navigation] → Configure nginx history fallback and verify the root route in both Vite preview and the container.
- [Yarn/Node changes can disrupt contributors and release automation] → Pin Yarn through `packageManager`, require Corepack, update every documented/automated command in the same change, and verify immutable installation from a clean workspace.
- [Template dependencies advance while implementation is underway] → Use the pinned snapshot for this rewrite; future template updates are separate dependency changes.
- [Keeping both GitLab and GitHub CI duplicates maintenance] → Use the same package scripts as the shared contract so pipeline definitions stay thin and consistent.

## Migration Plan

1. Capture a baseline by running the current tests, lint, and build; inventory runtime entry points, workers, persistent storage keys, assets, environment variables, and public flows.
2. Introduce the template-derived Yarn/TypeScript/Prettier/ESLint/Vite configuration and generate `yarn.lock`, while temporarily allowing the existing entry point only for the shortest viable migration interval.
3. Define Compose, AST, parser, diagnostics, persistence, and worker protocol types; convert models and utility layers with their tests.
4. Convert workers, reducers, hooks, contexts, data modules, feature components, shared UI, and colocated tests in dependency order.
5. Add the template application/router/page shell, move the provider composition into it, and switch `index.html` to `src/main.tsx`.
6. Translate global and component styles to SCSS, remove Tailwind processing, and verify visual parity at supported viewport sizes.
7. Adapt GitLab CI, existing GitHub automation, Docker/nginx, Compose, Vercel configuration, and documentation to Yarn and the new ports/layout.
8. Remove superseded JavaScript/JSX/CSS files, npm lock/configuration, and unused dependencies only after their replacements pass focused checks.
9. Run the complete quality/build gates, strict OpenSpec validation, container and Vite-preview smoke tests, and manual parity checks for all major workflows.

Rollback is a normal Git revert of the migration commits before release. No server data migration is involved. Because browser storage schemas and keys remain compatible, reverting the deployed static assets does not require user-data repair. The package-lock removal and port change must land atomically with the corresponding automation and documentation updates.

## Open Questions

None required to begin implementation. The template snapshot, package manager, target ports, feature-parity boundary, CI strategy, and deployment adaptations are fixed by this design; any later product behavior or registry change should be proposed separately.
