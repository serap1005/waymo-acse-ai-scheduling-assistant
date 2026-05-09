# Plan Spec — MVP supply allocation page

**ID:** 001-mvp-supply-page-plan
**Status:** draft (awaiting Logan sign-off)
**Author:** Logan + Claude
**Date:** 2026-05-08

## Goal

Build a stylized, autoplaying split-view at `/supply` that makes a class-demo audience *feel* the operational impact of prescheduled commutes on Waymo's fleet — by visualizing the gap between on-demand-only and Commute-Pass-augmented dispatch over a 24-hour cycle.

## Why now

Logan owns half of a shared demo with Sera. Her half (ACSE chatbot) shows the *user-side* value of Commute Pass. Logan's half must show the *operational* value or the demo only tells half the story. This is the first build artifact for Logan's half. (See iteration log entry 2026-05-08 — "Project framing".)

## Approach

1. **Single full-screen page at `/supply`.** No phone frame. Desktop-first; mobile responsiveness is out of scope for Phase 1.

2. **Two stylized SF panels side by side.** Left: *"On-Demand Only"*. Right: *"With Commute Pass"*. Same neighborhoods, same demand, same time — only the dispatch logic differs. The visual symmetry is the point.

3. **Stylized SF, SVG-based.** Hand-drawn neighborhood blobs + glowing commute corridor lines (Mission↔Downtown, Sunset↔SOMA, Marina↔Financial, etc.). No external map library. Color and motion carry meaning per `visual-conventions.md`.

4. **Vehicles as colored dots.** ~40 vehicles per panel (visual clarity over fleet realism). Color-coded by state: idle, repositioning, dispatched, with-passenger. Animate via CSS transforms / `requestAnimationFrame`, not per-frame React state.

   **Shared legend, prominent placement** (lesson from spike v0): a single horizontal legend lives near the hero/scrubber, not at the bottom of each panel. Larger swatches, larger text, and descriptive labels that teach the dispatch story — e.g. "Idle (deadheading)", "With passenger (revenue)". Viewers must decode vehicle colors within 3 seconds of page load.

5. **Demand pulses.** At realistic commute corridors and times, demand "pulses" appear. Left panel: vehicles scramble from wherever they are. Right panel: vehicles are already pre-positioned, dispatch is instant.

