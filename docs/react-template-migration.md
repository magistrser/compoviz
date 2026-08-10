# React Template Migration Record

This document is supporting migration evidence. OpenSpec remains the source of truth for behavioral requirements.

## Source baselines

- Compoviz baseline commit: `9303fc0600294e6d38e4ed7348837bdb53e128e7`
- React template: `https://gitlab.office.st-falcon.ru/street-falcon/ui/research/react-template.git`
- Adopted template commit: `16d5dca72baaeda4fca47aa7b0e3ba5dd6866cae`
- Baseline runtime: Node.js `v24.15.0`, npm `11.12.1`
- Target runtime: Node.js 22.12.0 or newer, Yarn 4.14.1 through Corepack

The template commit is pinned so the rewrite does not drift with its `main` branch. General-purpose TypeScript, Vite, routing, SCSS, formatting, CI, and container conventions are adopted; template branding, Sentry placeholders, registry assumptions, and unrelated nginx proxy routes are excluded.

## Pre-migration automated baseline

Captured on 2026-08-10 after `npm ci` from the committed lockfile:

| Command | Result |
| --- | --- |
| `npm run lint` | Passed |
| `npm run build` | Passed with Vite 7.3.0; emitted parser and Graphviz worker chunks |
| `npm test` | 36 test files passed, 1 failed; 457 tests passed, 1 failed |

The sole pre-existing failure is the timing assertion in `src/utils/objectUtils.bench.test.js` under “Large Dataset (100 nodes) / no changes scenario”. It observed `-1.19%` improvement and expected a value greater than zero. This benchmark is machine-load-sensitive; functional, integration, component, and property tests passed. The build also reports the pre-existing Vite deprecation for `import.meta.glob({ as: 'url' })`.

## Compatibility inventory

### Browser storage

- `docker-compose-state`: reducer state serialized as JSON.
- `docker-compose-active-profiles`: active profile list serialized as JSON.
- `docker-compose-environment`: environment override map serialized as JSON.
- `suggestions-enabled`: boolean serialized as JSON.
- `lastSeenAnnouncementVersion`: plain version string.

### Environment and network boundaries

- `VITE_DISABLE_VERCEL_ANALYTICS` controls analytics rendering and remains supported for self-hosting.
- Awesome Compose catalog: `https://api.github.com/repos/docker/awesome-compose/contents`.
- Awesome Compose content and Dockerfiles: `https://raw.githubusercontent.com/docker/awesome-compose/master`.
- Page metadata and fonts are external static requests; the rewrite must not introduce an application backend.

### Worker entry points and protocols

- Parser worker: `src/workers/parserWorker.js`, created by `src/utils/workerManager.js`; messages use `parse`, `parse_success`, and `parse_error` with numeric request IDs.
- Graphviz worker: `src/utils/graphvizWorker.js`, created by `src/utils/graphvizRenderer.js`; requests contain `{ id, dot }` and responses contain `{ id, ok, svg }` or `{ id, ok, error, fatal }`.

Both worker URLs use `new URL(..., import.meta.url)` and must continue to produce independent production chunks.

### Public outputs and assets

- Compose download: `docker-compose.yml`.
- Rendered diagram download: `docker-compose-diagram.svg`.
- Builder download: `docker-compose-builder.svg`.
- Service icons remain under `src/assets/icons/services/*.svg`; general static content remains under `public/`.
- Docker image identity remains `ghcr.io/magistrser/compoviz`; production listens on port `80`, with the documented Compose mapping `8080:80`.

## Visual baseline

Captured with `browser-use` against the baseline Vite server at `http://127.0.0.1:5173/`:

- [Desktop empty workspace](screenshots/pre-migration-empty-workspace.png)
- [Desktop demo editor](screenshots/pre-migration-editor-demo.png)
- [Desktop visual builder](screenshots/pre-migration-build-demo.png)
- [Desktop live diagram](screenshots/pre-migration-view-demo.png)
- [Desktop comparison workspace](screenshots/pre-migration-compare.png)
- [Desktop comparison results](screenshots/pre-migration-compare-results.png)
- [Desktop examples gallery](screenshots/pre-migration-examples.png)
- [Mobile empty workspace](screenshots/pre-migration-mobile.png)

Smoke-test results:

- Imported `fixtures/inline-content-demo.yml` into the main editor; the service, secret, config, and YAML content appeared.
- Loaded the bundled demo, added `baseline-service`, then verified Undo removed it and Redo restored it.
- Opened the visual builder and observed two rendered React Flow nodes for the demo.
- Opened the live diagram and observed rendered SVG with zero nested `<script>` elements.
- Opened the curated examples gallery and verified all eight cards and category controls were visible.
- Loaded `docker-compose.v1.yml` and `docker-compose.v2.yml` in Compare; one port conflict and six shared-resource information findings appeared with the combined diagram.
- Downloaded `docker-compose.yml` and `docker-compose-diagram.svg` to a temporary directory and verified their file types.
- At 390×844, the empty workspace had `scrollWidth === clientWidth === 390`, so no page-level horizontal overflow was present.

## Migrated foundation

The rewritten application uses Node.js 22.12.0 or newer, Corepack, Yarn 4.14.1, React 19, strict TypeScript 5.9, Vite 8, React Router 7, and SCSS. Local development runs at `http://localhost:3000`; production preview runs at `http://localhost:4173`.

Install and validate the immutable dependency graph with:

```bash
corepack enable
yarn install --immutable
yarn check
yarn build
```

The application shell is under `src/app`, the lazy root page is under `src/pages/home`, and nginx remains a static-only SPA server on container port 80. The pre-rewrite npm commands and JavaScript paths above are intentionally retained as historical baseline evidence.

## Post-migration parity

Captured with `browser-use` against the production preview at `http://127.0.0.1:4173/`:

- [Desktop empty workspace](screenshots/post-migration-empty-workspace.png)
- [Desktop demo editor](screenshots/post-migration-editor-demo.png)
- [Desktop visual builder](screenshots/post-migration-build-demo.png)
- [Desktop live diagram](screenshots/post-migration-view-demo.png)
- [Desktop comparison workspace](screenshots/post-migration-compare.png)
- [Desktop comparison results](screenshots/post-migration-compare-results.png)
- [Desktop examples gallery](screenshots/post-migration-examples.png)
- [Mobile empty workspace](screenshots/post-migration-mobile.png)

The migrated app retained the baseline interactions: fixture import, demo loading, add/undo/redo, two-node visual builder, sanitized Graphviz SVG, eight curated examples, the one-error/six-info comparison result, three-project cap, and YAML/SVG export filenames. Both worker chunks loaded in the browser. At 390×844, the settled mobile layout had `scrollWidth === clientWidth === 390`.
