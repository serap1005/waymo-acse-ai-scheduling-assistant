# Plan + Impl Spec — Supply Allocation Agent

**ID:** 003-supply-allocation-agent
**Status:** draft — awaiting Logan sign-off
**Date:** 2026-05-13

## Goal

Stand up an LLM-based **Supply Allocation Agent** at `/supply/allocator` so the demo can show fleet allocation decisions in response to structured scenarios. Pure agent, not a chatbot. Structured JSON in, structured JSON out, with hard numerical constraints surfaced as pass/fail badges.

Eventually runs evals (Logan supplies inputs). For v1 we ship the runtime + a 5-scenario sample input library + a constraint-check + map-viz UI. Eval runner is a v1.1 add-on at `/supply/allocator/evals` once Logan delivers eval data.

## Architecture

### New API route — `app/api/allocate/route.ts`

- POST endpoint. Body = `AllocatorInput` JSON.
- Reuses Sera's `ANTHROPIC_API_KEY` env var. Reuses her `@anthropic-ai/sdk` install — no new deps.
- Uses **tool-use** to force structured output: defines an `emit_allocation_decision` tool whose `input_schema` is the canonical `AllocatorOutput` JSON Schema. `tool_choice` forces the model to call it.
- Uses **prompt caching** (`cache_control: ephemeral`) on the system prompt so back-to-back decision cycles in a single session pay the prompt cost once.
- Server-side constraint checks (hard rules: on-demand floor, corridor caps, reassignment SLA) run after the model returns. Failures don't block the response — they surface in the UI as red badges.
- No PII/injection guardrails. Input is structured JSON, not user prose — those checks don't apply. Rate limiting (~20 req/IP/min) reuses Sera's pattern verbatim for safety.

### New route — `app/supply/allocator/`

```
app/supply/allocator/
  page.tsx                       Test bench. Two-column: input left, output right.
  components/
    InputEditor.tsx              Sample picker (dropdown of 5 scenarios) + JSON textarea + Run button + status.
    OutputViewer.tsx             Container for the three output sections.
    TradeoffCard.tsx             Big readable card with tradeoff_summary.recommendation + key metrics.
    ConstraintBadges.tsx         Pass/fail pills for the 3 hard constraints + scenario-specific warnings.
    AssignmentMap.tsx            Reuses LA SVG; renders vehicles at target_location, color-coded by action.
    JsonViewer.tsx               Collapsible pretty-printed JSON with copy button.
    AllocatorEmpty.tsx           "Pick a scenario or paste JSON to start" placeholder.
  lib/
    schemas.ts                   TypeScript types (see docs/supply/allocator/schemas.md).
    systemPrompt.ts              Exports the system prompt as a const string. Source of truth lives in
                                 docs/supply/allocator/system-prompt.md and is mirrored here.
    toolSchema.ts                JSON Schema for emit_allocation_decision tool (mirror of AllocatorOutput).
    sampleInputs.ts              5 hand-built scenarios: PHX morning rush, LA evening + weather,
                                 Austin cold start, near-floor edge case, systemic no-show spike.
    callAllocator.ts             Client-side fetch helper.
    constraintChecks.ts          Programmatic hard-constraint validators (mirror server-side).
```

### Map visualization (`AssignmentMap.tsx`)

Reuses `lib/la.ts` neighborhood positions + SF outline-less grid. Each vehicle in the agent's output rendered as a dot at `target_location`, color-coded by action:

| Action | Color | Visual |
|---|---|---|
| `assign_to_scheduled` | `#3B82F6` blue | Solid dot, blue ring |
| `reposition_to_staging` | `#F59E0B` amber | Solid dot, dashed amber arrow from current to target |
| `release_to_on_demand` | `#22D3EE` teal | Solid dot |
| `hold_position` | `#6B7280` gray | Solid dot, no ring |
| `reroute` | `#EF4444` red | Solid dot, dashed red line on new route |

Map size: ~50% of the right column. Smaller than the main `/supply` panels — it's a supporting visualization, not the centerpiece.

## Files to create or change

| Path | Change | Notes |
|---|---|---|
| `app/api/allocate/route.ts` | New | Agent endpoint. ~80 lines. |
| `app/supply/allocator/page.tsx` | New | Page shell. |
| `app/supply/allocator/components/*.tsx` | New | 7 components per the tree above. |
| `app/supply/allocator/lib/*.ts` | New | 6 lib files per the tree above. |
| `app/supply/page.tsx` | Edit | Add a small "→ Allocator" link in the header or footer. |
| `docs/supply/allocator/system-prompt.md` | Already written | Canonical prompt. |
| `docs/supply/allocator/schemas.md` | Already written | Canonical types. |
| `docs/supply/allocator/eval-plan.md` | Already written | Eval framework (deferred build). |
| `docs/supply/SPEC.md` | Edit | New iteration log entry. |
| `docs/supply/PROGRESS.md` | Edit | Track allocator workstream. |

