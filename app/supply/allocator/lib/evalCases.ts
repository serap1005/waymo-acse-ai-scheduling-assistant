// Eval cases for the Waymo Supply Allocation Agent.
//
// Source of truth: "Commute Pass Dispatch Model - Eval Set" (18 cases).
// Each case ships a full AllocatorInput plus programmatic assertions over
// the AllocatorOutput. Hard constraint checks (on_demand_floor, corridor_caps,
// reassignment_sla) are run independently by the eval runner via
// ConstraintCheck — assertions here cover scenario-specific pass criteria.
//
// Categories: baseline | no_show | disruption | fleet_constraint | new_market | edge
//
// Critical cases (must pass for launch, per the eval set methodology):
//   - 5, 6, 7, 8  (no-show recovery)
//   - 15          (fleet capacity guardrail)
// All others are non-critical (failures inform iteration, not block launch).

import type {
  AllocatorInput,
  AllocatorOutput,
  AssertionResult,
  CorridorForecast,
  Disruption,
  EvalAssertion,
  EvalCase,
  FleetVehicle,
  ScheduledRide,
  VehicleAssignment,
} from "./schemas";

// ─── Helpers ──────────────────────────────────────────────────────────────

const PHX = { lat: 33.45, lng: -112.07 };
const LA = { lat: 34.05, lng: -118.24 };
const AUSTIN = { lat: 30.27, lng: -97.74 };

function jitter(base: number, spread = 0.05): number {
  // Deterministic-ish spread for plausibility (no Math.random — eval inputs
  // must be stable across runs).
  return Math.round((base + (spread * (Math.sin(base * 1000) % 1))) * 10000) / 10000;
}

function vehicle(
  id: string,
  city: { lat: number; lng: number },
  corridor: string,
  status: FleetVehicle["status"],
  etaToIdle: number,
  offset: number,
): FleetVehicle {
  return {
    vehicle_id: id,
    status,
    current_location: {
      lat: jitter(city.lat + offset * 0.003),
      lng: jitter(city.lng + offset * 0.004),
    },
    current_corridor: corridor,
    eta_to_idle_minutes: etaToIdle,
  };
}

function ride(
  id: string,
  rider: string,
  city: { lat: number; lng: number },
  pickupCorridor: string,
  dropoffCorridor: string,
  minutesUntil: number,
  confirmation: ScheduledRide["confirmation_status"],
  pickupTimeIso: string,
  offset: number,
): ScheduledRide {
  return {
    ride_id: id,
    rider_id: rider,
    pickup_location: {
      lat: jitter(city.lat + offset * 0.004),
      lng: jitter(city.lng + offset * 0.005),
    },
    pickup_corridor: pickupCorridor,
    pickup_time: pickupTimeIso,
    dropoff_corridor: dropoffCorridor,
    confirmation_status: confirmation,
    minutes_until_pickup: minutesUntil,
  };
}

function corridorForecast(
  id: string,
  next30: number,
  next60: number,
  currentEta: number,
  baselineEta: number,
): CorridorForecast {
  return {
    corridor_id: id,
    predicted_requests_next_30min: next30,
    predicted_requests_next_60min: next60,
    current_avg_eta_minutes: currentEta,
    baseline_avg_eta_minutes: baselineEta,
  };
}

// Build a representative fleet sample (12–25 vehicles) for a given city.
function buildFleetSample(
  city: { lat: number; lng: number },
  count: number,
  corridors: string[],
): FleetVehicle[] {
  const statuses: FleetVehicle["status"][] = [
    "idle",
    "idle",
    "idle",
    "en_route_to_pickup",
    "en_route_to_staging",
    "occupied",
    "occupied",
    "charging",
  ];
  const out: FleetVehicle[] = [];
  for (let i = 0; i < count; i++) {
    const id = `V${String(i + 1).padStart(3, "0")}`;
    const status = statuses[i % statuses.length];
    const eta = status === "idle" ? 0 : 2 + (i % 8);
    const corridor = corridors[i % corridors.length];
    out.push(vehicle(id, city, corridor, status, eta, i));
  }
  return out;
}

// Build a representative scheduled-ride sample.
function buildRideSample(
  city: { lat: number; lng: number },
  count: number,
  corridors: string[],
  pickupTimeIso: string,
  options?: {
    confirmationMix?: { confirmed: number; pending: number; no_response: number };
    minutesRange?: [number, number];
    asymmetric?: boolean; // most rides go suburb → downtown
  },
): ScheduledRide[] {
  const mix = options?.confirmationMix ?? { confirmed: 0.78, pending: 0.18, no_response: 0.04 };
  const [minMin, maxMin] = options?.minutesRange ?? [5, 45];
  const out: ScheduledRide[] = [];
  for (let i = 0; i < count; i++) {
    const id = `R${String(i + 1).padStart(3, "0")}`;
    const rider = `U${String(1000 + i)}`;
    const t = i / Math.max(1, count - 1);
    const r = (i * 0.371) % 1; // deterministic pseudo-random
    let confirmation: ScheduledRide["confirmation_status"];
    if (r < mix.confirmed) confirmation = "confirmed";
    else if (r < mix.confirmed + mix.pending) confirmation = "pending";
    else confirmation = "no_response";
    const minutesUntil = Math.round(minMin + t * (maxMin - minMin));
    const pickupCorridor = options?.asymmetric
      ? corridors[i % 2] // suburb corridors
      : corridors[i % corridors.length];
    const dropoffCorridor = options?.asymmetric
      ? corridors[Math.min(corridors.length - 1, 3 + (i % 2))] // downtown corridors
      : corridors[(i + 2) % corridors.length];
    out.push(
      ride(id, rider, city, pickupCorridor, dropoffCorridor, minutesUntil, confirmation, pickupTimeIso, i),
    );
  }
  return out;
}

// Standard assertion result helper.
const ok = (detail: string): AssertionResult => ({ pass: true, detail });
const fail = (detail: string): AssertionResult => ({ pass: false, detail });

// ─── Reusable assertions ──────────────────────────────────────────────────

const assertScheduledEtaCompliance =
  (toleranceMin = 2): EvalAssertion => ({
    name: `Scheduled ride ETA within ${toleranceMin} min of target pickup`,
    check: (output: AllocatorOutput, input: AllocatorInput): AssertionResult => {
      const scheduledAssignments = output.vehicle_assignments.filter(
        (a) => a.action === "assign_to_scheduled" && a.assigned_ride_id,
      );
      if (scheduledAssignments.length === 0) {
        return fail("No scheduled assignments emitted; expected at least one.");
      }
      const violations: string[] = [];
      for (const a of scheduledAssignments) {
        const r = input.scheduled_rides.find((x) => x.ride_id === a.assigned_ride_id);
        if (!r) {
          violations.push(`${a.vehicle_id}: assigned_ride_id ${a.assigned_ride_id} not in input`);
          continue;
        }
        const slack = r.minutes_until_pickup - a.estimated_arrival_minutes;
        // Negative slack > tolerance = late.
        if (slack < -toleranceMin) {
          violations.push(
            `${a.vehicle_id}→${r.ride_id}: ETA ${a.estimated_arrival_minutes}m vs target ${r.minutes_until_pickup}m (late by ${(-slack).toFixed(1)}m)`,
          );
        }
      }
      const compliancePct =
        (scheduledAssignments.length - violations.length) / scheduledAssignments.length;
      if (violations.length === 0) {
        return ok(`${scheduledAssignments.length}/${scheduledAssignments.length} scheduled ETAs on target.`);
      }
      return fail(
        `${(compliancePct * 100).toFixed(1)}% compliance (${violations.length} late). Examples: ${violations.slice(0, 3).join("; ")}`,
      );
    },
  });

const assertOnDemandFloor: EvalAssertion = {
  name: "On-demand reserve ≥ 15% (hard floor)",
  check: (output: AllocatorOutput): AssertionResult => {
    const pct = output.fleet_state_after.on_demand_reserve_pct;
    return pct >= 0.15
      ? ok(`on_demand_reserve_pct = ${(pct * 100).toFixed(1)}%`)
      : fail(`on_demand_reserve_pct = ${(pct * 100).toFixed(1)}% (< 15% floor)`);
  },
};

const assertCorridorCaps: EvalAssertion = {
  name: "No corridor exceeds 60% scheduled allocation cap",
  check: (output: AllocatorOutput): AssertionResult => {
    const breaches = output.corridor_impacts.filter((c) => c.corridor_cap_usage_pct > 0.6);
    return breaches.length === 0
      ? ok(
          `Max corridor cap usage: ${(Math.max(0, ...output.corridor_impacts.map((c) => c.corridor_cap_usage_pct)) * 100).toFixed(1)}%`,
        )
      : fail(
          `${breaches.length} corridor(s) > 60%: ${breaches.map((b) => `${b.corridor_id}=${(b.corridor_cap_usage_pct * 100).toFixed(1)}%`).join(", ")}`,
        );
  },
};

