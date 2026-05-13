import type { AllocatorOutput, ConstraintCheck } from "./schemas";

// Server- and client-side validators for the three hard constraints. LLMs are
// unreliable at numerical floors — we ALWAYS post-validate and surface failures
// in the UI as red badges rather than silently retrying.

export function checkConstraints(decision: AllocatorOutput): ConstraintCheck[] {
  const reserve = decision.fleet_state_after.on_demand_reserve_pct;
  const corridorCaps = decision.corridor_impacts.map((c) => c.corridor_cap_usage_pct);
  const maxCap = corridorCaps.length ? Math.max(...corridorCaps) : 0;
  const reassignTime = decision.no_show_handling.avg_reassignment_time_minutes;

  return [
    {
      rule: "on_demand_floor",
      passed: reserve >= 0.15,
      detail: `on_demand_reserve_pct = ${reserve.toFixed(2)} (required ≥ 0.15)`,
    },
    {
      rule: "corridor_caps",
      passed: maxCap <= 0.60,
      detail: `max corridor_cap_usage_pct = ${maxCap.toFixed(2)} (required ≤ 0.60)`,
    },
    {
      rule: "reassignment_sla",
      passed: reassignTime <= 4.0,
      detail: `avg_reassignment_time = ${reassignTime.toFixed(2)} min (required ≤ 4.0)`,
    },
  ];
}