**Not touched:** Sera's files, `app/layout.tsx`, `app/globals.css`. The ViewSwitcher already routes everything Logan-side; no need to add an "Allocator" tab — `/supply/allocator` is reachable via a link from `/supply`.

## Sample inputs (5 scenarios)

1. **Phoenix weekday morning rush** — baseline. 280 available, 47 scheduled, no disruptions, 25% subscription density.
2. **LA evening rush + weather** — 320 available, 62 scheduled, 1 weather disruption (0.25 speed reduction), tests pre-positioning multiplier + speed compensation.
3. **Austin cold start** — 180 available, 28 scheduled, `market_maturity_days = 12`, thin `on_demand_forecast`. Tests new-market behavior.
4. **Phoenix mid-rush, near-floor edge** — 200 available, 65 scheduled (heavy load), tests on-demand floor protection.
5. **LA morning, systemic no-show spike** — 300 available, 55 scheduled, `historical_no_show_rate = 0.34`, several `no_response` rides. Tests the `systemic_spike` pattern detection.

## Risks

- **LLM unreliability on numerical constraints.** Mitigation: tool use enforces schema; server-side checks flag violations; no silent retries.
- **System prompt length.** ~1,800 tokens with prompt caching → cheap. Without caching, each call adds ~$0.005. Caching essential.
- **Map viz cognitive load.** With 30+ vehicles and 5 action types, the map could get busy. Mitigation: clear legend, hover tooltips deferred to v1.1, action filter pills if needed.
- **Tool schema drift.** If `AllocatorOutput` TypeScript type and `toolSchema.ts` JSON Schema drift apart, the API breaks silently. Mitigation: write `toolSchema.ts` and `schemas.ts` together with a comment cross-referencing each other. (Future: derive one from the other via Zod or similar.)

## Risks I'd push back on if Logan raised them

- **"Why not a Python optimization solver?"** Because the spec is explicitly an *LLM agent* with judgment + tradeoff articulation, not a deterministic LP. The point of evals is to test whether an LLM can reason well about these constraints.
- **"Why not stream the response?"** Tool use doesn't stream well, and the output is small (~1-3 KB JSON). Not worth the complexity.
- **"Why not embed in `/supply` instead of a sub-route?"** Two reasons. (a) The `/supply` page is the audience-facing demo; allocator is a power-user tool. (b) The map viz would compete with the existing fleet panels. Separation is cleaner.

## Acceptance

- [ ] `/supply/allocator` page renders, sample picker shows 5 scenarios
- [ ] Selecting a sample populates the JSON textarea; clicking Run hits the API
- [ ] Loading state visible during the ~2-5s API call
- [ ] On success: tradeoff card, constraint badges, map, and JSON viewer all populate
- [ ] Hard-constraint failures (if any) render as red badges with the failing metric
- [ ] Map shows vehicles at target_location, color-coded by action, with a legend
- [ ] JSON viewer is collapsible, has a "copy" button
- [ ] Manual JSON paste works (textarea accepts arbitrary valid input)
- [ ] Prompt caching is active (verify via response.usage.cache_creation_input_tokens + cache_read_input_tokens)
- [ ] `npm run build` exits 0
- [ ] Sera's `/` route unaffected

## Out of scope for v1

- Sim-derived input (generate AllocatorInput from current /supply scrubber state) — adds v1.5
- Eval runner page — adds v1.1 when Logan supplies eval data
- Per-vehicle hover tooltips on the map — v1.1
- Model A/B (Sonnet vs. Opus) — v2
- Persistent eval history — v2

## Build order

1. **lib first** — types (schemas.ts), tool schema (toolSchema.ts), system prompt (systemPrompt.ts), sample inputs (sampleInputs.ts), constraint checks (constraintChecks.ts), client helper (callAllocator.ts)
2. **API route** — app/api/allocate/route.ts (with prompt caching from day one)
3. **Components** — InputEditor → OutputViewer → TradeoffCard → ConstraintBadges → AssignmentMap → JsonViewer → AllocatorEmpty
4. **Page** — wires it all together
5. **Link from /supply** — small "→ Allocator" affordance in the header

Build behind the claude-api skill since we're authoring an Anthropic SDK app with prompt caching and tool use.
