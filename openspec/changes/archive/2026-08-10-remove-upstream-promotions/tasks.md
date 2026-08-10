## 1. Canonical Project Identity

- [x] 1.1 Update the repository, star badge, and issue links in `MainLayout` and `Footer` to target `magistrser/compoviz`, preserving existing accessibility and external-link security attributes.
- [x] 1.2 Replace exact `adavesik/compoviz` references in maintained documentation, contribution guidance, changelog/release metadata, raw-content commands, GHCR examples, and Compose deployment configuration with the canonical owner and repository.
- [x] 1.3 Add or update component tests to assert that rendered repository actions use the canonical repository and issue URLs.

## 2. Remove Monetization Surfaces

- [x] 2.1 Delete the Ko-fi script loader and inline widget initialization from `index.html` so application startup makes no donation-provider request.
- [x] 2.2 Remove Ko-fi-specific global styling and confirm no donation or advertising markup, provider code, or inaccessible hidden controls remain.
- [x] 2.3 Add focused regression coverage for the absence of promotional runtime markup while retaining the existing `awesome-compose` links and optional Vercel analytics behavior.

## 3. Verification

- [x] 3.1 Run repository-wide exact searches to prove that `adavesik/compoviz`, Ko-fi initialization, and advertising-provider integrations are absent, then review remaining external URLs to confirm functional sources were preserved.
- [x] 3.2 Run the closest changed component tests followed by raw `yarn check` and `yarn build` quality gates.
- [x] 3.3 Smoke-test the application at desktop and mobile viewports, checking the rendered UI, network requests, and console for removed promotions, broken links, errors, or layout regressions.
