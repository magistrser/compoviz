## 1. Base-path support

- [x] 1.1 Configure Vite to accept an explicit deployment base while retaining `/` by default
- [x] 1.2 Apply Vite's base URL to React Router and runtime public asset references
- [x] 1.3 Add regression coverage for root and repository-prefixed route matching

## 2. GitHub Pages delivery

- [x] 2.1 Add a least-privilege GitHub Actions workflow that builds and deploys `dist/` to Pages
- [x] 2.2 Verify a `/compoviz/` production build emits prefixed assets and worker chunks without Vercel Analytics initialization

## 3. Validation

- [x] 3.1 Run the raw application quality gates and production build
- [x] 3.2 Validate the OpenSpec change in strict mode
