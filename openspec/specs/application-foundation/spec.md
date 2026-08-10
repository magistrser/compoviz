# Application Foundation Specification

## Purpose

Define the supported frontend foundation, tooling, application shell, styling, quality gates, and static deployment contract for Compoviz.

## Requirements

### Requirement: Use the approved React template foundation

The project SHALL derive its application foundation from `react-template` commit `16d5dca72baaeda4fca47aa7b0e3ba5dd6866cae`, including React 19, strict TypeScript, Vite 8, React Router, SCSS, ESLint, Prettier, and the `@app` source alias, while adapting template identity and infrastructure to Compoviz.

#### Scenario: Inspect the migrated foundation

- **WHEN** a maintainer inspects application, compiler, build, lint, format, routing, and style configuration after the rewrite
- **THEN** those files implement the pinned template conventions and identify the application as Compoviz rather than React Template

#### Scenario: Exclude unrelated template infrastructure

- **WHEN** the adapted nginx and CI configuration is reviewed
- **THEN** it contains no template-specific API, websocket, camera, mail, Sentry, or unrelated product configuration unless separately required by Compoviz

### Requirement: Compile all first-party application code with strict TypeScript

The project SHALL implement first-party runtime modules, workers, shared test support, and tests as `.ts` or `.tsx` files compiled with the template's strict TypeScript options. Trust boundaries and public module interfaces SHALL use explicit types and SHALL NOT rely on `any` or disabled strictness to complete the migration.

#### Scenario: Type-check the application

- **WHEN** a maintainer runs `yarn typecheck`
- **THEN** all source and test modules pass the strict compiler configuration without emitting files

#### Scenario: Handle untrusted input

- **WHEN** YAML, remote content, browser storage, file input, or worker messages enter a typed module
- **THEN** the module validates or narrows the input before relying on its structure

#### Scenario: Inspect source extensions

- **WHEN** the migration is complete
- **THEN** no first-party JavaScript or JSX implementation or test file remains under `src/`

### Requirement: Compose the application through the template shell

The application SHALL mount from a validated `#root` element in `src/main.tsx`, use the `src/app` layer for router and provider composition, and render the Compoviz workspace through the root page at `/`.

#### Scenario: Open the root route

- **WHEN** a user navigates to `/`
- **THEN** the lazily loaded home page renders the existing Compoviz workspace inside its required providers

#### Scenario: Root element is unavailable

- **WHEN** application startup cannot find the `#root` element
- **THEN** startup fails with an explicit root-element error instead of passing a null value to React

### Requirement: Use one reproducible Yarn toolchain

The project SHALL use Yarn 4.14.1 through Corepack with the `node-modules` linker, Node.js 22.12.0 or newer, and `yarn.lock` as its only dependency lock. The documented development server SHALL bind strict port `3000`, and preview SHALL bind strict port `4173`.

#### Scenario: Install locked dependencies

- **WHEN** a maintainer runs `yarn install --immutable` with a supported Node.js version
- **THEN** Yarn installs the declared dependency graph without modifying the lockfile

#### Scenario: Start local development

- **WHEN** a maintainer runs `yarn dev` while port `3000` is available
- **THEN** Vite serves Compoviz at `http://localhost:3000`

#### Scenario: Development port is occupied

- **WHEN** a maintainer runs `yarn dev` while port `3000` is unavailable
- **THEN** Vite exits with a port error instead of selecting a different port

### Requirement: Build styles through SCSS

The project SHALL load global SCSS from the application entry point and SHALL express Compoviz global and component styles without Tailwind directives or the Tailwind Vite plugin. The rewrite SHALL retain the existing design tokens, responsive layout, fonts, states, and component class behavior.

#### Scenario: Build production styles

- **WHEN** a production build compiles global and component styles
- **THEN** Sass emits the styles without unresolved Tailwind directives or a Tailwind build dependency

#### Scenario: Use the migrated interface

- **WHEN** a user opens the workspace at a supported desktop or mobile viewport
- **THEN** the existing controls, panels, diagrams, modals, typography, colors, and interaction states remain usable and visually equivalent

### Requirement: Preserve all specified Compoviz behavior

The rewritten application SHALL continue to satisfy every requirement in the `compose-processing`, `compose-workspace`, `architecture-visualization`, `examples-gallery`, and `project-comparison` specifications, including browser persistence, asynchronous parsing, sanitized diagram rendering, remote-example error handling, and existing export filenames.

#### Scenario: Run the migrated regression suite

- **WHEN** all migrated unit, integration, component, and property tests execute
- **THEN** the tests covering the five existing capabilities pass without removed assertions or reduced generated-input coverage

#### Scenario: Restore persisted workspace data after deployment

- **WHEN** a user with valid data saved by the pre-rewrite application opens the rewritten application
- **THEN** the application restores the same Compose state, selected profiles, and environment overrides without a manual migration

### Requirement: Provide complete automated quality gates

The project SHALL provide scripts and CI jobs for immutable install, linting, formatting verification, strict type checking, the complete Vitest suite, and production build. Both GitLab CI and retained GitHub workflows SHALL invoke the same Yarn scripts and use a supported Node.js runtime.

#### Scenario: Validate a proposed change in CI

- **WHEN** a merge request or pull request triggers the applicable pipeline
- **THEN** lint, format, typecheck, test, and production-build failures prevent the quality pipeline from succeeding

#### Scenario: Run local aggregate checks

- **WHEN** a maintainer runs `yarn check`
- **THEN** linting, strict type checking, formatting verification, and the test suite run through the documented aggregate command

### Requirement: Deliver a browser-only static application

The production image SHALL build Compoviz with Yarn and serve the resulting static assets from nginx on port `80`, with SPA fallback, compression, static-asset caching, logs, and a health check. It SHALL NOT introduce a required application backend or proxy endpoint.

#### Scenario: Open the containerized application

- **WHEN** a healthy production container receives a request for the application route
- **THEN** nginx serves the Compoviz SPA and falls back to `index.html` for client-side routing

#### Scenario: Run the container without backend configuration

- **WHEN** the production image starts without API or websocket endpoint environment variables
- **THEN** the application and health check operate without configuration substitution errors

### Requirement: Present the canonical Compoviz project identity

The application and maintained project materials SHALL identify `https://github.com/magistrser/compoviz` as the canonical Compoviz repository. First-party repository links, issue links, badges, raw-content URLs, and owner-qualified deployment references SHALL NOT point to `adavesik/compoviz`.

#### Scenario: Follow a repository action from the application

- **WHEN** a user follows a Compoviz repository, star, or issue action rendered by the application
- **THEN** the action targets the corresponding resource under `magistrser/compoviz`

#### Scenario: Use maintained project instructions

- **WHEN** a maintainer inspects clone, download, release, contribution, or container deployment references in maintained project files
- **THEN** owner-qualified Compoviz resources use the `magistrser/compoviz` project identity and contain no `adavesik/compoviz` reference

### Requirement: Keep the application free of donation and advertising surfaces

The application SHALL NOT render donation controls or advertisements and SHALL NOT load or initialize third-party donation or advertising integrations. Removing monetization surfaces SHALL NOT remove functional external resources that support documented Compoviz behavior.

#### Scenario: Start the application

- **WHEN** a user loads the Compoviz application
- **THEN** no donation or advertising control is displayed and no Ko-fi or advertising-provider script is requested or initialized

#### Scenario: Use external example sources after the cleanup

- **WHEN** a user browses or opens an example backed by Docker's `awesome-compose` repository
- **THEN** the existing catalog, Compose content, and source links remain available
