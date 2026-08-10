## Why

Compoviz still identifies and promotes the upstream `adavesik/compoviz` repository even though this project is maintained at `magistrser/compoviz`. The application also loads a third-party Ko-fi donation widget, which conflicts with the desired ad- and donation-free product experience and adds an unnecessary external runtime request.

## What Changes

- Replace every first-party link and repository-derived reference to `adavesik/compoviz` with the canonical `https://github.com/magistrser/compoviz` project identity, including application navigation, documentation, contribution guidance, release metadata, and deployment image/download examples.
- Remove the Ko-fi donation widget, its initialization code, and widget-specific styling from the application.
- Ensure the rendered application contains no donation controls, advertisements, or advertising integrations and does not load donation or advertising scripts at runtime.
- Preserve functional external references that are not upstream-project promotion, such as Docker's `awesome-compose` example sources, and keep the existing optional Vercel analytics behavior unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `application-foundation`: Define the canonical project identity used by the application and require an ad- and donation-free application shell.

## Impact

- Application shell and shared layout surfaces: `index.html`, `src/components/MainLayout.tsx`, `src/components/Footer.tsx`, and related styles/tests.
- Repository-facing documentation and metadata: `README.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `.github/` release notes, and migration documentation.
- Deployment references: `compose/docker-compose.yml` and documented GitHub Container Registry/raw-content commands.
- No Compose parsing, visualization, workspace, comparison, or examples-gallery contract changes are intended.
