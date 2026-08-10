# Compoviz core
- Browser-only Docker Compose architecture editor; no application backend.
- Durable behavior authority: `openspec/specs/**/spec.md`; active work: `openspec/changes/**`.
- Application shell: `src/app`; lazy route pages: `src/pages`; Compose AST/contracts: `src/models`; parsing/rendering/resolution: `src/utils`; workers: `src/workers`; state: `src/hooks` and `src/context`; feature UI: `src/features`; shared/layout UI: `src/components`; catalogs: `src/data`; fixtures: `fixtures`; static assets: `public`.
- Preserve browser-only operation, worker offloading and synchronous fallback, untrusted-input validation, SVG sanitization, local-storage compatibility, three-project comparison cap, and export filenames.
- Toolchain/version details: `mem:tech_stack`. Repository conventions: `mem:conventions`. Commands: `mem:suggested_commands`. Completion gates: `mem:task_completion`.
- Browser testing and automation SHALL use the `browser-use` skill/harness.