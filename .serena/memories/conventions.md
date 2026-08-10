# Repository conventions
- All first-party source under `src/` is strict TypeScript: `.ts` for modules and `.tsx` for React. Do not add JavaScript/JSX source or explicit `any`; narrow browser storage, YAML, network, worker, and file values from `unknown`.
- `src/app` owns BrowserRouter/provider composition and route constants. `src/pages` owns lazy route entries. Feature UI belongs under `src/features`; shared/layout UI under `src/components`; public APIs use nearby `index.ts`.
- Keep tests beside code: `*.test.ts(x)`; use `*.integration.test.ts` for cross-module flows and `*.property.test.ts` for Fast Check invariants.
- Functional React components; PascalCase component files, `use*` hooks, camelCase utilities. Formatting follows the template-derived Prettier config.
- Treat YAML, Dockerfiles, fetched content, browser storage, and SVG as untrusted. Preserve validation/sanitization boundaries.
- OpenSpec is the durable behavioral authority. Do not incidentally change local-storage keys/schema, public asset paths, Compose semantics, worker fallback, or exported filenames.
- Global styles are SCSS in `src/styles/global.scss`; Tailwind is not part of the toolchain.