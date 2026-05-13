// Canonical input/output contracts for the Supply Allocation Agent.
// Source of truth: docs/supply/allocator/schemas.md. Keep in sync.

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
  pickup_time: string;
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
  estimated_speed_reduction_pct: number;
  estimated_duration_minutes: number;
}

export interface AllocatorInput {
  city: string;
  timestamp: string;
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
  subscription_density_pct: number;
  historical_no_show_rate: number;
  market_maturity_days: number;
}

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
  on_demand_reserve_pct: number;
  utilization_rate: number;
}

export interface CorridorImpact {
  corridor_id: string;
  scheduled_vehicles_allocated: number;
  corridor_cap_usage_pct: number;
  predicted_on_demand_eta_minutes: number;
  eta_delta_vs_baseline_pct: number;
  alert: string | null;
}

export interface NoShowHandling {
  probable_no_shows: number;
  vehicles_released: number;
  avg_reassignment_time_minutes: number;
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

// ─── API envelope ─────────────────────────────────────────────────────────

export type ConstraintRule = "on_demand_floor" | "corridor_caps" | "reassignment_sla";

export interface ConstraintCheck {
  rule: ConstraintRule;
  passed: boolean;
  detail: string;
}

export interface TokenUsage {
  input: number;
  output: number;
  cached_input: number;
  cache_creation_input: number;
}

export interface AllocatorResponse {
  decision: AllocatorOutput;
  constraint_checks: ConstraintCheck[];
  latency_ms: number;
  tokens: TokenUsage;
}

// ─── Eval framework ───────────────────────────────────────────────────────

export interface AssertionResult {
  pass: boolean;
  detail: string;
}

export interface EvalAssertion {
  name: string;
  check: (output: AllocatorOutput, input: AllocatorInput) => AssertionResult;
}

export interface EvalCase {
  id: string;
  label: string;
  category:
    | "baseline"
    | "no_show"
    | "disruption"
    | "fleet_constraint"
    | "new_market"
    | "edge";
  description: string;
  input: AllocatorInput;
  // Cases marked as "critical" must pass for launch (per Logan's eval set methodology:
  // 100% required on no-show recovery cases + fleet capacity guardrail).
  critical: boolean;
  assertions: EvalAssertion[];
}

export interface EvalResult {
  caseId: string;
  passed: boolean;
  hardConstraintsPass: boolean;
  assertions: Array<{ name: string; pass: boolean; detail: string }>;
  hardConstraints: ConstraintCheck[];
  latencyMs: number;
  tokens: TokenUsage;
  error?: string;
}
