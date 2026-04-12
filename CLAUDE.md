# Claude Code project guidance

Read `AGENTS.md` for full project policies, coding conventions, and architecture rules.
Read `DeveloperNotes.md` for implementation details and module documentation.
Read `ISSUES.md` for known bugs and technical debt.

## Quick reference

- **CI gates:** `npm run typecheck` → `npm run lint` → `npm run format:check` → `npm test` → `npm run build`
- **Prettier:** `semi: true`, `singleQuote: false`, `tabWidth: 2`, `trailingComma: "all"`, `printWidth: 120`
- **Test framework:** Vitest (`tests/**/*.test.ts`)
- **Examples:** Each has its own `tsconfig.json` and `vite.config.ts`. Build with `cd examples/<name> && npx vite build`.