const assertOnDemandEtaDelta = (maxPct: number): EvalAssertion => ({
  name: `On-demand ETA delta vs baseline ≤ ${(maxPct * 100).toFixed(0)}%`,
  check: (output: AllocatorOutput): AssertionResult => {
    const worst = output.corridor_impacts.reduce(
      (m, c) => (c.eta_delta_vs_baseline_pct > m ? c.eta_delta_vs_baseline_pct : m),
      0,
    );
    return worst <= maxPct
      ? ok(`Worst corridor ETA delta: +${(worst * 100).toFixed(1)}%`)
      : fail(`Worst corridor ETA delta: +${(worst * 100).toFixed(1)}% exceeds +${(maxPct * 100).toFixed(0)}%`);
  },
});

const assertReassignmentSla: EvalAssertion = {
  name: "Released vehicles reassigned within 4 min (SLA)",
  check: (output: AllocatorOutput): AssertionResult => {
    const t = output.no_show_handling.avg_reassignment_time_minutes;
    if (output.no_show_handling.vehicles_released === 0) {
      return ok("No vehicles released; SLA not exercised.");
    }
    return t <= 4.0
      ? ok(`avg_reassignment_time = ${t.toFixed(2)} min`)
      : fail(`avg_reassignment_time = ${t.toFixed(2)} min (> 4.0 min SLA)`);
  },
};

const assertRecommendationMentions = (...keywords: string[]): EvalAssertion => ({
  name: `Recommendation surfaces: ${keywords.join(" / ")}`,
  check: (output: AllocatorOutput): AssertionResult => {
    const rec = (output.tradeoff_summary.recommendation || "").toLowerCase();
    const hits = keywords.filter((k) => rec.includes(k.toLowerCase()));
    return hits.length > 0
      ? ok(`Found: ${hits.join(", ")}`)
      : fail(`Recommendation lacks any of [${keywords.join(", ")}]. Got: "${output.tradeoff_summary.recommendation.slice(0, 160)}…"`);
  },
});

// ──────────────────────────────────────────────────────────────────────────
// CASE BUILDERS
// ──────────────────────────────────────────────────────────────────────────

// ─── BASELINE (cases 1–4) ─────────────────────────────────────────────────

const CASE_1: EvalCase = {
  id: "case-1",
  label: "Phoenix · Weekday morning rush · medium density · no disruption · full fleet",
  category: "baseline",
  description:
    "Canonical happy path: 25% subscription density, ~280 available vehicles, ~42 scheduled pickups in next 45 min, 2 corridors running hot on on-demand ETA. Agent should pre-position vehicles for confirmed scheduled rides, provisionally assign pending ones, and reposition idle vehicles toward elevated-ETA corridors without breaching the 15% on-demand floor.",
  input: {
    city: "Phoenix",
    timestamp: "2026-05-13T08:00:00-07:00",
    time_window: "morning_rush",
    day_type: "weekday",
    fleet: {
      total_vehicles: 300,
      available_vehicles: 282,
      vehicles: buildFleetSample(PHX, 20, ["C1", "C2", "C3", "C4", "C5", "C7", "C12"]),
    },
    scheduled_rides: buildRideSample(
      PHX,
      42,
      ["C1", "C2", "C3", "C4", "C5"],
      "2026-05-13T08:30:00-07:00",
      { confirmationMix: { confirmed: 0.81, pending: 0.14, no_response: 0.05 } },
    ),
    on_demand_forecast: {
      corridors: [
        corridorForecast("C1", 14, 27, 5.1, 4.5),
        corridorForecast("C2", 11, 22, 5.8, 5.0),
        corridorForecast("C3", 8, 16, 4.8, 4.6),
        corridorForecast("C4", 6, 13, 4.2, 4.0),
        corridorForecast("C5", 9, 18, 5.0, 4.8),
        corridorForecast("C7", 18, 33, 7.4, 4.1),
        corridorForecast("C12", 16, 29, 6.9, 4.5),
      ],
    },
    disruptions: [],
    subscription_density_pct: 0.25,
    historical_no_show_rate: 0.05,
    market_maturity_days: 365,
  },
  critical: false,
  // Pass criteria (per eval set): Scheduled ride ETA ≤ 2 min of target;
  // on-demand ETA does not increase >10% vs. baseline.
  assertions: [
    assertScheduledEtaCompliance(2),
    assertOnDemandEtaDelta(0.1),
    assertOnDemandFloor,
    assertCorridorCaps,
  ],
};

const CASE_2: EvalCase = {
  id: "case-2",
  label: "Phoenix · Weekday evening rush · high density · no disruption · full fleet",
  category: "baseline",
  description:
    "Evening rush mirror of case 1. Density is higher (38%) so scheduled volume bites harder against the on-demand pool. Agent must keep on_demand_reserve safely above 15% while still meeting most scheduled ETAs, and should begin asymmetric-flow repositioning since most rides flow downtown → suburb.",
  input: {
    city: "Phoenix",
    timestamp: "2026-05-13T17:15:00-07:00",
    time_window: "evening_rush",
    day_type: "weekday",
    fleet: {
      total_vehicles: 310,
      available_vehicles: 290,
      vehicles: buildFleetSample(PHX, 22, ["C1", "C2", "C3", "C4", "C5", "C7", "C12"]),
    },
    scheduled_rides: buildRideSample(
      PHX,
      62,
      ["C1", "C2", "C3", "C4", "C5"],
      "2026-05-13T17:45:00-07:00",
      { confirmationMix: { confirmed: 0.85, pending: 0.12, no_response: 0.03 }, asymmetric: true },
    ),
    on_demand_forecast: {
      corridors: [
        corridorForecast("C1", 21, 38, 6.3, 4.8),
        corridorForecast("C2", 18, 34, 6.0, 4.9),
        corridorForecast("C3", 12, 22, 5.1, 4.7),
        corridorForecast("C4", 9, 18, 4.6, 4.3),
        corridorForecast("C5", 14, 26, 5.4, 5.0),
        corridorForecast("C7", 22, 41, 8.1, 4.4),
        corridorForecast("C12", 17, 32, 7.0, 4.6),
      ],
    },
    disruptions: [],
    subscription_density_pct: 0.38,
    historical_no_show_rate: 0.05,
    market_maturity_days: 365,
  },
  critical: false,
  // Pass criteria (per eval set): Scheduled ETAs met; repositioning begins
  // ≥ 30 min before first evening scheduled pickup.
  assertions: [
    assertScheduledEtaCompliance(2),
    {
      name: "Repositioning begins ≥ 30 min before first evening scheduled pickup",
      check: (output, input) => {
        const firstPickup = Math.min(
          ...input.scheduled_rides.map((r) => r.minutes_until_pickup),
        );
        // Repositioning actions surfaced now (T=0) implicitly start at "now",
        // so we check that they exist while the first pickup is still ≥30 min out.
        const repositioning = output.vehicle_assignments.filter(
          (a) => a.action === "reposition_to_staging",
        );
        if (repositioning.length === 0) {
          return fail(
            `No reposition_to_staging actions emitted; first pickup is ${firstPickup}m out.`,
          );
        }
        return firstPickup >= 30
          ? ok(
              `${repositioning.length} reposition actions started; first pickup ${firstPickup}m out (≥ 30m lead).`,
            )
          : fail(
              `Repositioning starting only ${firstPickup}m before first pickup (needed ≥ 30m lead).`,
            );
      },
    },
    assertOnDemandFloor,
    assertCorridorCaps,
  ],
};

const CASE_3: EvalCase = {
  id: "case-3",
  label: "Phoenix · Saturday midday · low density · no disruption · full fleet",
  category: "baseline",
  description:
    "Weekend midday with sparse scheduled commitments (8% density). Most fleet should be on the on-demand pool. Tests that the agent doesn't over-commit to scheduled rides when scheduled volume is low.",
  input: {
    city: "Phoenix",
    timestamp: "2026-05-16T12:30:00-07:00",
    time_window: "midday",
    day_type: "weekend",
    fleet: {
      total_vehicles: 280,
      available_vehicles: 263,
      vehicles: buildFleetSample(PHX, 18, ["C1", "C2", "C3", "C4", "C5", "C7"]),
    },
    scheduled_rides: buildRideSample(
      PHX,
      9,
      ["C1", "C2", "C3", "C5"],
      "2026-05-16T13:00:00-07:00",
      { confirmationMix: { confirmed: 0.78, pending: 0.22, no_response: 0 } },
    ),
    on_demand_forecast: {
      corridors: [
        corridorForecast("C1", 10, 19, 4.6, 4.4),
        corridorForecast("C2", 8, 15, 4.3, 4.2),
        corridorForecast("C3", 11, 20, 4.9, 4.5),
        corridorForecast("C4", 6, 11, 4.0, 4.0),
        corridorForecast("C5", 9, 17, 4.7, 4.5),
        corridorForecast("C7", 7, 13, 4.4, 4.3),
      ],
    },
    disruptions: [],
    subscription_density_pct: 0.08,
    historical_no_show_rate: 0.05,
    market_maturity_days: 365,
  },
  critical: false,
  // Pass criteria (per eval set): Deadheading rate ≤ baseline; on-demand
  // ETA unchanged vs. non-Commute Pass weekends.
  assertions: [
    {
      name: "Deadheading rate ≤ baseline (≤ 15% assumed for weekend baseline)",
      check: (output) => {
        const rate = output.tradeoff_summary.deadheading_rate_pct;
        // Baseline weekend deadheading assumed ~15%; agent should stay at or below.
        return rate <= 0.15
          ? ok(`deadheading_rate_pct = ${(rate * 100).toFixed(1)}% (≤ 15% baseline)`)
          : fail(
              `deadheading_rate_pct = ${(rate * 100).toFixed(1)}% exceeds 15% weekend baseline.`,
            );
      },
    },
    {
      name: "On-demand ETA unchanged vs. non-Commute Pass weekend baseline (≤ 5% delta)",
      check: (output) => {
        const worst = output.corridor_impacts.reduce(
          (m, c) => (c.eta_delta_vs_baseline_pct > m ? c.eta_delta_vs_baseline_pct : m),
          0,
        );
        return worst <= 0.05
          ? ok(`Worst corridor ETA delta: +${(worst * 100).toFixed(1)}% (≤ 5%)`)
          : fail(
              `Worst corridor ETA delta: +${(worst * 100).toFixed(1)}% — should be effectively unchanged on low-density weekend.`,
            );
      },
    },
    assertOnDemandFloor,
    assertCorridorCaps,
    assertScheduledEtaCompliance(2),
  ],
};

