# Domain — Waymo Commute Pass strategic context

What an agent working on Logan's supply view needs to know that isn't derivable from the code.

## The flywheel

Scheduled commuters → advance demand signal → smarter pre-positioning → lower deadheading → shorter ETAs → more riders → more data → safer / better service → more riders.

Logan's view dramatizes the **middle three steps** (advance signal → pre-positioning → deadhead/ETA improvement). Counters and visualizations should reinforce this causal chain, not just show "with vs. without."

## Numbers that anchor the simulation

| Metric | Baseline (on-demand only) | Aspirational (with Commute Pass) | Source |
|---|---|---|---|
| Deadhead % of VMT | 44.3% | ~25% | Brief; "with" is informed assumption |
| Avg ETA (peak) | 5.7 min | ~3.2 min (matching Uber) | Brief |
| Fleet | ~3,000 vehicles, 11 cities | same | Brief |
| Missed demand at peak | high | low | Simulated |

The "with" numbers are **aspirational**. We are simulating, not reporting. Be honest in design — frame as "what Commute Pass could deliver," not "what it does deliver." Label simulated values as such in the UI.

## Framing rules the demo must respect

- **Safety is Waymo's moat.** The supply story is about *predictability*, not raw efficiency. Don't dramatize speed or aggressive routing.
- **On-demand riders are not the enemy.** A Commute Pass benefit that crowds out non-subscribers is a failure mode, not a feature. Per the brief, on-demand ETA is a *guardrail metric*. The "with" panel should show non-subscribers also benefiting (shorter ETAs across the board).
- **Premium brand.** No discount-coded gimmicks. Show value through reliability and time-savings, not price.

## Audience for this demo

Class panel + Waymo-adjacent reviewers. They will scrutinize whether the data viz tells an honest story. Anchor every number to a source in the brief or visibly label it as a simulated assumption.
