# Implementation Spec — MVP supply allocation page

**ID:** 001-mvp-supply-page-impl
**Plan spec:** ./001-mvp-supply-page-plan.md
**Status:** draft (awaiting Logan sign-off)
**Date:** 2026-05-08

This spec turns plan 001 into file-level work. The spike at `app/supply/page.tsx` is v0 — this implementation rewrites it, preserving the SF outline, neighborhood positions, palette, and hero layout that landed.

## Files to create or change

| Path | Change | Notes |
|---|---|---|
| `app/supply/page.tsx` | Rewrite | Becomes the page shell. Holds the rAF loop. Owns refs to children. |
| `app/supply/components/Panel.tsx` | New | Stylized SF panel. Receives vehicle ref-callbacks. Right panel renders split ETA. |
| `app/supply/components/Scrubber.tsx` | New | Time-of-day scrubber. Autoplay + drag. Writes `simTimeRef`, manages its own playhead via ref. |
| `app/supply/components/AdoptionSlider.tsx` | New | 5–100% slider. Uses local state + writes `adoptionRef`. |
| `app/supply/components/Legend.tsx` | New | Shared, prominent legend near hero. Descriptive labels per spike feedback. |
| `app/supply/components/HeroBlock.tsx` | New | Single primary number (deadhead %) + two secondary tickers (peak ETA delta, extra rides). All animate via refs. |
| `app/supply/components/KPIStrip.tsx` | New | Four paired KPIs left/right with deltas. Right ETA splits into subscriber + non-subscriber lines. |
| `app/supply/lib/simulation.ts` | New | Pure functions. Generates `FleetCurve` and `KPICurve` for each panel. Deterministic seeded. |
| `app/supply/lib/types.ts` | New | Shared TypeScript types (see §3). |
| `app/supply/lib/animation.ts` | New | `useAnimationLoop` hook + scalar/position interpolation helpers. |
| `app/supply/lib/sf.ts` | New | SF outline path, neighborhood positions, corridor list. Carried over from spike. |

No files outside `app/supply/` are touched. `app/page.tsx`, `app/api/chat/`, `app/components/`, `app/layout.tsx`, `app/globals.css` are off-limits per `gotchas.md`.

## Component tree

```
SupplyPage (app/supply/page.tsx)
├── Header (inline)
├── HeroBlock                     ← primary number + 2 secondary tickers
├── Legend                        ← shared, prominent, descriptive labels
├── Scrubber                      ← drives simTimeRef
├── div (panel row)
│   ├── Panel "On-Demand Only"    ← muted corridors, scattered fleet
│   └── Panel "With Commute Pass" ← glowing corridors, pre-positioned fleet, split ETA in label
├── KPIStrip                      ← 4 KPIs paired left/right
├── AdoptionSlider                ← writes adoptionRef
└── Footer (inline)               ← simulated-values disclaimer
```

`SupplyPage` owns the rAF loop. All animated children expose ref-callbacks (or accept `Ref<HTMLElement>` props) so the parent can imperatively update them without re-rendering React.

## Data shapes (`app/supply/lib/types.ts`)

```typescript
export type VehicleState = "idle" | "repositioning" | "dispatched" | "with_passenger";

export type PanelKind = "ondemand" | "commutepass";

export interface Vehicle {
  id: number;
  state: VehicleState;
  x: number;
  y: number;
}

// Per-vehicle pre-computed path. Keyframes across the day; interpolated at runtime.
export interface VehicleKeyframe {
  t: number;            // 0..1 (6 AM = 0, 9 PM = 1)
  x: number;
  y: number;
  state: VehicleState;
}

export interface VehiclePath {
  id: number;
  keyframes: VehicleKeyframe[]; // sorted by t
}

export interface FleetCurve {
  panel: PanelKind;
  paths: VehiclePath[]; // length 40
}

export interface KPISnapshot {
  t: number;                       // 0..1
  deadheadPct: number;             // 0..100
  avgEtaMin: number;
  subscriberEtaMin?: number;       // commutepass only
  nonSubscriberEtaMin?: number;    // commutepass only — guardrail line
  vehiclesActive: number;
  missedDemandPct: number;
}

export interface KPICurve {
  panel: PanelKind;
  snapshots: KPISnapshot[]; // 31 snapshots, one per 30 sim-minutes
}

export interface SimulationData {
  fleet: { ondemand: FleetCurve; commutepass: FleetCurve };
  kpis:  { ondemand: KPICurve;   commutepass: KPICurve };
}

// Adoption blends commutepass values toward ondemand baseline.
// At adoption=0.05 → 5% of the commutepass benefit; at 1.0 → full.
// Applied identically to KPIs and (as a fraction) to vehicle pre-positioning.
```

Promote these to `SPEC.md` §3 once implemented.

## Animation architecture

**The rule: React state changes on discrete events only. Per-frame updates go through refs.**

Two non-React state holders, both `useRef`:
- `simTimeRef` — number in `[0, 1]`. Owned by `Scrubber` during drag; owned by the rAF loop during autoplay.
- `adoptionRef` — number in `[0.05, 1]`. Owned by `AdoptionSlider`.

Two pieces of React state (rare changes only):
- `isPlaying` — toggled by scrubber drag start (false) and idle-timeout-after-release (true).
- Local component state for visual playhead positions (so React handles the slider-thumb drag UX without re-rendering parents).

