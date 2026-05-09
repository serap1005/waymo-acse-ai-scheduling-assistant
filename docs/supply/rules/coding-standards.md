# Coding standards — Logan's half

Invariants for code under `app/supply/`. Lint won't catch these.

- **No new dependencies** without explicit approval. Budget: Next.js 16, React 19, Tailwind 4, Anthropic SDK.
- **Tailwind 4 only** for styling. No CSS modules, no styled-components. Component-local inline styles are acceptable for small visual-only cases.
- **Client components by default.** The supply view is a simulation; server-side rendering is the exception, not the rule.
- **No coupling to Sera's half** in Phase 1. Do not import from `app/page.tsx`, `app/api/chat/`, or `app/components/`.
- **Comments only for non-obvious WHY.** Never explain WHAT the code does (per global CLAUDE.md).
- **TypeScript strict.** No `any` without a comment justifying it.
- **`npm run build` must pass** before a task is marked complete.