const CASE_4: EvalCase = {
  id: "case-4",
  label: "Phoenix · Late night · low density · no disruption · partial fleet",
  category: "baseline",
  description:
    "Late-night sparse demand with a chunk of fleet charging. Mostly idle distribution; small handful of scheduled rides. Tests graceful behavior under low supply and low demand.",
  input: {
    city: "Phoenix",
    timestamp: "2026-05-13T23:30:00-07:00",
    time_window: "late_night",
    day_type: "weekday",
    fleet: {
      total_vehicles: 280,
      available_vehicles: 188, // ~33% offline (overnight charging)
      vehicles: buildFleetSample(PHX, 16, ["C1", "C2", "C3", "C5", "C7"]),
    },
    scheduled_rides: buildRideSample(
      PHX,
      4,
      ["C1", "C3"],
      "2026-05-14T00:00:00-07:00",
      { confirmationMix: { confirmed: 1.0, pending: 0, no_response: 0 } },
    ),
    on_demand_forecast: {
      corridors: [
        corridorForecast("C1", 3, 6, 5.5, 5.0),
        corridorForecast("C2", 2, 4, 5.1, 5.0),
        corridorForecast("C3", 4, 8, 5.7, 5.0),
        corridorForecast("C5", 2, 5, 5.0, 4.9),
        corridorForecast("C7", 3, 7, 5.4, 5.0),
      ],
    },
    disruptions: [],
    subscription_density_pct: 0.06,
    historical_no_show_rate: 0.05,
    market_maturity_days: 365,
  },
  critical: false,
  // Pass criteria (per eval set): Scheduled ETAs met with no measurable
  // impact on on-demand availability.
  assertions: [
    assertScheduledEtaCompliance(3),
    {
      name: "No measurable impact on on-demand availability (ETA delta ≤ 3%)",
      check: (output) => {
        const worst = output.corridor_impacts.reduce(
          (m, c) => (c.eta_delta_vs_baseline_pct > m ? c.eta_delta_vs_baseline_pct : m),
          0,
        );
        return worst <= 0.03
          ? ok(`Worst corridor ETA delta: +${(worst * 100).toFixed(2)}% (≤ 3%, no measurable impact)`)
          : fail(
              `Worst corridor ETA delta: +${(worst * 100).toFixed(2)}% — sparse scheduled rides should not impact on-demand.`,
            );
      },
    },
    assertOnDemandFloor,
    assertCorridorCaps,
  ],
};

// ─── NO-SHOW RECOVERY (cases 5–8) — critical ──────────────────────────────

const CASE_5: EvalCase = {
  id: "case-5",
  label: "Phoenix · Morning rush · single no-show at T-5 · normal conditions",
  category: "no_show",
  description:
    "One pending scheduled ride hits T-5 with no confirmation → flagged as probable no-show. Agent must release that vehicle and reassign within 4 minutes. This is the foundational no-show recovery case.",
  input: {
    city: "Phoenix",
    timestamp: "2026-05-13T08:15:00-07:00",
    time_window: "morning_rush",
    day_type: "weekday",
    fleet: {
      total_vehicles: 300,
      available_vehicles: 282,
      vehicles: buildFleetSample(PHX, 20, ["C1", "C2", "C3", "C4", "C5"]),
    },
    scheduled_rides: [
      ...buildRideSample(
        PHX,
        24,
        ["C1", "C2", "C3", "C4", "C5"],
        "2026-05-13T08:30:00-07:00",
        { confirmationMix: { confirmed: 0.92, pending: 0.08, no_response: 0 }, minutesRange: [10, 45] },
      ),
      // Inject a definitive no_response at T-5.
      ride("R999", "U9999", PHX, "C2", "C4", 5, "no_response", "2026-05-13T08:20:00-07:00", 11),
    ],
    on_demand_forecast: {
      corridors: [
        corridorForecast("C1", 13, 25, 5.0, 4.6),
        corridorForecast("C2", 10, 19, 5.4, 5.0),
        corridorForecast("C3", 9, 17, 4.7, 4.6),
        corridorForecast("C4", 7, 14, 4.3, 4.1),
        corridorForecast("C5", 8, 15, 4.9, 4.7),
      ],
    },
    disruptions: [],
    subscription_density_pct: 0.25,
    historical_no_show_rate: 0.05,
    market_maturity_days: 365,
  },
  critical: true,
  // Pass criteria (per eval set): Released vehicle is reassigned within 4 min;
  // zero idle time beyond the 5-min confirmation window.
  assertions: [
    {
      name: "Probable no-show detected and vehicle released",
      check: (output) => {
        const n = output.no_show_handling.probable_no_shows;
        const v = output.no_show_handling.vehicles_released;
        if (n < 1) {
          return fail(`probable_no_shows = ${n}; expected ≥ 1 (R999 is no_response at T-5).`);
        }
        return v >= 1
          ? ok(`probable_no_shows = ${n}, vehicles_released = ${v}`)
          : fail(`probable_no_shows = ${n} but vehicles_released = ${v}; expected ≥ 1.`);
      },
    },
    assertReassignmentSla,
    {
      name: "Released vehicle's reassignment surfaced (zero idle time past 5-min window)",
      check: (output) => {
        if (output.no_show_handling.vehicles_released === 0) {
          return ok("No vehicles released; idle-time criterion not exercised.");
        }
        // After release, vehicle should appear in a fresh assignment (not "hold_position").
        const heldVehicles = output.vehicle_assignments.filter(
          (a) => a.action === "hold_position",
        ).length;
        const productiveActions = output.vehicle_assignments.filter(
          (a) =>
            a.action === "release_to_on_demand" ||
            a.action === "reposition_to_staging" ||
            a.action === "assign_to_scheduled",
        ).length;
        return productiveActions >= 1
          ? ok(
              `${productiveActions} productive reassignments after release; ${heldVehicles} held.`,
            )
          : fail(
              `Released vehicle not reassigned to a productive action; ${heldVehicles} held.`,
            );
      },
    },
    assertOnDemandFloor,
  ],
};

