# Plan + Impl Spec — Phase 2: Schedule linkage

**ID:** 002-phase-2-linkage
**Status:** active (Logan-side build first; Sera coordination after)
**Date:** 2026-05-10

## Goal

Surface user-created schedules from Sera's chat inside the `/supply` view so the demo tells one continuous story: *user creates schedule → fleet pre-positions for it → deadhead reduction visible*.

Logan's side ships fully end-to-end first (using a dev-only test-inject button for demo rehearsal). Sera's side adds 3 small additive changes when she signs off.

## Architecture

- **Storage:** `localStorage` key `commute-pass:scheduled-rides`, JSON array of `ScheduledRide`. Survives refresh, no backend.
- **Sync:** cross-tab via `storage` event, same-tab via custom `commute-pass:schedules-updated` event (the `storage` event doesn't fire for the originating tab).
- **Schema:** `ScheduledRide` = Sera's `ScheduleData` + `id` (UUID) + `createdAt` (epoch ms).
- **Matching:** fuzzy substring match against an alias table per LA neighborhood (e.g. `"DTLA"` matches `"downtown"`, `"dtla"`, `"downtown la"`). If both endpoints match → render as a highlighted on-map corridor. If either doesn't → fall back to a labeled pill in the schedules strip without a map element.
- **Visualization:** user corridors render *on top of* pre-baked corridors on the right panel only. Stronger visual weight: thicker stroke (4 vs 2), animated dash-flow (stroke-dashoffset SVG `<animate>`), per-corridor label.
- **Lifecycle:** simulation cache stays — adding/removing a schedule doesn't regenerate fleet paths. The right panel's existing fleet behavior is unchanged; only the corridor overlay updates.

## Files to add or change

| Path | Change | Notes |
|---|---|---|
| `app/supply/lib/scheduleStore.ts` | New | Types (`ScheduledRide`), `useScheduledRides` hook, neighborhood matcher. |
| `app/supply/components/SchedulesStrip.tsx` | New | Horizontal pill list under the legend. Renders nothing if no schedules. |
| `app/supply/components/InjectButton.tsx` | New | Dev-only affordance: bottom-right pill with `+ Test schedule` and `× Clear` actions. Dotted border so it's visibly "demo only." |
| `app/supply/components/Panel.tsx` | Edit | Accept `userCorridors: UserCorridor[]` prop. Render them on top of pre-baked corridors with stronger weight + dash-flow animation + label. Only relevant for right panel. |
| `app/supply/page.tsx` | Edit | `useScheduledRides`, pass user-matched corridors to right Panel, render `<SchedulesStrip>` under legend, render `<InjectButton>` floating. |

## Awaiting Sera coordination (not in this PR)

When Sera signs off, three additive changes go into her code:

1. **System prompt:** add LA to covered markets (`"San Francisco, Phoenix, and Los Angeles"`) + one LA pricing anchor (e.g. `Santa Monica to DTLA is ~15 miles = "$28"`). Doesn't break her existing SF/Phoenix flows.
2. **Schedule write:** after a successful `parseSchedule` returns a `ScheduleData`, call a tiny helper that appends `{...scheduleData, id: crypto.randomUUID(), createdAt: Date.now()}` to localStorage and dispatches the same-tab event. 5 lines.
3. **Optional:** a "→ See fleet impact" link on the schedule card that navigates to `/supply`. Nicest UX, fully optional.

## Out of scope

- Time-aware corridor highlighting (matching corridor pulse intensity to scheduled time window)
- Days-of-week filtering of the visualization (just always show the corridor)
- Persistent backend storage
- Real fleet path regeneration on schedule add
