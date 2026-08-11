## ADDED Requirements

### Requirement: Deploy the static application to GitHub Pages

The project SHALL provide an automated GitHub Pages deployment for the canonical repository that builds Compoviz with the locked Yarn toolchain, publishes the `dist/` artifact beneath `/compoviz/`, and does not require an application backend or initialize Vercel Analytics.

#### Scenario: Deploy the main branch

- **WHEN** a commit is pushed to `main` or a maintainer manually dispatches the Pages workflow
- **THEN** GitHub Actions installs dependencies immutably, builds the application with the `/compoviz/` base, and deploys `dist/` to the `github-pages` environment

#### Scenario: Open the repository-scoped Pages site

- **WHEN** a user opens the application at the repository-scoped GitHub Pages URL
- **THEN** the root workspace, runtime public assets, lazy modules, and web workers load beneath `/compoviz/` without requiring a backend

#### Scenario: Build outside GitHub Pages

- **WHEN** a maintainer starts local development or builds without a Pages base override
- **THEN** the application continues to use `/` as its asset and router base for local preview and container hosting

#### Scenario: Load the Pages deployment without Vercel Analytics

- **WHEN** the GitHub Pages production bundle starts in a browser
- **THEN** the application does not initialize the Vercel Analytics component
