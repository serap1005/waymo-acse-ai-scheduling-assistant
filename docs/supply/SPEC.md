# Supply View — Iteration Spec

**Author:** Logan Wood
**Half:** Logan (parallel to Sera's ACSE chatbot at `app/page.tsx`)
**Status:** Phase 1 — independent demo, in design
**Last updated:** 2026-05-08

This document is the canonical specification for the Waymo Commute Pass **fleet supply allocation view** — Logan's half of the shared demo. It mirrors the role of Sera's `SOURCE_OF_TRUTH.md` for her side. It tracks every product and technical decision, the data schemas, any system prompts (when added), and a chronological iteration log.

This is the deliverable for the class assignment requirement: *"the final, refined Markdown specification used to prompt and guide the AI agents."*

---

## 1. Product Context

### 1.1 Strategic Setup

Waymo Commute Pass converts spontaneous demand into scheduled, predictable demand. Sera's half (the ACSE chatbot) is the user-facing scheduling interface. Logan's half — this view — visualizes the *operational consequence*: fleet supply allocation gets dramatically better when commuters preschedule their rides.

**The narrative this view tells:**
- **On-demand only** → vehicles wander, deadhead, miss demand spikes, ETAs balloon at peak.
- **With Commute Pass** → vehicles pre-position along known commute corridors, deadhead drops, ETA drops, utilization climbs — for both subscribers and on-demand riders.

**Source numbers (from product brief):**
- Baseline deadhead: 44.3% of VMT
- Baseline avg ETA: 5.7 min (Waymo) vs. 3.3 min (Uber)
- Fleet: ~3,000 vehicles across 11 cities

### 1.2 What This View Is

A single Next.js 16 page at `/supply`, rendered client-side only. Stylized — not a real map. Two synchronized panels (On-Demand Only vs. With Commute Pass), driven by a shared time-of-day scrubber that autoplays. KPI counters animate in response to the scrubber position and (likely) an adoption-rate slider.

- Phase 1: standalone, no coupling to Sera's chat.
- Phase 2: schedules entered via Sera's chatbot flow into this view's "With Commute Pass" panel.

---

## 2. Architecture

*Filled in after the first plan spec is signed off and built.* Until then, the active plan spec under `docs/supply/specs/active/` is the source of truth for the architectural shape.

---

## 3. Data Schemas

Schemas are added here as components are built. Initial expected shapes (subject to revision in implementation specs):

- `ScheduledRide` — origin, destination, day-of-week, departure time, lockedPrice. Will eventually mirror Sera's `ScheduleData` for Phase 2 linkage compatibility.
- `Vehicle` — id, position, state (`idle | dispatched | enroute | with_passenger | repositioning`).
- `KPISnapshot` — timestamp, deadheadPct, avgEtaMin, utilizationPct, missedDemandPct.
- `DemandPulse` — corridor, time-of-day, intensity (for the heatmap layer).

Concrete TypeScript interfaces will be pasted in as they're written.

---

## 4. System Prompts

*None yet.* Phase 1 is purely a visual simulation with no LLM. If a later phase introduces an "ops assistant" that interprets the supply state in natural language, prompts are documented here verbatim.

---

## 5. Iteration Log

Chronological. Every decision, every rework, with rationale.

### 2026-05-08 — Project framing
**Decision:** Build a second page in parallel with Sera's chatbot, visualizing the supply-side benefit of prescheduled commutes.
**Rationale:** Sera's demo proves the user-side value of Commute Pass. This view proves the operational value to Waymo (deadhead, ETA, utilization). Together they tell the full flywheel.
**Constraint accepted:** Zero changes to Sera's code or root-level docs.

### 2026-05-08 — Visual direction: stylized over realistic
**Decision:** Stylized abstract map of SF, not a real base map.
**Rationale:** Easier to control visually, faster to build, more visually distinctive for a class demo. A real basemap (Mapbox/Google) is the Phase 1.5 fallback if the stylized version looks weak.

### 2026-05-08 — Independence first, linkage second
**Decision:** Phase 1 ships fully independent. Phase 2 connects Sera's schedule cards to this view.
**Rationale:** Linkage requires shared client state, which means touching Sera's code. Defer that risk until our half stands on its own. Also lets us iterate without blocking on her side.

### 2026-05-08 — Autoplay required
**Decision:** Time-of-day scrubber autoplays on a loop. Manual scrub is also supported.
**Rationale:** Demo is shared via link, not live-presented. Autoplay tells the story without input. Manual scrub lets viewers pause and explore.

### 2026-05-08 — Separation strategy
**Decision:** Code under `app/supply/`, docs under `docs/supply/`. Shared `layout.tsx` and `globals.css` not modified by Logan. Joint demo route at `app/demo/` is deferred and optional.
**Rationale:** Clean namespace separation. Next.js App Router segments mean `/supply` is fully isolated from `/`. iframes are an option for the joint view but only as a fallback.

### 2026-05-09 — Compress to no-scroll height
**Problem Logan identified:** Couldn't see metrics and animation simultaneously — the page exceeded a typical laptop viewport, forcing scroll between supporting evidence (KPIs) and the visualization.

**Two-pronged fix:**
- **Panel viewBox reshaped** from 520×560 (1:1.08, tall-square) to 600×340 (1.76:1, wide-short). Neighborhood coordinates and `CITY_BOUNDS` recomputed for the new aspect. The simulation cache invalidates on module reload so paths regenerate to the new bounds. SVG renders ~40% shorter at the same container width.
- **Every other component tightened.** Header collapsed to a single horizontal line. Hero number reduced 72px → 52px, secondary tickers 24px → 18px. KPI strip moved above the legend (supporting numbers next to the hero, not buried below). KPI cells: padding 14/18 → 8/12, primary numbers 24px → 18px, delta promoted into the cell header next to the label rather than its own row. Legend padding 12/16 → 8/14, swatches 14px → 11px. Scrubber paddings/sizes shrunk. Panel internal padding 18 → 12. Footer trimmed from two lines to one.

**Layout order rearranged:** Header → Hero → KPI → Legend → Scrubber → Panels → Footer. KPIs adjacent to the hero number reads as one block of evidence, not split across the page.

**Why Logan's "rearrange if needed" license unlocked this:** the old order put scrubber before KPIs because the scrubber drives the KPI values. But for a no-scroll demo, *visual proximity to the hero* matters more than *causal order*. Cause/effect is still readable because the scrubber and KPIs are both clearly time-driven.

### 2026-05-09 — Drop "repositioning" state (Rams: color is meaningful, never decorative)
**Problem Logan identified:** "Repositioning" was a separate amber color but was functionally indistinguishable from idle — both are empty miles, both are deadheading. Two colors for the same meaning is decoration, not signal.

**Fix:** Collapsed `VehicleState` from four values to three: `idle | dispatched | with_passenger`. State distributions in all three path generators rebalanced — ex-`repositioning` weight folded into `idle` on the left panel (honest: those vehicles are just deadheading) and into `dispatched` on the right panel (honest: schedule visibility means more vehicles are heading to confirmed pickups, not aimlessly repositioning). Legend trimmed to three pills with sharper labels: "Empty (deadheading)" / "Dispatched to pickup" / "With passenger (revenue)."

**Color story now:**
- Gray = wasted (empty mile, no value generated)
- Teal = potential value (vehicle responding to known demand)
- Blue = realized value (revenue ride in progress)

Three colors, three meanings, one direction palette. The corridor pulses share teal with `dispatched` — intentional, since both signal "this is the dispatch system at work."

### 2026-05-09 — Couple state changes to direction changes
**Problem Logan identified:** Vehicles continued drifting along their previous trajectory even when they changed state — e.g., an "idle" car turning "with_passenger" kept heading the same way, instead of starting a new route to drop the rider off.

**Fix:** All three path generators now treat state-change as a direction-change trigger. When `stateHold` rolls over (state changes), the vehicle also re-picks its target — random point for on-demand, corridor neighborhood for smart-fleet, jittered destination zone for subscriber mid-day. Random retargeting probability also dropped (0.08 → 0.05, 0.12 → 0.07) so state-driven changes do most of the directional work, not pure noise.

**Subscriber path refactor:** Mid-day window converted from per-keyframe `jitter()` (which read as random teleporting) to a persistent target-drift pattern with state-coupled retargeting. Corridor traversals (morning/evening peaks) are unchanged — still smooth lerps origin↔destination at "with_passenger."

**Why it works:** A color shift now reads as a *narrative* event — picked someone up, going somewhere — rather than a costume change while continuing the same drift. Compounds with the tempo-desync from the prior iteration: each car has its own clock AND its own meaningful trip-by-trip motion.

### 2026-05-09 — Desync the fleet (vehicle motion no longer feels rhythmic)
**Problem Logan identified:** Every dot was changing color/direction on the same keyframe boundary. Felt mechanical and synthetic — fleet moved in lockstep beats as the scrubber progressed.

**Three changes:**
- **Per-vehicle `tempoOffset`.** Each vehicle has its own time offset (~±0.012 of the loop, i.e. ±~10 sim-minutes). When the rAF loop interpolates a vehicle's position, it uses `t + tempoOffset` for that vehicle. Each car effectively lives at a slightly different "now," so state changes and direction pivots happen at different global moments. Subscribers get a *smaller* offset (±0.009) so corridor traversals still cluster visibly around peak windows — but slight staggering reads as more realistic, not less.
- **Randomized initial `stateHold`.** Path generators no longer start every vehicle with `stateHold = 0`. Each starts with a different random hold counter, so the first state change is at a different keyframe per vehicle. Breaks the t=0 / loop-reset alignment.
- **Continuous per-vehicle micro-wobble.** A sinusoidal jitter (±1.4px, per-vehicle phase) added in `interpolateVehicle` after the keyframe lookup. Sub-keyframe motion that breaks the "every dot moves on the same linear segment" feel without changing overall trajectory.

**Why this is the right cut, not the bigger one:** I considered switching to per-vehicle continuous physics (no keyframes), but the keyframe architecture is doing real work — corridor traversals, state distribution, deterministic seeding. Three small additions get organic feel without rewriting the simulation. If post-tempo it still feels rhythmic, escalate to per-vehicle keyframe schedules.

### 2026-05-09 — v2 product-design refactor (Logan critique through /product-design lens)
**Problems Logan identified after viewing v1 in browser:**
- Adoption slider was extraneous control surface; one less story makes the demo land harder.
- Off-peak the right panel still showed wandering gray dots, making "less deadheading" invisible most of the loop. The deadhead delta only read during peaks.
- Vehicles felt like "dust motes floating" — random walk read as aimless rather than purposeful. Outside corridor traversal, viewers couldn't grasp what was happening.
- KPI strip was below the fold; users had to scroll for the supporting evidence to the hero number.
- SF outline blob looked sloppy and wasn't doing geographic work — neighborhoods alone read as SF.

**Decisions applied:**
- **Cut adoption slider entirely.** Fixed at 50% adoption. Hero label simplifies to "With Commute Pass" without the dynamic percentage.
- **Idle vehicles do NOT park.** Logan correctly pushed back on my earlier "park at staging zones" suggestion — idle implies wasted supply, which is the wrong story. Instead: state distributions tighten so the right panel has fewer idle vehicles overall (matching ~25% deadhead vs. 44% baseline) and more `with_passenger`/`dispatched` throughout the day. The right panel just looks *busier doing useful work*. That's the deadhead delta, visualized.
- **New `generateSmartFleetPath` path generator** for right-panel non-subscribers. Demand-zone-aware drift, heavy on active states, light on idle. Replaces the previous on-demand fallback for the right panel. Story: schedule visibility benefits the whole fleet, not just subscribers.
- **Drift-toward-target replaces random walk** for both panels. Each vehicle picks a target, drifts toward it, picks a new target. Reads as deliberate movement (cruising taxi on left, demand-zone seeking on right) rather than dust-mote chaos.
- **Drop SF outline.** Replace with cleaner dark canvas + denser visible street grid + squarer neighborhood markers (rounded rectangles instead of circles). The grid IS the city.
- **Panel captions added** under titles for explicit teaching: "Unpredictable demand · scattered allocation" vs. "Predictable demand · pre-positioned fleet."
- **KPIs move above the panels**, cut from 4 to 3 (drop missed-demand). Compact horizontal strip directly above the maps.

**What's preserved from v1:**
- 30s autoplay loop, hard reset
- Hero number is deadhead reduction %, no rotation, two secondary tickers
- Right-panel ETA splits into subscriber + non-subscriber lines (the guardrail visualization, per senior review)
- Animation architecture (rAF → refs, no React re-render per frame)
- Color palette and dark-mode aesthetic

**Out of scope still:** real basemap (definitively retired), full grid-locked vehicle motion (deferred — if v2 still feels organic-and-aimless, revisit), Phase 2 chat linkage.

### 2026-05-08 — Visual spike validated; stylized SF confirmed
**Decision:** Stylized SF approach lands. Sticking with SVG + stylized neighborhoods + glowing corridors. Real basemap fallback is now formally retired.

**Spike feedback captured:**
- The legend is too small and buried at the bottom of each panel. On first view it's unclear what the vehicle colors mean. Once seen, the color → state mapping is intuitive — but for an autoplay shared-link demo, "once seen" is too late.
- **Action for implementation:** legend moves to a prominent strip near the hero/scrubber (single shared legend, not per-panel). Larger swatches, larger text, and **descriptive labels that teach the dispatch story** — e.g. "Idle (deadheading)" not just "Idle"; "With passenger (revenue)" not just "With passenger." Color-as-meaning per `visual-conventions.md`.

**Rationale:** The legend isn't decoration — it's the key that unlocks every other visual claim in the demo. If a viewer can't decode vehicle colors in the first 3 seconds, the deadhead-vs-utilization story is invisible.

### 2026-05-08 — Senior-review changes applied to plan spec 001
**Decisions (driven by sub-agent pressure-test):**
- Killed the rotating hero number. **Deadhead % is the single primary headline.** Two secondary tickers (peak ETA delta, extra rides served) sit below without rotation.
- Split right-panel ETA into **subscriber ETA + non-subscriber ETA**. The non-subscriber line is the visible guardrail — must not regress vs. left panel at any scrubber position. This makes the demo's most defensible claim visible instead of asserted.
- Adoption slider min raised from **0% → 5%**. Panels never collapse to identical, preserving the punchline if a viewer drags the slider before the story lands.
- Locked a **perf budget** (≥55fps on 2019-era MacBook, Chrome) into acceptance criteria. Animation state lives outside React (rAF → refs/DOM, not React state).
- Documented an explicit **interaction state machine** (scrubber drag pauses autoplay; slider drag does not; KPI hover doesn't pause anything).

**Rationale:** The reviewer's question — "if a viewer remembers one number 24 hours later, what is it?" — forced a thesis. Logan's answer: deadhead %. Everything else is supporting. Three of the changes are non-controversial cleanups (perf budget, slider min, state machine). The fourth (split ETA) is the strategic upgrade — it transforms "trust us, non-subscribers also benefit" into "here are both lines, watch them."

### 2026-05-08 — MVP scope decisions (plan spec 001)
**Decisions:**
- Loop speed: 30s for full 6 AM → 9 PM day cycle.
- Hero takeaway: rotate through ≥3 framings (% less deadhead, min faster ETA, extra rides served) synced with day phases.
- Adoption-rate slider: in scope for P1 (default 30%).
- Loop boundary: hard reset; evaluate cross-dissolve only if snap reads badly.
- Pre-flight: build a static visual spike at `app/supply/page.tsx` BEFORE wiring animation, to de-risk the stylized-map direction.
- Senior review: pressure-test this plan via a sub-agent in parallel with the spike.

**Rationale:** Class demo is link-shared (no narrator), so 30s pacing keeps attention. Rotating hero framings tell three angles of the same flywheel without making any one number the load-bearing claim. Adoption slider sharpens the "this scales with subscribers" argument cheaply. Hard reset is the simplest loop boundary — fix visually if it jars. The spike is the cheapest way to de-risk the visual direction; a sub-agent review is the cheapest way to de-risk strategy.

### 2026-05-08 — Context engineering bootstrap
**Decision:** Adopted a scoped context-engineering stack for Logan's half only — `app/supply/CLAUDE.md` as routing, `docs/supply/` as the doc tree, this `SPEC.md` as the iteration log. Tier 1 files written; architecture doc deferred until after the first plan spec.
**Rationale:** Sera's half doesn't use this convention; her root `CLAUDE.md`/`AGENTS.md`/`SOURCE_OF_TRUTH.md` is intentionally untouched. Logan's half follows agent-coded best practices without imposing them on Sera.

---

## 6. Open Questions

- What "savings" magnitudes are honest to claim in the With-Commute-Pass panel? The brief implies a 15–25% MACR lift over 12 months — what does that map to for deadhead/ETA at the demo's adoption-rate slider settings?
- Should the corridor heatmap show demand only, or supply-vs-demand mismatch? Mismatch is more compelling but harder to read at a glance.
- Phase 2 interface: shared client store (Zustand?), URL state, or postMessage between iframes? Decide when Phase 2 is signed off.
- Joint demo: does the final shared link land on `/`, `/supply`, or a `/demo` route that shows both? Decision deferred until both halves are demo-ready.

---

## 7. File Structure

```
app/supply/
  CLAUDE.md                    Routing for agents working on this half.
  page.tsx                     Entry point. (TBD)
  components/                  Subcomponents. (TBD)

docs/supply/
  SPEC.md                      ← This document.
  PROGRESS.md                  Workstream state.
  context/
    domain.md                  Waymo strategy facts the agent can't derive from code.
    architecture.md            (Filled in after first plan spec.)
    gotchas.md                 Empirical rules and pitfalls.
  rules/
    coding-standards.md        Code invariants for this half.
    visual-conventions.md      Visual design rules.
  specs/
    active/                    Specs in flight.
    done/                      Archived after validation.
    future/                    Planned, not started.
    templates/                 Plan / implementation / validation templates.
```

---

*Any change to architecture, schemas, system prompts, or visual conventions must be reflected in this document before being merged.*