6. **Synced time-of-day scrubber.** Spans 6 AM–9 PM. Autoplays one full day in **~30 seconds**, looping (hard reset at the boundary — we'll evaluate cross-dissolve only if the snap reads badly). Drag pauses autoplay; releasing resumes after a short delay. Peak windows (8–9 AM, 5–7 PM) visually highlighted.

7. **KPI counter strip.** Four numbers, animating as the scrubber moves: deadhead %, avg ETA, vehicles-serving-demand, missed-demand %. Each KPI shown as paired values (left vs. right) with a delta callout. **On the right panel, ETA splits into two values: subscriber ETA and non-subscriber ETA.** The non-subscriber line is the visible guardrail — it must not regress vs. the left panel. This is the most defensible viz claim of the demo. All simulated values labeled.

8. **Hero takeaway — single primary number, no rotation.** A single large headline above the panels: **"X% less deadheading"** (deadhead reduction is the load-bearing claim). The hero number animates with the scrubber. Two **secondary tickers** below the hero show "min faster at peak ETA" and "additional rides served" without rotation — small, persistent, in viewer peripheral vision. Decision driven by sub-agent senior review (2026-05-08): rotating the hero on a 30s loop is cognitive overload.

9. **Adoption-rate slider** (in scope for P1). Lets the viewer dial subscriber adoption from **5% to 100%**. Default position: 30%. **Min is 5%, not 0%, so the panels never collapse to identical** — preserves the demo's punchline if a viewer drags the slider before the story lands. Visually subordinate to the scrubber.

10. **Interaction state machine.** Explicit rules:
    - Scrubber autoplays on load.
    - Scrubber drag → pauses autoplay; release → resumes after 2s of idle.
    - Adoption-slider drag → does NOT pause the scrubber (independent axis).
    - Hover/focus on a KPI → does NOT pause anything (read-only highlight).

## Risks and unknowns

- **Stylized map looks bad.** Mitigation: build a tiny visual prototype (1–2 hrs) before committing. If it's weak, fall back to a real basemap (Mapbox or OSM tiles). Decision gate before deep implementation.
- **Cognitive overload.** Two panels + scrubber + 4 KPIs + hero + secondary tickers + adoption slider is a lot. Mitigation: strict visual hierarchy — hero number dominates, panels secondary, KPIs tertiary, tickers and slider quaternary. No rotation on the hero (per senior review).
- **Animation performance.** 80 vehicles + corridor pulses + KPI tweens at 60fps. Mitigation: SVG transforms + `transform`/`opacity` only (compositor-friendly), no layout-thrashing properties. **Animation state lives outside React** — `requestAnimationFrame` writes directly to refs / DOM / SVG attrs, NOT to React state. React only re-renders on discrete events (slider change, autoplay pause/resume). Perf budget locked in acceptance.
- **Honesty risk.** We are making up the "with Commute Pass" numbers. Mitigation: every simulated value carries a small "simulated" label or footnote; baseline numbers cite the brief.
- **Loop seam.** Autoplay loop boundary may jank. Mitigation: design vehicle positions at 9 PM ≈ 6 AM positions, or fade/cross-dissolve at the loop point.
- **Phase 2 over-design.** Tempted to build a state bus now "for later." Don't. Use plain React state in Phase 1; revisit when Phase 2 is signed off.

## Acceptance

- [ ] `/supply` renders in browser without console errors
- [ ] Split-view layout: left panel labeled "On-Demand Only", right "With Commute Pass"
- [ ] Stylized SF visible in both panels with named corridors
- [ ] ~40 vehicles per panel, color-coded by state, animating
- [ ] Single shared legend near hero/scrubber, prominent enough to decode within 3 seconds; descriptive labels (e.g. "Idle (deadheading)")
- [ ] Demand pulses fire at realistic peak times (8–9 AM, 5–7 PM, lunch optional)
- [ ] Time-of-day scrubber visible at top, autoplays 6 AM → 9 PM in ~30s, loops with hard reset
- [ ] Manual drag on scrubber pauses autoplay; release resumes
- [ ] Four KPIs (deadhead %, ETA, vehicles-active, missed-demand %) shown left vs. right with deltas, interpolating across scrubber positions
- [ ] Right-panel ETA shows both subscriber and non-subscriber values; non-subscriber ETA never regresses vs. left panel at any scrubber position
- [ ] Hero headline shows deadhead reduction % only, animating with scrubber (no rotation)
- [ ] Two secondary tickers visible (peak ETA delta, extra rides served), animating with scrubber
- [ ] Adoption-rate slider present, range 5–100%, defaults to 30%, both panels respond when dragged
- [ ] Interaction state machine matches spec §10 (scrubber drag pauses, slider drag doesn't, etc.)
- [ ] **Perf budget:** sustained ≥55fps on a 2019-era MacBook in Chrome with both panels visible. Verified via Chrome DevTools performance tab.
- [ ] Simulated values clearly labeled
- [ ] `npm run build` exits 0
- [ ] Sera's `/` route still works, untouched
- [ ] Works in Chrome and Safari latest

## Out of scope

- Real basemap (Mapbox / OSM) — fallback only if stylized fails
- Mobile responsiveness
- Phase 2 linkage to Sera's chat
- Joint `/demo` route
- LLM / system prompts (none in Phase 1)
- Persistence, auth, real fleet data

## Open questions

*Resolved 2026-05-08:*
- ~~Loop speed~~ → **30s** for full day cycle.
- ~~Hero number framing~~ → **deadhead % as single primary number, no rotation.** Two secondary tickers below for ETA delta and extra rides.
- ~~Adoption slider~~ → **in scope for P1**, range **5–100%**, default 30%.
- ~~Loop boundary~~ → **hard reset**, evaluate visually; consider cross-dissolve only if snap reads badly.
- ~~Pre-flight visual prototype~~ → **yes, spike first.** That's the next action.
- ~~Senior-review feedback~~ → applied: hero rotation killed, ETA split on right panel, slider min 5%, perf budget locked, state machine documented.
- ~~Non-subscriber benefit visibility~~ → right-panel ETA splits into subscriber + non-subscriber lines; non-subscriber line is the guardrail.

*Resolved 2026-05-08 (continued):*
- ~~Visual prototype outcome~~ → **stylized lands. Locked in.** Real basemap fallback retired. One action item: legend prominence (see §4 of Approach).

*Still open:* (none — plan ready for implementation spec)
