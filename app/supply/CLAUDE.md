# app/supply/ — Logan's half of the Waymo demo

This is a stylized, simulated fleet supply allocation dashboard for Waymo Commute Pass. It runs in parallel with Sera's chatbot at `app/page.tsx`.

**Do not modify Sera's files.** Out of scope for this half:
`app/page.tsx`, `app/api/chat/`, `app/components/`, `app/layout.tsx`, `app/globals.css`, root `CLAUDE.md`, `AGENTS.md`, `SOURCE_OF_TRUTH.md`, `README.md`.

## Where to look first

| Working on... | Read |
|---|---|
| Anything | `docs/supply/SPEC.md` — iteration log, decisions, schemas. Submission deliverable. |
| Domain / strategy | `docs/supply/context/domain.md` |
| Architecture | `docs/supply/context/architecture.md` (created after first plan spec) |
| Bugs / weird behavior | `docs/supply/context/gotchas.md` |
| Code style | `docs/supply/rules/coding-standards.md` |
| Visual design | `docs/supply/rules/visual-conventions.md` |
| Active work | `docs/supply/specs/active/` |
| Workstream state | `docs/supply/PROGRESS.md` |

## Hard rules

- This is **Next.js 16** with breaking changes vs. training data. Read `node_modules/next/dist/docs/` before writing routing, layout, or server-component code. Heed deprecation notices.
- No new dependencies without approval.
- All Logan-owned files live under `app/supply/` or `docs/supply/`. Nothing else gets touched.
- Phase 1 is fully independent of Sera's chat. Do not introduce coupling until Phase 2 is signed off.

## Workflow

Plan spec → Logan review → implementation spec → implement → validation spec → archive to `done/`. Specs in `active/` are the source of truth for in-flight work. Update `SPEC.md` iteration log when a decision lands.
