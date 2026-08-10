## Context

The configured Git remote identifies `https://github.com/magistrser/compoviz` as this project's canonical repository, but the application shell, documentation, release metadata, and deployment examples still reference `adavesik/compoviz`. Separately, `index.html` loads and initializes a Ko-fi overlay at startup, and global styles retain a selector for that widget. The cleanup crosses runtime markup, React layout components, styles, documentation, and deployment configuration, so it needs a bounded repository-wide audit rather than a single link edit.

The browser-only architecture, functional third-party example links, external font loading, and optional Vercel analytics behavior must remain intact. No replacement donation or advertising provider is desired.

## Goals / Non-Goals

**Goals:**

- Make `magistrser/compoviz` the sole first-party repository identity in runtime UI, maintained documentation, release metadata, and repository-derived deployment references.
- Remove donation and advertising UI, initialization, external script loading, and provider-specific styles from the application.
- Add focused regression coverage and static audits that catch stale upstream identity or monetization references.

**Non-Goals:**

- Removing functional third-party links or data sources, including Docker's `awesome-compose` catalog and source links.
- Removing or changing Vercel analytics, which is telemetry rather than an advertising surface.
- Changing application features, visual design beyond removal of promotional UI, Compose behavior, routes, or persistence.
- Introducing a configurable repository URL, monetization substitute, consent system, or backend.

## Decisions

### Use the configured origin as the canonical identity

All first-party GitHub links and owner-qualified repository-derived references will use `magistrser/compoviz`; GitHub Container Registry and raw-content examples will use the same owner when their current value is tied to the upstream project. Runtime links will continue to open securely in a new tab where they already do.

This direct replacement is preferred over retaining upstream redirects or adding runtime configuration because the project has one known identity and no multi-branding requirement. Replacements will be constrained to the old owner/repository identity so Docker-owned example links and general GitHub contribution instructions remain unchanged.

### Remove monetization integrations at their source

The Ko-fi script tag and inline initializer will be deleted from `index.html`, and the now-unused widget-specific style will be removed. No placeholder, hidden control, lazy loader, or replacement advertising/donation integration will be introduced.

Removing the source markup is preferred over disabling the widget with CSS or configuration because it guarantees that the third-party script is not requested and no inaccessible hidden promotional UI remains.

### Treat analytics and functional external resources as separate concerns

The existing Vercel analytics import and `VITE_DISABLE_VERCEL_ANALYTICS` switch will remain unchanged. External fonts and `awesome-compose` API/source links will also remain because they provide application functionality or presentation and are not advertisements or donation mechanisms.

This explicit boundary reduces the risk that a broad external-URL cleanup removes supported behavior beyond the user's request.

### Verify both source identity and rendered behavior

Implementation verification will combine an exact repository-wide search for the legacy identity and monetization-provider strings with targeted component assertions for repository links. A browser smoke test will confirm that the workspace loads without promotional controls, Ko-fi requests, console errors, or layout regressions. The standard quality and production-build gates will prove that source/style removal leaves no broken imports or output.

## Risks / Trade-offs

- [Canonical GHCR package may not yet be published under the current owner] → Align all declared image references with the project identity and flag package publication as an operational prerequisite rather than silently retaining the upstream image.
- [A broad URL replacement could alter Docker example sources or generic contributor instructions] → Match the exact `adavesik/compoviz` identity and review the final raw diff and remaining external URLs.
- [Removing the overlay can leave dead CSS or unexpected spacing] → Remove provider-specific styles and smoke-test desktop and mobile application layouts.
- [Historical release links may target refs not present in the current repository] → Preserve their tag/commit paths while changing only the repository owner, then verify the resulting strings are internally consistent.

## Migration Plan

1. Replace the exact legacy repository identity across runtime, documentation, release metadata, and deployment references.
2. Remove the Ko-fi loader, initializer, and provider-specific style.
3. Add or update targeted tests and run static legacy/promotion audits.
4. Run the standard quality/build gates and browser smoke test before deployment.

Rollback is a normal source revert; there is no user data, schema, storage, or backend migration.

## Open Questions

None. The configured `origin` establishes the canonical repository, and advertising/donation removal has no replacement requirement.