const CASE_6: EvalCase = {
  id: "case-6",
  label: "Phoenix · Morning rush · localized no-show cluster · 3 in one corridor",
  category: "no_show",
  description:
    "Three no-shows cluster in corridor C2 within a 15-minute window. Per spec, agent should treat this as a localized pattern — release the three vehicles but NOT assume other C2 scheduled rides will also no-show. No systemic_spike declaration.",
  input: {
    city: "Phoenix",
    timestamp: "2026-05-13T08:15:00-07:00",
    time_window: "morning_rush",
    day_type: "weekday",
    fleet: {
      total_vehicles: 300,
      available_vehicles: 282,
      vehicles: buildFleetSample(PHX, 20, ["C1", "C2", "C3", "C4", "C5"]),
    },
    scheduled_rides: [
      ...buildRideSample(
        PHX,
        18,
        ["C1", "C3", "C4", "C5"],
        "2026-05-13T08:30:00-07:00",
        { confirmationMix: { confirmed: 0.94, pending: 0.06, no_response: 0 }, minutesRange: [10, 45] },
      ),
      // 3 explicit no-shows in C2.
      ride("R901", "U9901", PHX, "C2", "C4", 5, "no_response", "2026-05-13T08:20:00-07:00", 21),
      ride("R902", "U9902", PHX, "C2", "C4", 5, "no_response", "2026-05-13T08:20:00-07:00", 22),
      ride("R903", "U9903", PHX, "C2", "C5", 5, "no_response", "2026-05-13T08:20:00-07:00", 23),
      // Other C2 scheduled rides — should still be served.
      ride("R904", "U9904", PHX, "C2", "C4", 22, "confirmed", "2026-05-13T08:37:00-07:00", 24),
      ride("R905", "U9905", PHX, "C2", "C3", 28, "confirmed", "2026-05-13T08:43:00-07:00", 25),
    ],
    on_demand_forecast: {
      corridors: [
        corridorForecast("C1", 13, 25, 5.0, 4.6),
        corridorForecast("C2", 12, 22, 5.6, 5.0),
        corridorForecast("C3", 9, 17, 4.7, 4.6),
        corridorForecast("C4", 7, 14, 4.3, 4.1),
        corridorForecast("C5", 8, 15, 4.9, 4.7),
      ],
    },
    disruptions: [],
    subscription_density_pct: 0.25,
    historical_no_show_rate: 0.08, // elevated but well below 30%
    market_maturity_days: 365,
  },
  critical: true,
  // Pass criteria (per eval set): All 3 vehicles reassigned within 4 min;
  // remaining scheduled pickups in corridor are unaffected.
  assertions: [
    {
      name: "All 3 clustered no-shows detected and vehicles released",
      check: (output) => {
        const n = output.no_show_handling.probable_no_shows;
        const v = output.no_show_handling.vehicles_released;
        if (n < 3) return fail(`probable_no_shows = ${n}; expected ≥ 3 (cluster R901/R902/R903).`);
        return v >= 3
          ? ok(`probable_no_shows = ${n}, vehicles_released = ${v}`)
          : fail(`Only ${v} vehicles released; expected all 3 cluster vehicles freed.`);
      },
    },
    assertReassignmentSla,
    {
      name: "Remaining C2 scheduled pickups (R904, R905) unaffected",
      check: (output) => {
        const stillServed = ["R904", "R905"].filter((rid) =>
          output.vehicle_assignments.some(
            (a) => a.assigned_ride_id === rid && a.action === "assign_to_scheduled",
          ),
        );
        return stillServed.length === 2
          ? ok(`Both remaining C2 rides served: ${stillServed.join(", ")}`)
          : fail(
              `Only ${stillServed.length}/2 remaining C2 rides served (${stillServed.join(", ") || "none"}) — corridor pickups should not be assumed contagious.`,
            );
      },
    },
    {
      name: "Cluster not misclassified as systemic_spike",
      check: (output) => {
        const p = output.no_show_handling.pattern_detected;
        return p !== "systemic_spike"
          ? ok(`pattern_detected = ${p ?? "null"} (correctly not 'systemic_spike')`)
          : fail(
              `pattern_detected = 'systemic_spike' — 3-in-corridor cluster is localized, not systemic.`,
            );
      },
    },
  ],
};

const CASE_7: EvalCase = {
  id: "case-7",
  label: "Phoenix · Holiday morning (July 4) · systemic no-show spike · 40% rate",
  category: "no_show",
  description:
    "Holiday morning where the historical no-show rate is running at 40% — well above the 30% systemic_spike threshold. Agent must (a) declare pattern_detected='systemic_spike' and (b) progressively shift allocation from scheduled-priority toward on-demand.",
  input: {
    city: "Phoenix",
    timestamp: "2026-07-04T08:00:00-07:00",
    time_window: "morning_rush",
    day_type: "holiday",
    fleet: {
      total_vehicles: 300,
      available_vehicles: 280,
      vehicles: buildFleetSample(PHX, 20, ["C1", "C2", "C3", "C4", "C5"]),
    },
    scheduled_rides: buildRideSample(
      PHX,
      30,
      ["C1", "C2", "C3", "C4", "C5"],
      "2026-07-04T08:30:00-07:00",
      // High rate of no_response/pending to align with the systemic narrative.
      { confirmationMix: { confirmed: 0.4, pending: 0.25, no_response: 0.35 }, minutesRange: [5, 45] },
    ),
    on_demand_forecast: {
      corridors: [
        corridorForecast("C1", 6, 12, 4.5, 4.2),
        corridorForecast("C2", 5, 10, 4.4, 4.2),
        corridorForecast("C3", 4, 9, 4.3, 4.1),
        corridorForecast("C4", 3, 7, 4.0, 4.0),
        corridorForecast("C5", 5, 11, 4.6, 4.3),
      ],
    },
    disruptions: [],
    subscription_density_pct: 0.22,
    historical_no_show_rate: 0.4,
    market_maturity_days: 365,
  },
  critical: true,
  // Pass criteria (per eval set): Fleet utilization recovers to within 15%
  // of normal by mid-morning; model does not continue holding vehicles for
  // likely no-shows after pattern is detected.
  assertions: [
    {
      name: "Systemic spike pattern detected",
      check: (output) =>
        output.no_show_handling.pattern_detected === "systemic_spike"
          ? ok(`pattern_detected = 'systemic_spike'`)
          : fail(
              `pattern_detected = ${output.no_show_handling.pattern_detected ?? "null"} — expected 'systemic_spike' at 40% no-show rate.`,
            ),
    },
    {
      name: "Fleet utilization within 15% of normal (≥ 0.55 vs. normal-day ~0.70)",
      check: (output) => {
        const u = output.fleet_state_after.utilization_rate;
        // Normal-day baseline utilization ~70% (per spec); within 15% absolute = ≥ 55%.
        return u >= 0.55
          ? ok(`utilization_rate = ${(u * 100).toFixed(1)}% (within 15% of 70% baseline)`)
          : fail(
              `utilization_rate = ${(u * 100).toFixed(1)}% — recovery target ≥ 55% (within 15% of normal 70%).`,
            );
      },
    },
    {
      name: "Vehicles not held for likely no-shows once pattern detected",
      check: (output) => {
        const held = output.vehicle_assignments.filter(
          (a) => a.action === "hold_position",
        );
        const total = output.vehicle_assignments.length || 1;
        const heldPct = held.length / total;
        // Once systemic_spike is detected, hold_position should be rare (< 10%).
        return heldPct <= 0.1
          ? ok(`${held.length}/${total} held (${(heldPct * 100).toFixed(1)}%) — pattern-aware release.`)
          : fail(
              `${held.length}/${total} held (${(heldPct * 100).toFixed(1)}%) — model still holding vehicles after systemic spike detected.`,
            );
      },
    },
    assertReassignmentSla,
    assertOnDemandFloor,
  ],
};

const CASE_8: EvalCase = {
  id: "case-8",
  label: "Phoenix · Day-after-holiday · elevated no-show rate (15%) · normal demand",
  category: "no_show",
  description:
    "The day after a holiday, where no-show rates are elevated (15%) but below the 30% systemic threshold. Agent should NOT declare systemic_spike, but should mention the elevated rate in the recommendation and lean slightly more conservative.",
  input: {
    city: "Phoenix",
    timestamp: "2026-07-05T08:00:00-07:00",
    time_window: "morning_rush",
    day_type: "day_after_holiday",
    fleet: {
      total_vehicles: 300,
      available_vehicles: 282,
      vehicles: buildFleetSample(PHX, 20, ["C1", "C2", "C3", "C4", "C5"]),
    },
    scheduled_rides: buildRideSample(
      PHX,
      38,
      ["C1", "C2", "C3", "C4", "C5"],
      "2026-07-05T08:30:00-07:00",
      { confirmationMix: { confirmed: 0.75, pending: 0.15, no_response: 0.1 }, minutesRange: [5, 45] },
    ),
    on_demand_forecast: {
      corridors: [
        corridorForecast("C1", 12, 23, 5.0, 4.6),
        corridorForecast("C2", 10, 19, 5.2, 5.0),
        corridorForecast("C3", 9, 17, 4.7, 4.5),
        corridorForecast("C4", 7, 14, 4.4, 4.2),
        corridorForecast("C5", 9, 17, 4.8, 4.6),
      ],
    },
    disruptions: [],
    subscription_density_pct: 0.24,
    historical_no_show_rate: 0.15,
    market_maturity_days: 365,
  },
  critical: true,
  // Pass criteria (per eval set): Scheduled ETAs met for riders who do show;
  // excess pre-positioned vehicles are released proactively rather than reactively.
  assertions: [
    assertScheduledEtaCompliance(2),
    {
      name: "Excess pre-positioned vehicles released proactively (release_to_on_demand)",
      check: (output) => {
        const released = output.vehicle_assignments.filter(
          (a) => a.action === "release_to_on_demand",
        ).length;
        // Day-after-holiday with 15% no-show rate: agent should proactively
        // release excess capacity rather than wait for reactive no-show triggers.
        return released >= 2
          ? ok(`${released} vehicles proactively released to on-demand pool.`)
          : fail(
              `Only ${released} release_to_on_demand actions — agent should proactively release excess pre-positioned vehicles given elevated 15% no-show rate.`,
            );
      },
    },
    {
      name: "No systemic_spike at 15% rate (below 30% threshold)",
      check: (output) =>
        output.no_show_handling.pattern_detected !== "systemic_spike"
          ? ok(`pattern_detected = ${output.no_show_handling.pattern_detected ?? "null"}`)
          : fail(`Falsely declared systemic_spike at 15% rate.`),
    },
    assertReassignmentSla,
    assertOnDemandFloor,
    assertCorridorCaps,
  ],
};

