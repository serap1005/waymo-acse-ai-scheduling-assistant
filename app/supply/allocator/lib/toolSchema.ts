// JSON Schema for the emit_allocation_decision tool. Mirror of AllocatorOutput
// in schemas.ts. When AllocatorOutput changes, update both.

import type Anthropic from "@anthropic-ai/sdk";

const latLng = {
  type: "object",
  properties: {
    lat: { type: "number" },
    lng: { type: "number" },
  },
  required: ["lat", "lng"],
  additionalProperties: false,
} as const;

export const ALLOCATION_TOOL: Anthropic.Messages.Tool = {
  name: "emit_allocation_decision",
  description:
    "Emit the supply allocation decision for this cycle. Every field is required. Numerical precision: floats rounded to 2 decimals, percentages as floats in [0.0, 1.0].",
  input_schema: {
    type: "object",
    properties: {
      timestamp: {
        type: "string",
        description: "ISO 8601 time of this decision.",
      },
      decision_id: {
        type: "string",
        description: "Unique ID for audit trail (e.g., 'dec-2026-05-13-0800-abc123').",
      },
      vehicle_assignments: {
        type: "array",
        description: "Per-vehicle action and target. Every vehicle being acted on this cycle.",
        items: {
          type: "object",
          properties: {
            vehicle_id: { type: "string" },
            action: {
              type: "string",
              enum: [
                "reposition_to_staging",
                "assign_to_scheduled",
                "release_to_on_demand",
                "hold_position",
                "reroute",
              ],
            },
            target_location: latLng,
            target_corridor: { type: "string" },
            assigned_ride_id: {
              type: ["string", "null"],
              description: "Required when action='assign_to_scheduled'; null otherwise.",
            },
            reason: {
              type: "string",
              description:
                "One-line citation of the specific signal driving this action. 'Optimization' is not a reason.",
            },
            estimated_arrival_minutes: { type: "number" },
          },
          required: [
            "vehicle_id",
            "action",
            "target_location",
            "target_corridor",
            "assigned_ride_id",
            "reason",
            "estimated_arrival_minutes",
          ],
          additionalProperties: false,
        },
      },
      fleet_state_after: {
        type: "object",
        properties: {
          vehicles_assigned_scheduled: { type: "integer" },
          vehicles_assigned_on_demand: { type: "integer" },
          vehicles_repositioning: { type: "integer" },
          vehicles_idle: { type: "integer" },
          on_demand_reserve_pct: {
            type: "number",
            description: "Float in [0.0, 1.0]. Hard constraint: must be >= 0.15.",
          },
          utilization_rate: { type: "number" },
        },
        required: [
          "vehicles_assigned_scheduled",
          "vehicles_assigned_on_demand",
          "vehicles_repositioning",
          "vehicles_idle",
          "on_demand_reserve_pct",
          "utilization_rate",
        ],
        additionalProperties: false,
      },
      corridor_impacts: {
        type: "array",
        items: {
          type: "object",
          properties: {
            corridor_id: { type: "string" },
            scheduled_vehicles_allocated: { type: "integer" },
            corridor_cap_usage_pct: {
              type: "number",
              description: "Float in [0.0, 1.0]. Hard constraint: must be <= 0.60.",
            },
            predicted_on_demand_eta_minutes: { type: "number" },
            eta_delta_vs_baseline_pct: {
              type: "number",
              description: "Positive means slower than baseline.",
            },
            alert: {
              type: ["string", "null"],
              description:
                "Only populated if eta_delta_vs_baseline_pct > 0.10 OR corridor_cap_usage_pct > 0.50.",
            },
          },
          required: [
            "corridor_id",
            "scheduled_vehicles_allocated",
            "corridor_cap_usage_pct",
            "predicted_on_demand_eta_minutes",
            "eta_delta_vs_baseline_pct",
            "alert",
          ],
          additionalProperties: false,
        },
      },
      no_show_handling: {
        type: "object",
        properties: {
          probable_no_shows: { type: "integer" },
          vehicles_released: { type: "integer" },
          avg_reassignment_time_minutes: {
            type: "number",
            description: "Hard constraint: must be <= 4.0.",
          },
          pattern_detected: {
            type: ["string", "null"],
            description: "e.g., 'systemic_spike' when rolling no-show rate > 0.30.",
          },
        },
        required: [
          "probable_no_shows",
          "vehicles_released",
          "avg_reassignment_time_minutes",
          "pattern_detected",
        ],
        additionalProperties: false,
      },
      tradeoff_summary: {
        type: "object",
        properties: {
          scheduled_eta_compliance_pct: { type: "number" },
          on_demand_eta_impact_pct: {
            type: "number",
            description: "Average ETA change vs. baseline across all corridors. Positive = worse.",
          },
          deadheading_rate_pct: { type: "number" },
          capacity_warnings: {
            type: "array",
            items: {
              type: "object",
              properties: {
                corridor_id: { type: "string" },
                warning_type: {
                  type: "string",
                  enum: ["on_demand_floor_risk", "corridor_cap_risk", "eta_degradation"],
                },
                detail: { type: "string" },
                severity: { type: "string", enum: ["low", "medium", "high"] },
              },
              required: ["corridor_id", "warning_type", "detail", "severity"],
              additionalProperties: false,
            },
          },
          recommendation: {
            type: "string",
            description:
              "One paragraph that an operator can read to understand the fleet state. Surface the key tradeoff explicitly.",
          },
        },
        required: [
          "scheduled_eta_compliance_pct",
          "on_demand_eta_impact_pct",
          "deadheading_rate_pct",
          "capacity_warnings",
          "recommendation",
        ],
        additionalProperties: false,
      },
      disruption_response: {
        type: "object",
        properties: {
          active_disruptions: { type: "integer" },
          rerouted_rides: { type: "integer" },
          eta_adjustments_communicated: { type: "integer" },
          speed_compensation_applied: { type: "boolean" },
        },
        required: [
          "active_disruptions",
          "rerouted_rides",
          "eta_adjustments_communicated",
          "speed_compensation_applied",
        ],
        additionalProperties: false,
      },
    },
    required: [
      "timestamp",
      "decision_id",
      "vehicle_assignments",
      "fleet_state_after",
      "corridor_impacts",
      "no_show_handling",
      "tradeoff_summary",
      "disruption_response",
    ],
    additionalProperties: false,
  },
};