**rAF loop (in `SupplyPage`):**

```typescript
useAnimationLoop((deltaMs) => {
  if (isPlayingRef.current) {
    simTimeRef.current = (simTimeRef.current + deltaMs / LOOP_MS) % 1; // hard reset at boundary
  }
  const t = simTimeRef.current;
  const a = adoptionRef.current;

  // Vehicles — interpolate keyframes, write transform + fill
  updateVehicleNodes(panelLeftRefs.current, simData.fleet.ondemand, t);
  updateVehicleNodes(panelRightRefs.current, simData.fleet.commutepass, t, a);

  // KPIs — interpolate snapshots, write textContent
  updateKpiText(kpiTextRefs.current, simData.kpis, t, a);

  // Hero numbers
  updateHeroText(heroRefs.current, simData.kpis, t, a);

  // Scrubber playhead
  scrubberPlayheadRef.current?.style.setProperty("--t", String(t));
});
```

`LOOP_MS = 30_000` (30s per full day, per resolved plan question).

**Why this works:** 80 vehicle nodes × 60fps × 30 KPI text writes = ~5,000 DOM ops/sec. Compositor-friendly props (`transform`, `fill`, `opacity`, `textContent` — no layout properties). Zero React reconciliation in the hot path.

## Sequence — autoplay loop

1. Mount: `SupplyPage` computes `simData = generateSimulation()` (memoized). Children mount, register refs.
2. Effect: `useAnimationLoop` starts.
3. Each tick: read `simTimeRef`, increment, write to all DOM nodes.
4. At `t = 1`: hard reset to `t = 0`. (Visual jank at boundary is the open question — evaluate; if bad, add cross-dissolve.)

## Sequence — scrubber drag

1. `pointerdown` on scrubber → `setIsPlaying(false)`, capture pointer.
2. `pointermove` → compute new `t` from pointer X; write to `simTimeRef`; update local playhead state for visual.
3. `pointerup` → start a 2-second idle timer.
4. After 2s: `setIsPlaying(true)`, autoplay resumes from current `t`.

## Sequence — adoption slider drag

1. `pointermove` → update local slider state AND `adoptionRef.current`.
2. Next rAF tick reads `adoptionRef`, applies blend to right-panel vehicles + KPIs + hero.
3. Scrubber and autoplay are unaffected (independent axis, per plan §10).

## Simulation generation (`lib/simulation.ts`)

Deterministic, seeded. Same data on every load.

- **Fleet (ondemand):** 40 vehicles. Each has 30 keyframes. Positions are seeded random walks within the SF outline. State distribution is heavy on `idle` (matching 44.3% deadhead baseline).
- **Fleet (commutepass):** 40 vehicles. `floor(40 * adoption)` vehicles are "subscriber-aware" — keyframes cluster near corridor origins during 7–9 AM, move along corridors during 8–9 AM, sit at destinations mid-day, return 5–7 PM. The remaining vehicles use the same wander logic as ondemand.
- **KPIs (ondemand):** baseline curves. Deadhead pct stays high; ETA spikes at peak windows.
- **KPIs (commutepass):** "ideal" curves at adoption=1.0. Deadhead drops, ETA stays flat. Subscriber ETA noticeably lower at peak; non-subscriber ETA matches or beats ondemand baseline (the visible guardrail).

Adoption blend at runtime: `value(t, a) = lerp(ondemand[t], commutepass[t], a)`. Vehicle distribution uses `floor(40 * a)` for the subscriber-aware count.

## Legend redesign (per spike feedback)

- Single horizontal strip directly under the hero, above the panels.
- Four pills: `Idle (deadheading)`, `Repositioning`, `Dispatched`, `With passenger (revenue)`.
- 12px swatch, 13px label. Whitespace between pills.
- A subtle "deadheading is wasted miles" annotation under the legend if space allows.

## Trade-offs taken

- **Vehicles teleport between keyframes** rather than physically traversing roads. Cheaper, simpler, and "good enough" for a 30s loop. If teleporting reads as jittery, add per-frame inter-keyframe smoothing (already implicit in linear interpolation).
- **No persistence.** Simulation regenerates with the same seed on every load.
- **No accessibility pass yet.** Demo is visual; class-demo audience is sighted reviewers. Document this explicitly in `SPEC.md` known limitations.
- **No pointer events on vehicles.** Hover-tooltips deferred. The legend is the only color-decoder for v1.

## Risks introduced by this spec

- The animation architecture is finicky. If a child component accidentally takes a React-state-driven prop that the rAF loop is also writing, perf drops. Mitigation: code review with this spec in hand; explicit comment on every ref-driven node.
- The seeded sim might produce occasional "ugly" frames (vehicles overlapping, leaving the city outline). Mitigation: clamp positions to the SF bounding shape during keyframe generation.

## Validation

Validation spec lives at `001-mvp-supply-page-validation.md`, written after implementation. Acceptance criteria pulled from the plan spec verbatim plus:

- [ ] `simData` generated once per page load (verify via `console.log` or React DevTools).
- [ ] No re-render of `Panel` during autoplay (verify via React DevTools profiler).
- [ ] FPS sustained ≥55 during autoplay with both panels visible.