// ─── DISRUPTION (cases 9–13) ──────────────────────────────────────────────

const CASE_9: EvalCase = {
  id: "case-9",
  label: "LA · Evening rush · major event surge · no overlap with scheduled corridors",
  category: "disruption",
  description:
    "Major sporting event in LA at corridor C9 with no scheduled-ride overlap. Agent should aggressively reposition idle vehicles toward C9 without breaking scheduled commitments elsewhere.",
  input: {
    city: "Los Angeles",
    timestamp: "2026-05-13T18:30:00-07:00",
    time_window: "evening_rush",
    day_type: "weekday",
    fleet: {
      total_vehicles: 320,
      available_vehicles: 302,
      vehicles: buildFleetSample(LA, 22, ["C1", "C2", "C3", "C4", "C5", "C9"]),
    },
    scheduled_rides: buildRideSample(
      LA,
      40,
      ["C1", "C2", "C3", "C4", "C5"],
      "2026-05-13T19:00:00-07:00",
      { confirmationMix: { confirmed: 0.85, pending: 0.12, no_response: 0.03 }, asymmetric: true },
    ),
    on_demand_forecast: {
      corridors: [
        corridorForecast("C1", 14, 27, 5.2, 4.8),
        corridorForecast("C2", 12, 23, 5.0, 4.7),
        corridorForecast("C3", 10, 19, 4.7, 4.5),
        corridorForecast("C4", 8, 16, 4.5, 4.3),
        corridorForecast("C5", 11, 21, 5.0, 4.8),
        corridorForecast("C9", 35, 62, 9.4, 4.6), // event surge
      ],
    },
    disruptions: [
      {
        type: "event",
        description: "Dodgers home game letting out — surge expected through C9.",
        affected_corridors: ["C9"],
        severity: "medium",
        estimated_speed_reduction_pct: 0.0,
        estimated_duration_minutes: 120,
      },
    ],
    subscription_density_pct: 0.3,
    historical_no_show_rate: 0.05,
    market_maturity_days: 365,
  },
  critical: false,
  // Pass criteria (per eval set): All subscriber pickups met on time;
  // event-area on-demand ETA does not exceed 2x normal for that corridor.
  assertions: [
    {
      name: "All subscriber (scheduled) pickups met on time (100% ETA compliance)",
      check: (output, input) => {
        const scheduledAssignments = output.vehicle_assignments.filter(
          (a) => a.action === "assign_to_scheduled" && a.assigned_ride_id,
        );
        if (scheduledAssignments.length === 0) {
          return fail("No scheduled assignments emitted; expected all subscriber pickups served.");
        }
        const late = scheduledAssignments.filter((a) => {
          const r = input.scheduled_rides.find((x) => x.ride_id === a.assigned_ride_id);
          return r ? r.minutes_until_pickup - a.estimated_arrival_minutes < -2 : false;
        });
        return late.length === 0
          ? ok(`${scheduledAssignments.length}/${scheduledAssignments.length} subscriber pickups on time.`)
          : fail(
              `${late.length}/${scheduledAssignments.length} subscriber pickups late — event surge cannot break commitments.`,
            );
      },
    },
    {
      name: "Event-area (C9) on-demand ETA ≤ 2x baseline",
      check: (output) => {
        const c9 = output.corridor_impacts.find((c) => c.corridor_id === "C9");
        if (!c9) {
          return fail(`C9 missing from corridor_impacts — event corridor not modeled.`);
        }
        // 2x baseline = +100% delta.
        return c9.eta_delta_vs_baseline_pct <= 1.0
          ? ok(`C9 ETA delta +${(c9.eta_delta_vs_baseline_pct * 100).toFixed(0)}% (≤ 2x baseline).`)
          : fail(
              `C9 ETA delta +${(c9.eta_delta_vs_baseline_pct * 100).toFixed(0)}% (> 2x baseline) — event surge not controlled.`,
            );
      },
    },
    {
      name: "Active disruption acknowledged",
      check: (output) =>
        output.disruption_response.active_disruptions >= 1
          ? ok(`active_disruptions = ${output.disruption_response.active_disruptions}`)
          : fail(`active_disruptions = 0 despite event in input.`),
    },
    assertOnDemandFloor,
  ],
};

const CASE_10: EvalCase = {
  id: "case-10",
  label: "LA · Evening rush · event overlaps with scheduled corridors · do not break commitments",
  category: "disruption",
  description:
    "Concert at corridor C2 — same area as several scheduled pickups. Per spec, agent must NOT break scheduled commitments to chase event surge. Scheduled fulfillment wins; event spillover is on-demand-only.",
  input: {
    city: "Los Angeles",
    timestamp: "2026-05-13T18:30:00-07:00",
    time_window: "evening_rush",
    day_type: "weekday",
    fleet: {
      total_vehicles: 320,
      available_vehicles: 300,
      vehicles: buildFleetSample(LA, 22, ["C1", "C2", "C3", "C4", "C5"]),
    },
    scheduled_rides: buildRideSample(
      LA,
      36,
      ["C1", "C2", "C3", "C4", "C5"],
      "2026-05-13T19:00:00-07:00",
      { confirmationMix: { confirmed: 0.88, pending: 0.1, no_response: 0.02 } },
    ),
    on_demand_forecast: {
      corridors: [
        corridorForecast("C1", 13, 25, 5.0, 4.7),
        corridorForecast("C2", 30, 55, 8.8, 4.8), // event-driven surge
        corridorForecast("C3", 10, 19, 4.7, 4.5),
        corridorForecast("C4", 8, 15, 4.4, 4.3),
        corridorForecast("C5", 11, 21, 5.0, 4.8),
      ],
    },
    disruptions: [
      {
        type: "event",
        description: "Crypto.com Arena concert letting out — C2 surge.",
        affected_corridors: ["C2"],
        severity: "high",
        estimated_speed_reduction_pct: 0.1,
        estimated_duration_minutes: 90,
      },
    ],
    subscription_density_pct: 0.28,
    historical_no_show_rate: 0.05,
    market_maturity_days: 365,
  },
  critical: false,
  // Pass criteria (per eval set): On-demand ETA near event ≤ 8 min;
  // no scheduled rides are affected (none exist in that window).
  assertions: [
    {
      name: "On-demand ETA near event corridor (C2) ≤ 8 min",
      check: (output) => {
        const c2 = output.corridor_impacts.find((c) => c.corridor_id === "C2");
        if (!c2) {
          return fail(`Event corridor C2 missing from corridor_impacts.`);
        }
        return c2.predicted_on_demand_eta_minutes <= 8.0
          ? ok(`C2 predicted on-demand ETA = ${c2.predicted_on_demand_eta_minutes.toFixed(1)}m (≤ 8m).`)
          : fail(
              `C2 predicted on-demand ETA = ${c2.predicted_on_demand_eta_minutes.toFixed(1)}m (> 8m) — aggressive reposition expected.`,
            );
      },
    },
    {
      name: "Scheduled rides not affected by event surge",
      check: (output, input) => {
        const c2Scheduled = input.scheduled_rides.filter((r) => r.pickup_corridor === "C2");
        if (c2Scheduled.length === 0) {
          // Match the spec's "no scheduled rides exist in that window" framing.
          return ok("No scheduled rides in event corridor — criterion vacuously satisfied.");
        }
        const c2Served = c2Scheduled.filter((r) =>
          output.vehicle_assignments.some(
            (a) => a.assigned_ride_id === r.ride_id && a.action === "assign_to_scheduled",
          ),
        );
        const ratio = c2Served.length / c2Scheduled.length;
        return ratio >= 0.9
          ? ok(`${c2Served.length}/${c2Scheduled.length} C2 scheduled rides served (${(ratio * 100).toFixed(0)}%).`)
          : fail(
              `Only ${(ratio * 100).toFixed(0)}% of C2 scheduled rides served — event surge displacing commitments.`,
            );
      },
    },
    assertOnDemandFloor,
    assertCorridorCaps,
  ],
};

