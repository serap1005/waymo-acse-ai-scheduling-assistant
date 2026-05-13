# Supply Allocation Agent — Schemas

Input and output contracts for the agent. The output is enforced as a tool-use schema at the SDK boundary; input is validated in the API route before sending to the model.

## TypeScript types (lib/schemas.ts)

```typescript
// ─── Input ───────────────────────────────────────────────────────────────

export type TimeWindow = "morning_rush" | "midday" | "evening_rush" | "late_night";
export type DayType = "weekday" | "weekend" | "holiday" | "day_after_holiday";
export type VehicleStatus =
  | "idle"
  | "en_route_to_pickup"
  | "en_route_to_staging"
  | "occupied"
  | "charging";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface FleetVehicle {
  vehicle_id: string;
  status: VehicleStatus;
  current_location: LatLng;
  current_corridor: string;
  eta_to_idle_minutes: number;
}

export interface ScheduledRide {
  ride_id: string;
  rider_id: string;
  pickup_location: LatLng;
  pickup_corridor: string;
  pickup_time: string; // ISO 8601
  dropoff_corridor: string;
  confirmation_status: "confirmed" | "pending" | "no_response";
  minutes_until_pickup: number;
}

export interface CorridorForecast {
  corridor_id: string;
  predicted_requests_next_30min: number;
  predicted_requests_next_60min: number;
  current_avg_eta_minutes: number;
  baseline_avg_eta_minutes: number;
}

export type DisruptionType = "road_closure" | "weather" | "event" | "traffic_anomaly";
export type Severity = "low" | "medium" | "high";

export interface Disruption {
  type: DisruptionType;
  description: string;
  affected_corridors: string[];
  severity: Severity;
  estimated_speed_reduction_pct: number; // 0.0 – 1.0
  estimated_duration_minutes: number;
}

export interface AllocatorInput {
  city: string;
  timestamp: string; // ISO 8601
  time_window: TimeWindow;
  day_type: DayType;
  fleet: {
    total_vehicles: number;
    available_vehicles: number;
    vehicles: FleetVehicle[];
  };
  scheduled_rides: ScheduledRide[];
  on_demand_forecast: {
    corridors: CorridorForecast[];
  };
  disruptions: Disruption[];
  subscription_density_pct: number; // 0.0 – 1.0
  historical_no_show_rate: number; // 0.0 – 1.0
  market_maturity_days: number;
}

// ─── Output ──────────────────────────────────────────────────────────────

export type VehicleAction =
  | "reposition_to_staging"
  | "assign_to_scheduled"
  | "release_to_on_demand"
  | "hold_position"
  | "reroute";

export interface VehicleAssignment {
  vehicle_id: string;
  action: VehicleAction;
  target_location: LatLng;
  target_corridor: string;
  assigned_ride_id: string | null;
  reason: string;
  estimated_arrival_minutes: number;
}

export interface FleetStateAfter {
  vehicles_assigned_scheduled: number;
  vehicles_assigned_on_demand: number;
  vehicles_repositioning: number;
  vehicles_idle: number;
  on_demand_reserve_pct: number; // must be >= 0.15
  utilization_rate: number; // 0.0 – 1.0
}

export interface CorridorImpact {
  corridor_id: string;
  scheduled_vehicles_allocated: number;
  corridor_cap_usage_pct: number; // must be <= 0.60
  predicted_on_demand_eta_minutes: number;
  eta_delta_vs_baseline_pct: number; // positive = slower
  alert: string | null;
}

export interface NoShowHandling {
  probable_no_shows: number;
  vehicles_released: number;
  avg_reassignment_time_minutes: number; // must be <= 4.0
  pattern_detected: string | null;
}

export type WarningType =
  | "on_demand_floor_risk"
  | "corridor_cap_risk"
  | "eta_degradation";

export interface CapacityWarning {
  corridor_id: string;
  warning_type: WarningType;
  detail: string;
  severity: Severity;
}

export interface TradeoffSummary {
  scheduled_eta_compliance_pct: number;
  on_demand_eta_impact_pct: number;
  deadheading_rate_pct: number;
  capacity_warnings: CapacityWarning[];
  recommendation: string;
}

export interface DisruptionResponse {
  active_disruptions: number;
  rerouted_rides: number;
  eta_adjustments_communicated: number;
  speed_compensation_applied: boolean;
}

export interface AllocatorOutput {
  timestamp: string;
  decision_id: string;
  vehicle_assignments: VehicleAssignment[];
  fleet_state_after: FleetStateAfter;
  corridor_impacts: CorridorImpact[];
  no_show_handling: NoShowHandling;
  tradeoff_summary: TradeoffSummary;
  disruption_response: DisruptionResponse;
}

// ─── API response envelope ───────────────────────────────────────────────

export interface ConstraintCheck {
  rule: "on_demand_floor" | "corridor_caps" | "reassignment_sla";
  passed: boolean;
  detail: string;
}

export interface AllocatorResponse {
  decision: AllocatorOutput;
  constraint_checks: ConstraintCheck[];
  latency_ms: number;
  tokens: { input: number; output: number; cached_input: number };
}
```

## Tool definition

The Anthropic API call uses `tools` + `tool_choice` to force structured output. The tool's `input_schema` is the JSON Schema equivalent of `AllocatorOutput` — generated from the TypeScript types or hand-written, depending on what's cleaner. We'll hand-write it for the first pass to keep dependencies thin (no Zod, no JSON Schema generator).

```typescript
const ALLOCATION_TOOL = {
  name: "emit_allocation_decision",
  description:
    "Emit the supply allocation decision for this cycle. Every field is required.",
  input_schema: { /* JSON Schema mirror of AllocatorOutput */ },
};

// In the API call:
const response = await client.messages.create({
  model: "claude-sonnet-4-5",
  max_tokens: 4096,
  system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
  tools: [ALLOCATION_TOOL],
  tool_choice: { type: "tool", name: "emit_allocation_decision" },
  messages: [{ role: "user", content: JSON.stringify(input) }],
});

const toolUse = response.content.find((c) => c.type === "tool_use");
const decision = toolUse?.input as AllocatorOutput;
```

## Server-side constraint checks

Even though the prompt and tool schema enforce structure, LLMs are unreliable at numerical floors. The API route post-validates:

```typescript
function checkConstraints(decision: AllocatorOutput): ConstraintCheck[] {
  return [
    {
      rule: "on_demand_floor",
      passed: decision.fleet_state_after.on_demand_reserve_pct >= 0.15,
      detail: `on_demand_reserve_pct = ${decision.fleet_state_after.on_demand_reserve_pct}`,
    },
    {
      rule: "corridor_caps",
      passed: decision.corridor_impacts.every((c) => c.corridor_cap_usage_pct <= 0.60),
      detail: `max cap usage = ${Math.max(...decision.corridor_impacts.map((c) => c.corridor_cap_usage_pct))}`,
    },
    {
      rule: "reassignment_sla",
      passed: decision.no_show_handling.avg_reassignment_time_minutes <= 4.0,
      detail: `avg reassignment = ${decision.no_show_handling.avg_reassignment_time_minutes} min`,
    },
  ];
}
```

If any check fails, the response still returns the agent's output — we surface the failures in the UI as red badges so the operator (and future evals) can grade the agent's reliability on hard constraints. We do **not** silently retry — that hides agent quality issues.
