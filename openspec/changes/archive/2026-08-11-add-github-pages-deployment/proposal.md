## Why

Compoviz is a browser-only static application, but its current root-relative assets and router configuration prevent it from running correctly from a GitHub Pages project path. Providing a maintained Pages deployment gives users a hosted application without requiring a container or backend.

## What Changes

- Make Vite asset URLs and React Router navigation work beneath the repository-scoped `/compoviz/` path used by GitHub Pages.
- Make runtime references to public assets honor Vite's configured base URL.
- Add a GitHub Actions workflow that builds the locked Yarn project and deploys `dist/` to GitHub Pages from `main` or by manual dispatch.
- Disable Vercel-specific analytics in the GitHub Pages build.
- Add regression coverage for base-path routing and verify the emitted Pages bundle.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `application-foundation`: Extend the browser-only static deployment contract to include repository-scoped GitHub Pages hosting.

## Impact

- Build configuration in `vite.config.ts`.
- Router composition and public asset resolution in `src/app` and `src/components`.
- GitHub Actions configuration under `.github/workflows/`.
- Application-foundation tests and production build verification.