const CASE_11: EvalCase = {
  id: "case-11",
  label: "Phoenix · Midday · road closure on key arterial · reroute affected pickups",
  category: "disruption",
  description:
    "Road closure on C3 forces reroute of multiple scheduled pickups. Agent should compute new ETAs, increment eta_adjustments_communicated for any rerouted rides whose ETA shifts >3 min, and count active_disruptions=1.",
  input: {
    city: "Phoenix",
    timestamp: "2026-05-13T12:30:00-07:00",
    time_window: "midday",
    day_type: "weekday",
    fleet: {
      total_vehicles: 300,
      available_vehicles: 282,
      vehicles: buildFleetSample(PHX, 20, ["C1", "C2", "C3", "C4", "C5"]),
    },
    scheduled_rides: buildRideSample(
      PHX,
      22,
      ["C1", "C2", "C3", "C4", "C5"],
      "2026-05-13T13:00:00-07:00",
      { confirmationMix: { confirmed: 0.86, pending: 0.12, no_response: 0.02 } },
    ),
    on_demand_forecast: {
      corridors: [
        corridorForecast("C1", 9, 17, 4.7, 4.5),
        corridorForecast("C2", 8, 16, 4.6, 4.4),
        corridorForecast("C3", 11, 21, 9.5, 5.0), // closure-impacted
        corridorForecast("C4", 7, 14, 4.5, 4.3),
        corridorForecast("C5", 8, 15, 4.7, 4.6),
      ],
    },
    disruptions: [
      {
        type: "road_closure",
        description: "Loop 202 westbound closed for utility work, ~90 min.",
        affected_corridors: ["C3"],
        severity: "high",
        estimated_speed_reduction_pct: 0.0,
        estimated_duration_minutes: 90,
      },
    ],
    subscription_density_pct: 0.2,
    historical_no_show_rate: 0.05,
    market_maturity_days: 365,
  },
  critical: false,
  // Pass criteria (per eval set): Rerouted ETAs communicated to riders within
  // 2 min of closure detection; no scheduled rides marked as missed due to the closure.
  assertions: [
    {
      name: "ETA adjustments communicated for closure-affected scheduled rides",
      check: (output, input) => {
        const c3Scheduled = input.scheduled_rides.filter(
          (r) => r.pickup_corridor === "C3" || r.dropoff_corridor === "C3",
        ).length;
        const rerouted = output.disruption_response.rerouted_rides;
        const adjusted = output.disruption_response.eta_adjustments_communicated;
        // The 2-min communication latency is operational (the allocator output is
        // a snapshot, not a timeline) — we verify that adjustments/reroutes exist
        // and cover the affected scheduled rides. The <2 min latency is deferred
        // to the LLM-as-judge runner against runtime telemetry.
        if (c3Scheduled === 0) {
          return ok("No scheduled rides touch C3; reroute/adjustment criterion vacuous.");
        }
        return rerouted + adjusted >= 1
          ? ok(
              `${rerouted} rerouted + ${adjusted} ETA adjustments communicated (C3 affects ${c3Scheduled} scheduled rides).`,
            )
          : fail(
              `${c3Scheduled} scheduled rides touch closed C3 corridor, but rerouted=0 and eta_adjustments_communicated=0.`,
            );
      },
    },
    {
      name: "No scheduled rides marked missed due to closure (ETA compliance preserved)",
      check: (output, input) => {
        const assignments = output.vehicle_assignments.filter(
          (a) => a.action === "assign_to_scheduled" && a.assigned_ride_id,
        );
        const missed = assignments.filter((a) => {
          const r = input.scheduled_rides.find((x) => x.ride_id === a.assigned_ride_id);
          if (!r) return false;
          // "Missed" = ETA later than pickup with no realistic reroute window.
          return r.minutes_until_pickup - a.estimated_arrival_minutes < -5;
        });
        return missed.length === 0
          ? ok(`No scheduled rides missed (${assignments.length} assignments checked).`)
          : fail(
              `${missed.length} scheduled ride(s) effectively missed due to closure: ${missed
                .slice(0, 3)
                .map((a) => a.assigned_ride_id)
                .join(", ")}`,
            );
      },
    },
    {
      name: "Active disruption count = 1",
      check: (output) =>
        output.disruption_response.active_disruptions === 1
          ? ok(`active_disruptions = 1`)
          : fail(
              `active_disruptions = ${output.disruption_response.active_disruptions} (expected 1).`,
            ),
    },
    assertOnDemandFloor,
  ],
};

const CASE_12: EvalCase = {
  id: "case-12",
  label: "LA · Morning rush · heavy weather (20% speed reduction) · extend pre-position window",
  category: "disruption",
  description:
    "Atmospheric river weather event with 20% city-wide speed reduction. Agent must extend pre-positioning windows multiplicatively (30–45 min → 36–54 min) and set speed_compensation_applied=true.",
  input: {
    city: "Los Angeles",
    timestamp: "2026-05-13T07:30:00-07:00",
    time_window: "morning_rush",
    day_type: "weekday",
    fleet: {
      total_vehicles: 320,
      available_vehicles: 298,
      vehicles: buildFleetSample(LA, 22, ["C1", "C2", "C3", "C4", "C5", "C9"]),
    },
    scheduled_rides: buildRideSample(
      LA,
      48,
      ["C1", "C2", "C3", "C4", "C5"],
      "2026-05-13T08:00:00-07:00",
      { confirmationMix: { confirmed: 0.84, pending: 0.13, no_response: 0.03 }, minutesRange: [10, 50] },
    ),
    on_demand_forecast: {
      corridors: [
        corridorForecast("C1", 14, 28, 6.8, 5.0),
        corridorForecast("C2", 13, 25, 6.5, 5.0),
        corridorForecast("C3", 11, 22, 6.2, 5.0),
        corridorForecast("C4", 9, 18, 5.8, 4.7),
        corridorForecast("C5", 12, 24, 6.4, 5.0),
        corridorForecast("C9", 10, 20, 6.0, 5.0),
      ],
    },
    disruptions: [
      {
        type: "weather",
        description: "Heavy rain across LA basin; 20% citywide speed reduction.",
        affected_corridors: ["C1", "C2", "C3", "C4", "C5", "C9"],
        severity: "high",
        estimated_speed_reduction_pct: 0.2,
        estimated_duration_minutes: 180,
      },
    ],
    subscription_density_pct: 0.28,
    historical_no_show_rate: 0.05,
    market_maturity_days: 365,
  },
  critical: false,
  // Pass criteria (per eval set): Scheduled ETAs still met despite longer
  // repositioning drives; model does not simply accept late arrivals.
  assertions: [
    assertScheduledEtaCompliance(2),
    {
      name: "Speed compensation applied (model not silently accepting late arrivals)",
      check: (output) =>
        output.disruption_response.speed_compensation_applied
          ? ok(`speed_compensation_applied = true`)
          : fail(
              `speed_compensation_applied = false despite 20% weather-driven speed reduction — model accepting late arrivals.`,
            ),
    },
    assertOnDemandFloor,
  ],
};

const CASE_13: EvalCase = {
  id: "case-13",
  label: "LA · Evening rush · compound disruption (weather + road closure) · scheduled wins",
  category: "disruption",
  description:
    "Compound disruption: 25% weather speed reduction AND a road closure on C3. Per spec, scheduled fulfillment is prioritized; on-demand can degrade up to 2x baseline before escalation. Any corridor >2x baseline ETA must surface as a severity='high' capacity warning.",
  input: {
    city: "Los Angeles",
    timestamp: "2026-05-13T17:45:00-07:00",
    time_window: "evening_rush",
    day_type: "weekday",
    fleet: {
      total_vehicles: 320,
      available_vehicles: 295,
      vehicles: buildFleetSample(LA, 24, ["C1", "C2", "C3", "C4", "C5", "C9"]),
    },
    scheduled_rides: buildRideSample(
      LA,
      54,
      ["C1", "C2", "C3", "C4", "C5"],
      "2026-05-13T18:15:00-07:00",
      { confirmationMix: { confirmed: 0.86, pending: 0.12, no_response: 0.02 }, asymmetric: true },
    ),
    on_demand_forecast: {
      corridors: [
        corridorForecast("C1", 16, 30, 7.4, 5.0),
        corridorForecast("C2", 15, 28, 7.0, 5.0),
        corridorForecast("C3", 11, 22, 11.5, 5.0), // 2.3x baseline
        corridorForecast("C4", 10, 19, 6.2, 4.8),
        corridorForecast("C5", 13, 25, 6.8, 5.0),
        corridorForecast("C9", 12, 23, 6.5, 5.0),
      ],
    },
    disruptions: [
      {
        type: "weather",
        description: "Marine layer + heavy fog; 25% speed reduction near coast.",
        affected_corridors: ["C1", "C2", "C5", "C9"],
        severity: "medium",
        estimated_speed_reduction_pct: 0.25,
        estimated_duration_minutes: 150,
      },
      {
        type: "road_closure",
        description: "Sigalert on I-10 east; C3 throughput crashed.",
        affected_corridors: ["C3"],
        severity: "high",
        estimated_speed_reduction_pct: 0.0,
        estimated_duration_minutes: 120,
      },
    ],
    subscription_density_pct: 0.3,
    historical_no_show_rate: 0.05,
    market_maturity_days: 365,
  },
  critical: false,
  // Pass criteria (per eval set): ≥ 90% of scheduled pickups met within 5 min
  // of target; on-demand ETA degradation flagged to ops if > 2x baseline.
  assertions: [
    {
      name: "≥ 90% of scheduled pickups met within 5 min of target",
      check: (output, input) => {
        const scheduledAssignments = output.vehicle_assignments.filter(
          (a) => a.action === "assign_to_scheduled" && a.assigned_ride_id,
        );
        if (scheduledAssignments.length === 0) {
          return fail("No scheduled assignments emitted.");
        }
        const onTime = scheduledAssignments.filter((a) => {
          const r = input.scheduled_rides.find((x) => x.ride_id === a.assigned_ride_id);
          return r ? r.minutes_until_pickup - a.estimated_arrival_minutes >= -5 : false;
        });
        const pct = onTime.length / scheduledAssignments.length;
        return pct >= 0.9
          ? ok(
              `${onTime.length}/${scheduledAssignments.length} scheduled pickups within 5m (${(pct * 100).toFixed(1)}%).`,
            )
          : fail(
              `Only ${(pct * 100).toFixed(1)}% (${onTime.length}/${scheduledAssignments.length}) within 5m — below 90% threshold under compound disruption.`,
            );
      },
    },
    {
      name: "On-demand ETA > 2x baseline flagged to ops team",
      check: (output) => {
        const breaches = output.corridor_impacts.filter(
          (c) => c.eta_delta_vs_baseline_pct > 1.0,
        );
        if (breaches.length === 0) {
          return ok(`No corridor above 2x baseline; flag not required.`);
        }
        const flagged = breaches.every((c) =>
          output.tradeoff_summary.capacity_warnings.some(
            (w) => w.corridor_id === c.corridor_id && w.severity === "high",
          ),
        );
        return flagged
          ? ok(
              `${breaches.length} corridor(s) > 2x baseline; all flagged as high-severity warnings.`,
            )
          : fail(
              `${breaches.length} corridor(s) > 2x baseline (${breaches.map((b) => b.corridor_id).join(", ")}) — not all surfaced as high-severity warnings.`,
            );
      },
    },
    {
      name: "Active disruption count = 2",
      check: (output) =>
        output.disruption_response.active_disruptions === 2
          ? ok(`active_disruptions = 2`)
          : fail(
              `active_disruptions = ${output.disruption_response.active_disruptions} (expected 2).`,
            ),
    },
    assertOnDemandFloor,
  ],
};

