# Supply Allocation Agent — Eval Plan

Deferred until Logan supplies eval inputs. This doc captures the framework so we're ready to wire it up when the time comes.

## What gets graded

Each eval case is:

```typescript
interface EvalCase {
  id: string;
  description: string;
  input: AllocatorInput;
  // Programmatic assertions on the output. Each returns pass/fail + detail.
  assertions: Array<{
    name: string;
    check: (output: AllocatorOutput, input: AllocatorInput) => { pass: boolean; detail: string };
  }>;
  // Optional LLM-judge prompt for qualitative checks (recommendation quality, reason field quality).
  judgeRubric?: string;
}
```

## Three layers of grading

1. **Hard-constraint checks** (always run): the same checks the API route runs — `on_demand_reserve_pct >= 0.15`, `corridor_cap_usage_pct <= 0.60`, `avg_reassignment_time_minutes <= 4.0`. These are non-negotiable; failures count against the agent.

2. **Scenario-specific assertions**: per-eval programmatic checks. Examples:
   - Phoenix morning rush: `assert vehicle_assignments where action=assign_to_scheduled has length >= 38`
   - Weather disruption: `assert disruption_response.speed_compensation_applied === true`
   - Cold start (Austin): `assert tradeoff_summary.recommendation contains "insufficient data" or "scheduled commitments"`
   - Systemic no-show: `assert no_show_handling.pattern_detected === "systemic_spike" when input rate > 0.30`

3. **LLM-as-judge** (qualitative): run a second Claude call with a rubric that grades the `tradeoff_summary.recommendation` and a sample of `vehicle_assignments[].reason` fields. Rubric checks for:
   - Specificity (cites numbers, not generic claims)
   - Tradeoff surfacing (names what's being traded for what)
   - Operator-actionability (what should ops watch?)

   Output: a 1–5 score per rubric dimension.

## Eval runner UI (`/supply/allocator/evals`)

A separate page in the allocator section:

- **Left:** eval list (loaded from `app/supply/allocator/lib/evalCases.ts` once Logan provides them)
- **Top:** "Run all" button + per-eval "Run" buttons
- **Right (per-eval result):**
  - Pass/fail badges per layer (hard constraints, scenario assertions, judge scores)
  - Diff view of agent output vs. expected (where applicable)
  - Token usage + latency per run

Results are stored in memory (React state) for the session — no database. For longitudinal tracking, the simplest path is to copy results to clipboard / paste into a separate doc.

## What this isn't

- Not a regression suite for the system prompt. We'd need that eventually — version the prompt, run evals against each version, track score drift over time. But that's a v2 problem.
- Not a model A/B harness (Sonnet vs. Opus). Same v2 — once we have an eval set with confidence intervals, switching models is a small change to the API route.
- Not connected to a real fleet. All eval inputs are synthetic.

## Open questions for when Logan ships eval data

- What format does the eval data come in? (JSON files, single object per case? Bulk JSON array? CSV?)
- How many eval cases? (Eyeballing the spec: 10–30 cases covering happy path, edge cases, and failure modes.)
- Does Logan want stored "expected" outputs to compare against, or is it purely assertion-based grading?
