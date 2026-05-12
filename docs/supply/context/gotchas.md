# Gotchas — empirical rules and pitfalls

Things that have already burned us, or will if we forget.

## Next.js 16 has breaking changes from training data

The root `AGENTS.md` warns: *"This is NOT the Next.js you know — APIs, conventions, and file structure may all differ from your training data."* Before writing any routing, layout, server-component, or `app/`-directory code, read the relevant guide in `node_modules/next/dist/docs/`. Heed deprecation notices.

This applies to:
- Route segments and layouts
- Client vs. server component boundaries
- Data fetching primitives
- Any `next/*` import

## Do not touch Sera's files

These belong to the other contributor and are out of scope for Logan's half:

- `app/page.tsx`
- `app/api/chat/`
- `app/components/` (her ScheduleCard, etc.)
- `app/globals.css` (shared — leave alone; scope new styles via Tailwind utility classes or component-local style)
- Root `CLAUDE.md`, `AGENTS.md`, `SOURCE_OF_TRUTH.md`, `README.md`

**Jointly-owned exception:** `app/layout.tsx` has one Logan-owned touchpoint — the `<ViewSwitcher />` import and render — added so users can toggle between `/` (Sera's) and `/supply` (Logan's) without manually editing the URL. Approved by Logan, requires Sera coordination on PR. Do not modify `layout.tsx` further without sign-off.

If a feature legitimately requires modifying any other shared file, surface it in a spec and get explicit Logan sign-off first.

## Phase 1 is independent

Do not import from `app/page.tsx`, `app/api/chat/`, or `app/components/`. The supply view stands alone until Phase 2 is signed off. Premature linkage is the most likely way to break Sera's working demo.