// ─── FLEET CONSTRAINT (cases 14–15) ───────────────────────────────────────

const CASE_14: EvalCase = {
  id: "case-14",
  label: "Phoenix · Morning rush · 10% of fleet offline (maintenance surge) · maintain compliance",
  category: "fleet_constraint",
  description:
    "Above-normal maintenance pulls 10% of the fleet offline. Tighter supply; agent must still meet scheduled commitments while keeping on-demand floor intact. May need to warn that the buffer is thin.",
  input: {
    city: "Phoenix",
    timestamp: "2026-05-13T08:00:00-07:00",
    time_window: "morning_rush",
    day_type: "weekday",
    fleet: {
      total_vehicles: 300,
      available_vehicles: 270, // 10% offline
      vehicles: buildFleetSample(PHX, 22, ["C1", "C2", "C3", "C4", "C5"]),
    },
    scheduled_rides: buildRideSample(
      PHX,
      45,
      ["C1", "C2", "C3", "C4", "C5"],
      "2026-05-13T08:30:00-07:00",
      { confirmationMix: { confirmed: 0.83, pending: 0.14, no_response: 0.03 } },
    ),
    on_demand_forecast: {
      corridors: [
        corridorForecast("C1", 15, 28, 5.3, 4.7),
        corridorForecast("C2", 13, 25, 5.6, 5.0),
        corridorForecast("C3", 10, 19, 4.9, 4.6),
        corridorForecast("C4", 8, 15, 4.4, 4.2),
        corridorForecast("C5", 11, 21, 5.1, 4.8),
      ],
    },
    disruptions: [],
    subscription_density_pct: 0.27,
    historical_no_show_rate: 0.05,
    market_maturity_days: 365,
  },
  critical: false,
  // Pass criteria (per eval set): Scheduled ETAs met; on-demand ETA increases
  // by ≤ 15% (proportional to fleet reduction, not amplified).
  assertions: [
    assertScheduledEtaCompliance(2),
    assertOnDemandEtaDelta(0.15),
    assertOnDemandFloor,
    assertCorridorCaps,
  ],
};

const CASE_15: EvalCase = {
  id: "case-15",
  label: "Phoenix · Evening rush · very high density (45%) · floor would breach if naive",
  category: "fleet_constraint",
  description:
    "Subscription density spikes (45%) and naive allocation would breach the 15% on-demand floor. CRITICAL: agent must hold the floor — even if that means rejecting some scheduled allocations or flagging on_demand_floor_risk warnings.",
  input: {
    city: "Phoenix",
    timestamp: "2026-05-13T17:15:00-07:00",
    time_window: "evening_rush",
    day_type: "weekday",
    fleet: {
      total_vehicles: 300,
      available_vehicles: 282,
      vehicles: buildFleetSample(PHX, 24, ["C1", "C2", "C3", "C4", "C5"]),
    },
    scheduled_rides: buildRideSample(
      PHX,
      78, // density × fleet pushes scheduled count near the floor
      ["C1", "C2", "C3", "C4", "C5"],
      "2026-05-13T17:45:00-07:00",
      { confirmationMix: { confirmed: 0.88, pending: 0.1, no_response: 0.02 }, asymmetric: true },
    ),
    on_demand_forecast: {
      corridors: [
        corridorForecast("C1", 18, 35, 6.2, 4.8),
        corridorForecast("C2", 16, 30, 5.9, 4.9),
        corridorForecast("C3", 14, 27, 5.4, 4.7),
        corridorForecast("C4", 11, 21, 4.9, 4.4),
        corridorForecast("C5", 15, 28, 5.7, 5.0),
      ],
    },
    disruptions: [],
    subscription_density_pct: 0.45,
    historical_no_show_rate: 0.05,
    market_maturity_days: 365,
  },
  critical: true,
  // Pass criteria (per eval set): Scheduled ETAs met; on-demand availability
  // guardrail (≥ 15% fleet reserved) is not violated; system flags to ops
  // that corridor cap is nearly reached.
  assertions: [
    assertScheduledEtaCompliance(2),
    assertOnDemandFloor,
    {
      name: "Corridor cap warning surfaced when corridor approaches the cap",
      check: (output) => {
        const nearCap = output.corridor_impacts.filter(
          (c) => c.corridor_cap_usage_pct >= 0.5,
        );
        if (nearCap.length === 0) {
          return ok(`No corridor ≥ 50% cap usage; flag not required.`);
        }
        const warned = output.tradeoff_summary.capacity_warnings.some(
          (w) => w.warning_type === "corridor_cap_risk",
        );
        return warned
          ? ok(
              `${nearCap.length} corridor(s) near cap (max ${(Math.max(...nearCap.map((c) => c.corridor_cap_usage_pct)) * 100).toFixed(1)}%); corridor_cap_risk flagged.`,
            )
          : fail(
              `${nearCap.length} corridor(s) ≥ 50% of cap (${nearCap.map((c) => `${c.corridor_id}=${(c.corridor_cap_usage_pct * 100).toFixed(0)}%`).join(", ")}) — no corridor_cap_risk warning.`,
            );
      },
    },
    assertCorridorCaps,
  ],
};

// ─── NEW MARKET (cases 16–17) ─────────────────────────────────────────────

