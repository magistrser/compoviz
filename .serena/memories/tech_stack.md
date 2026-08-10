# Tech stack
- React 19 functional components with strict TypeScript 5.9, Vite 8, ES modules, and React Router 7.
- Package manager: Yarn 4.14.1 via Corepack; Node.js >=22.12.0 (pinned in `.nvmrc`). The authoritative lockfile is `yarn.lock`.
- Compose processing: custom typed pipeline + js-yaml. Visualization: @hpcc-js/wasm-graphviz and @xyflow/react. Parser and Graphviz work run in Web Workers.
- Styling: SCSS. Global tokens/reset/utilities live in `src/styles/global.scss`; component styles are colocated SCSS.
- Tests: Vitest 4 in happy-dom, Testing Library, and Fast Check property tests.
- Production: Vite static bundle served by static-only nginx with SPA fallback; GitLab CI, GitHub Actions/GHCR, Docker Compose, and Vercel are supported.