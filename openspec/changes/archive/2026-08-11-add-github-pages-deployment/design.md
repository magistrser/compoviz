## Context

Compoviz already produces a static Vite bundle and has no required backend. Local development and the nginx image serve that bundle at `/`, while a standard GitHub Pages project site serves it at `/compoviz/`. The current Vite default base, `BrowserRouter`, and runtime `/logo.png` reference all assume root hosting. Existing GitHub workflows validate the application and publish a container, but none publishes `dist/` to Pages.

## Goals / Non-Goals

**Goals:**

- Publish the canonical repository's `main` branch to GitHub Pages using the locked Node/Yarn toolchain.
- Make built modules, workers, public assets, and routing function under `/compoviz/`.
- Preserve root-hosted local development, preview, and container behavior.
- Keep the Pages deployment browser-only and free of Vercel-specific analytics requests.

**Non-Goals:**

- Add a backend, server-side rendering, or a GitHub Pages fallback for future nested SPA routes.
- Replace the existing CI, container image, or Vercel deployment paths.
- Automate repository Settings → Pages configuration, which remains a one-time repository setting.

## Decisions

### Select the Vite base with an explicit build environment variable

`vite.config.ts` will use `VITE_BASE_PATH` when supplied and default to `/`. The Pages workflow will set it to `/compoviz/`; ordinary development and production builds will keep root hosting.

Hard-coding `/compoviz/` was rejected because it would break the documented root route for local and container deployments. Inferring the base from `GITHUB_ACTIONS` was rejected because all GitHub Actions builds, including CI-only builds, would unexpectedly produce Pages-specific output.

### Use the Vite base as the React Router basename

`BrowserRouter` will receive `import.meta.env.BASE_URL` as its basename. This retains clean URLs and makes the existing `/` application route resolve beneath the deployment prefix. `HashRouter` was rejected because the current application has only its root route and does not need hash-based history fallback.

### Resolve runtime public assets through `BASE_URL`

Vite rewrites build-managed HTML and module assets, but a literal JSX string such as `/logo.png` remains root-relative at runtime. The logo URL will be constructed from `import.meta.env.BASE_URL` so it follows the same deployment prefix.

### Deploy `dist/` with GitHub's Pages actions

A dedicated workflow will run on pushes to `main` and manual dispatch. It will enable Corepack, install with `yarn install --immutable`, build with the Pages base and disabled Vercel analytics, upload `dist/`, and deploy it using the `github-pages` environment. The workflow will request only `contents: read`, `pages: write`, and `id-token: write` permissions.

## Risks / Trade-offs

- [A future nested client route is opened directly and GitHub Pages returns 404] → Keep this change scoped to the current root-only router; add a Pages 404 strategy or switch to hash routing when nested routes are introduced.
- [A fork uses a different repository name] → The workflow's canonical `/compoviz/` base targets this repository; fork maintainers can override the environment value.
- [Pages is not enabled in repository settings] → Document the required one-time selection of GitHub Actions as the Pages source in the handoff.
- [Root deployment behavior regresses] → Default the base to `/` and cover both root and repository-prefixed route matching in tests.