const CASE_16: EvalCase = {
  id: "case-16",
  label: "Austin · Day 12 launch · morning rush · thin demand data · conservative defaults",
  category: "new_market",
  description:
    "Austin is 12 days post-launch. Historical demand data is thin. Agent must (a) use scheduled commitments as primary demand signal, (b) spread idle vehicles geographically rather than borrowing from Phoenix/LA, and (c) acknowledge thin data in the recommendation.",
  input: {
    city: "Austin",
    timestamp: "2026-05-13T08:00:00-06:00",
    time_window: "morning_rush",
    day_type: "weekday",
    fleet: {
      total_vehicles: 180,
      available_vehicles: 168,
      vehicles: buildFleetSample(AUSTIN, 16, ["A1", "A2", "A3", "A4", "A5"]),
    },
    scheduled_rides: buildRideSample(
      AUSTIN,
      14,
      ["A1", "A2", "A3", "A4", "A5"],
      "2026-05-13T08:30:00-06:00",
      { confirmationMix: { confirmed: 0.78, pending: 0.21, no_response: 0.01 } },
    ),
    on_demand_forecast: {
      // Thin / low-confidence forecast — small predicted counts and flat ETAs.
      corridors: [
        corridorForecast("A1", 3, 6, 5.0, 5.0),
        corridorForecast("A2", 2, 5, 5.0, 5.0),
        corridorForecast("A3", 3, 6, 5.0, 5.0),
        corridorForecast("A4", 2, 4, 5.0, 5.0),
        corridorForecast("A5", 3, 5, 5.0, 5.0),
      ],
    },
    disruptions: [],
    subscription_density_pct: 0.15,
    historical_no_show_rate: 0.05,
    market_maturity_days: 12,
  },
  critical: false,
  // Pass criteria (per eval set): Scheduled ETAs met; on-demand positioning
  // uses conservative, geographically distributed defaults rather than
  // borrowed city-specific patterns.
  // NOTE: "borrowed city-specific patterns" is partly qualitative — full
  // detection requires LLM-as-judge inspection of the recommendation rationale.
  // We approximate via geographic-spread check + recommendation keywords.
  assertions: [
    assertScheduledEtaCompliance(2),
    {
      name: "On-demand repositioning geographically distributed (≥ 3 corridors)",
      check: (output) => {
        const counts = new Map<string, number>();
        for (const a of output.vehicle_assignments) {
          if (a.action === "reposition_to_staging" || a.action === "release_to_on_demand") {
            counts.set(a.target_corridor, (counts.get(a.target_corridor) ?? 0) + 1);
          }
        }
        const corridors = Array.from(counts.keys());
        if (corridors.length === 0) {
          return fail("No repositioning emitted; new-market expectation is conservative spread.");
        }
        if (corridors.length < 3) {
          return fail(
            `Repositioning concentrated in ${corridors.length} corridor(s): ${corridors.join(", ")}. New-market expectation is geographic spread across ≥ 3 corridors.`,
          );
        }
        return ok(`Repositioning spread across ${corridors.length} corridors: ${corridors.join(", ")}.`);
      },
    },
    {
      name: "Recommendation acknowledges thin data / conservative defaults (no borrowed patterns)",
      // Qualitative: LLM-as-judge should verify the model doesn't cite
      // Phoenix/LA-specific demand patterns. We do a keyword check as proxy.
      check: (output) => {
        const rec = (output.tradeoff_summary.recommendation || "").toLowerCase();
        const positiveSignals = ["thin", "insufficient", "conservative", "new market", "scheduled commitments", "cold start", "limited data"];
        const negativeSignals = ["phoenix", "los angeles", "la pattern"];
        const positives = positiveSignals.filter((k) => rec.includes(k));
        const negatives = negativeSignals.filter((k) => rec.includes(k));
        if (positives.length === 0) {
          return fail(
            `Recommendation lacks new-market framing. Got: "${output.tradeoff_summary.recommendation.slice(0, 160)}…"`,
          );
        }
        if (negatives.length > 0) {
          return fail(
            `Recommendation references other-city patterns (${negatives.join(", ")}) — should not borrow.`,
          );
        }
        return ok(`New-market framing present: ${positives.join(", ")}.`);
      },
    },
    assertOnDemandFloor,
    assertCorridorCaps,
  ],
};

const CASE_17: EvalCase = {
  id: "case-17",
  label: "Austin · Day 18 launch · midday · single road closure · still cold-start",
  category: "new_market",
  description:
    "Austin at 18 days plus a disruption. Tests that the cold-start behavior (conservative geographic defaults, scheduled-first) coexists correctly with disruption handling.",
  input: {
    city: "Austin",
    timestamp: "2026-05-13T12:45:00-06:00",
    time_window: "midday",
    day_type: "weekday",
    fleet: {
      total_vehicles: 180,
      available_vehicles: 170,
      vehicles: buildFleetSample(AUSTIN, 16, ["A1", "A2", "A3", "A4", "A5"]),
    },
    scheduled_rides: buildRideSample(
      AUSTIN,
      9,
      ["A1", "A2", "A3", "A4"],
      "2026-05-13T13:15:00-06:00",
      { confirmationMix: { confirmed: 0.78, pending: 0.22, no_response: 0 } },
    ),
    on_demand_forecast: {
      corridors: [
        corridorForecast("A1", 4, 8, 5.2, 5.0),
        corridorForecast("A2", 3, 7, 5.0, 5.0),
        corridorForecast("A3", 5, 10, 6.4, 5.0), // road-closure-affected
        corridorForecast("A4", 2, 5, 5.0, 5.0),
        corridorForecast("A5", 3, 6, 5.0, 5.0),
      ],
    },
    disruptions: [
      {
        type: "road_closure",
        description: "I-35 northbound closed for paving, ~60 min.",
        affected_corridors: ["A3"],
        severity: "medium",
        estimated_speed_reduction_pct: 0.0,
        estimated_duration_minutes: 60,
      },
    ],
    subscription_density_pct: 0.13,
    historical_no_show_rate: 0.05,
    market_maturity_days: 18,
  },
  critical: false,
  // Pass criteria (per eval set): Scheduled ETAs met; model accuracy (predicted
  // vs. actual demand per corridor) improves measurably week-over-week as data
  // accumulates.
  // NOTE: Week-over-week accuracy improvement cannot be tested from a single
  // snapshot — it requires longitudinal comparison across multiple eval runs.
  // That dimension is deferred to the LLM-as-judge runner / offline analysis.
  // Snapshot-level proxy: model should still trust scheduled signals and
  // surface limited-data framing.
  assertions: [
    assertScheduledEtaCompliance(2),
    assertRecommendationMentions(
      "insufficient data",
      "thin",
      "scheduled commitments",
      "conservative",
      "new market",
      "limited data",
    ),
    {
      name: "Active disruption count = 1",
      check: (output) =>
        output.disruption_response.active_disruptions === 1
          ? ok(`active_disruptions = 1`)
          : fail(
              `active_disruptions = ${output.disruption_response.active_disruptions} (expected 1).`,
            ),
    },
    assertOnDemandFloor,
    assertCorridorCaps,
  ],
};

// ─── EDGE (case 18) ───────────────────────────────────────────────────────

const CASE_18: EvalCase = {
  id: "case-18",
  label: "Phoenix · Midday · all scheduled rides confirmed · zero disruptions · zero ambiguity",
  category: "edge",
  description:
    "Boring perfect-world day. Tests that the agent doesn't over-engineer the response, doesn't hallucinate disruptions, and produces a clean recommendation with healthy reserve and no capacity warnings.",
  input: {
    city: "Phoenix",
    timestamp: "2026-05-13T12:30:00-07:00",
    time_window: "midday",
    day_type: "weekday",
    fleet: {
      total_vehicles: 300,
      available_vehicles: 285,
      vehicles: buildFleetSample(PHX, 18, ["C1", "C2", "C3", "C4", "C5"]),
    },
    scheduled_rides: buildRideSample(
      PHX,
      18,
      ["C1", "C2", "C3", "C4", "C5"],
      "2026-05-13T13:00:00-07:00",
      { confirmationMix: { confirmed: 1.0, pending: 0, no_response: 0 } },
    ),
    on_demand_forecast: {
      corridors: [
        corridorForecast("C1", 9, 18, 4.6, 4.5),
        corridorForecast("C2", 8, 16, 4.5, 4.4),
        corridorForecast("C3", 10, 19, 4.7, 4.6),
        corridorForecast("C4", 7, 14, 4.4, 4.3),
        corridorForecast("C5", 8, 16, 4.6, 4.5),
      ],
    },
    disruptions: [],
    subscription_density_pct: 0.18,
    historical_no_show_rate: 0.04,
    market_maturity_days: 365,
  },
  critical: false,
  // Pass criteria (per eval set): Deadheading miles for return repositioning
  // are ≤ baseline (model doesn't wait until evening to start moving vehicles
  // back); evening scheduled ETAs are not degraded by morning clustering.
  // NOTE: This case's input scenario is generic — the asymmetric morning
  // suburb→downtown flow is approximated via the deadheading rate + ETA checks.
  // True morning-to-evening longitudinal effect requires multi-snapshot eval.
  assertions: [
    {
      name: "Deadheading rate ≤ baseline (≤ 12% assumed for healthy operations)",
      check: (output) => {
        const rate = output.tradeoff_summary.deadheading_rate_pct;
        // Baseline deadheading ~12% for healthy operations; agent should not
        // exceed this by lazily waiting until evening to reposition empties.
        return rate <= 0.12
          ? ok(`deadheading_rate_pct = ${(rate * 100).toFixed(1)}% (≤ 12% baseline).`)
          : fail(
              `deadheading_rate_pct = ${(rate * 100).toFixed(1)}% (> 12% baseline) — likely waited too long to reposition.`,
            );
      },
    },
    assertScheduledEtaCompliance(2),
    {
      name: "No hallucinated disruptions",
      check: (output) =>
        output.disruption_response.active_disruptions === 0
          ? ok(`active_disruptions = 0`)
          : fail(
              `active_disruptions = ${output.disruption_response.active_disruptions} (expected 0).`,
            ),
    },
    assertOnDemandFloor,
    assertCorridorCaps,
  ],
};

// ─── EXPORT ───────────────────────────────────────────────────────────────

export const EVAL_CASES: EvalCase[] = [
  // Baseline
  CASE_1,
  CASE_2,
  CASE_3,
  CASE_4,
  // No-show recovery (critical)
  CASE_5,
  CASE_6,
  CASE_7,
  CASE_8,
  // Disruption
  CASE_9,
  CASE_10,
  CASE_11,
  CASE_12,
  CASE_13,
  // Fleet constraint
  CASE_14,
  CASE_15,
  // New market
  CASE_16,
  CASE_17,
  // Edge
  CASE_18,
];

// Silence "imported but unused" warnings for types we re-export through the
// EvalCase/AllocatorOutput surface but reference indirectly via the
// assertion signatures.
export type {
  AllocatorOutput,
  VehicleAssignment,
  Disruption,
  CorridorForecast,
  FleetVehicle,
  ScheduledRide,
};
