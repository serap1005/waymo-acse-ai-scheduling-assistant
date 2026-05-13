import type { AllocatorInput } from "./schemas";

// Five hand-built scenarios covering the major decision paths in the spec.
// Each scenario keeps the fleet vehicle list small (~15 vehicles) for readability —
// production inputs would have hundreds. The model sees the same shape either way.

interface Sample {
  id: string;
  label: string;
  blurb: string;
  input: AllocatorInput;
}

function vehicle(
  id: string,
  status: AllocatorInput["fleet"]["vehicles"][number]["status"],
  lat: number,
  lng: number,
  corridor: string,
  eta = 0,
): AllocatorInput["fleet"]["vehicles"][number] {
  return {
    vehicle_id: id,
    status,
    current_location: { lat, lng },
    current_corridor: corridor,
    eta_to_idle_minutes: eta,
  };
}

export const SAMPLES: Sample[] = [
  // ─── 1. Phoenix weekday morning rush — baseline ───────────────────────
  {
    id: "phx-morning-baseline",
    label: "Phoenix · weekday morning rush · baseline",
    blurb:
      "280 available vehicles, 47 scheduled pickups (38 confirmed, 9 pending), 25% subscription density, no disruptions. The spec's example scenario.",
    input: {
      city: "Phoenix",
      timestamp: "2026-05-13T08:00:00-07:00",
      time_window: "morning_rush",
      day_type: "weekday",
      fleet: {
        total_vehicles: 300,
        available_vehicles: 280,
        vehicles: [
          vehicle("V001", "idle", 33.45, -112.07, "C1"),
          vehicle("V002", "idle", 33.46, -112.04, "C2"),
          vehicle("V003", "occupied", 33.48, -112.05, "C3", 6.5),
          vehicle("V004", "idle", 33.44, -112.09, "C1"),
          vehicle("V005", "en_route_to_pickup", 33.45, -112.08, "C2", 3.2),
          vehicle("V006", "idle", 33.51, -112.12, "C5"),
          vehicle("V007", "idle", 33.43, -112.06, "C1"),
          vehicle("V008", "charging", 33.50, -112.03, "C4", 18),
          vehicle("V009", "idle", 33.47, -112.10, "C2"),
          vehicle("V010", "occupied", 33.49, -112.04, "C3", 4.8),
          vehicle("V011", "idle", 33.46, -112.11, "C5"),
          vehicle("V012", "idle", 33.44, -112.05, "C1"),
          vehicle("V013", "en_route_to_staging", 33.50, -112.08, "C4", 2.1),
          vehicle("V014", "idle", 33.45, -112.06, "C2"),
          vehicle("V015", "idle", 33.48, -112.07, "C3"),
        ],
      },
      scheduled_rides: [
        {
          ride_id: "R-001",
          rider_id: "U-A1",
          pickup_location: { lat: 33.51, lng: -112.12 },
          pickup_corridor: "C5",
          pickup_time: "2026-05-13T08:30:00-07:00",
          dropoff_corridor: "C3",
          confirmation_status: "confirmed",
          minutes_until_pickup: 30,
        },
        {
          ride_id: "R-002",
          rider_id: "U-A2",
          pickup_location: { lat: 33.46, lng: -112.11 },
          pickup_corridor: "C5",
          pickup_time: "2026-05-13T08:32:00-07:00",
          dropoff_corridor: "C3",
          confirmation_status: "confirmed",
          minutes_until_pickup: 32,
        },
        {
          ride_id: "R-003",
          rider_id: "U-A3",
          pickup_location: { lat: 33.44, lng: -112.09 },
          pickup_corridor: "C1",
          pickup_time: "2026-05-13T08:35:00-07:00",
          dropoff_corridor: "C3",
          confirmation_status: "pending",
          minutes_until_pickup: 35,
        },
        {
          ride_id: "R-004",
          rider_id: "U-A4",
          pickup_location: { lat: 33.45, lng: -112.10 },
          pickup_corridor: "C2",
          pickup_time: "2026-05-13T08:40:00-07:00",
          dropoff_corridor: "C3",
          confirmation_status: "confirmed",
          minutes_until_pickup: 40,
        },
      ],
      on_demand_forecast: {
        corridors: [
          {
            corridor_id: "C1",
            predicted_requests_next_30min: 8,
            predicted_requests_next_60min: 18,
            current_avg_eta_minutes: 4.5,
            baseline_avg_eta_minutes: 4.1,
          },
          {
            corridor_id: "C2",
            predicted_requests_next_30min: 11,
            predicted_requests_next_60min: 22,
            current_avg_eta_minutes: 5.2,
            baseline_avg_eta_minutes: 4.3,
          },
          {
            corridor_id: "C3",
            predicted_requests_next_30min: 14,
            predicted_requests_next_60min: 28,
            current_avg_eta_minutes: 8.2,
            baseline_avg_eta_minutes: 4.1,
          },
          {
            corridor_id: "C4",
            predicted_requests_next_30min: 6,
            predicted_requests_next_60min: 12,
            current_avg_eta_minutes: 4.0,
            baseline_avg_eta_minutes: 3.8,
          },
          {
            corridor_id: "C5",
            predicted_requests_next_30min: 4,
            predicted_requests_next_60min: 9,
            current_avg_eta_minutes: 5.0,
            baseline_avg_eta_minutes: 4.5,
          },
        ],
      },
      disruptions: [],
      subscription_density_pct: 0.25,
      historical_no_show_rate: 0.05,
      market_maturity_days: 365,
    },
  },

  // ─── 2. LA evening rush + weather disruption ──────────────────────────
  {
    id: "la-evening-weather",
    label: "LA · evening rush · weather disruption",
    blurb:
      "320 available vehicles, 62 scheduled pickups, heavy rain reducing speeds by 25%. Tests pre-positioning multiplier and speed compensation.",
    input: {
      city: "Los Angeles",
      timestamp: "2026-05-13T17:30:00-07:00",
      time_window: "evening_rush",
      day_type: "weekday",
      fleet: {
        total_vehicles: 340,
        available_vehicles: 320,
        vehicles: [
          vehicle("V101", "occupied", 34.05, -118.24, "DTLA", 7.4),
          vehicle("V102", "idle", 34.02, -118.49, "Santa-Monica"),
          vehicle("V103", "idle", 34.06, -118.40, "Beverly-Hills"),
          vehicle("V104", "occupied", 34.10, -118.33, "Hollywood", 5.9),
          vehicle("V105", "idle", 34.05, -118.28, "Koreatown"),
          vehicle("V106", "idle", 34.14, -118.14, "Pasadena"),
          vehicle("V107", "en_route_to_staging", 34.07, -118.36, "WeHo", 4.1),
          vehicle("V108", "idle", 34.08, -118.43, "Westwood"),
          vehicle("V109", "occupied", 34.04, -118.26, "DTLA", 9.2),
          vehicle("V110", "idle", 34.01, -118.40, "Culver-City"),
          vehicle("V111", "idle", 34.05, -118.23, "DTLA"),
          vehicle("V112", "charging", 34.06, -118.31, "Mid-City", 22),
        ],
      },
      scheduled_rides: [
        {
          ride_id: "R-201",
          rider_id: "U-L1",
          pickup_location: { lat: 34.05, lng: -118.24 },
          pickup_corridor: "DTLA",
          pickup_time: "2026-05-13T18:00:00-07:00",
          dropoff_corridor: "Santa-Monica",
          confirmation_status: "confirmed",
          minutes_until_pickup: 30,
        },
        {
          ride_id: "R-202",
          rider_id: "U-L2",
          pickup_location: { lat: 34.05, lng: -118.26 },
          pickup_corridor: "DTLA",
          pickup_time: "2026-05-13T18:05:00-07:00",
          dropoff_corridor: "Pasadena",
          confirmation_status: "confirmed",
          minutes_until_pickup: 35,
        },
        {
          ride_id: "R-203",
          rider_id: "U-L3",
          pickup_location: { lat: 34.04, lng: -118.25 },
          pickup_corridor: "DTLA",
          pickup_time: "2026-05-13T18:10:00-07:00",
          dropoff_corridor: "Westwood",
          confirmation_status: "pending",
          minutes_until_pickup: 40,
        },
      ],
      on_demand_forecast: {
        corridors: [
          {
            corridor_id: "DTLA",
            predicted_requests_next_30min: 22,
            predicted_requests_next_60min: 38,
            current_avg_eta_minutes: 7.8,
            baseline_avg_eta_minutes: 5.2,
          },
          {
            corridor_id: "Santa-Monica",
            predicted_requests_next_30min: 9,
            predicted_requests_next_60min: 18,
            current_avg_eta_minutes: 6.4,
            baseline_avg_eta_minutes: 4.6,
          },
          {
            corridor_id: "Hollywood",
            predicted_requests_next_30min: 12,
            predicted_requests_next_60min: 22,
            current_avg_eta_minutes: 6.9,
            baseline_avg_eta_minutes: 4.9,
          },
          {
            corridor_id: "Westwood",
            predicted_requests_next_30min: 7,
            predicted_requests_next_60min: 14,
            current_avg_eta_minutes: 5.8,
            baseline_avg_eta_minutes: 4.3,
          },
        ],
      },
      disruptions: [
        {
          type: "weather",
          description: "Heavy rain across LA basin reducing avg speeds by ~25%.",
          affected_corridors: ["DTLA", "Hollywood", "Santa-Monica", "Westwood", "WeHo", "Mid-City"],
          severity: "medium",
          estimated_speed_reduction_pct: 0.25,
          estimated_duration_minutes: 180,
        },
      ],
      subscription_density_pct: 0.32,
      historical_no_show_rate: 0.06,
      market_maturity_days: 220,
    },
  },

  // ─── 3. Austin cold start ─────────────────────────────────────────────
  {
    id: "austin-cold-start",
    label: "Austin · new market · cold start (<30 days data)",
    blurb:
      "180 available vehicles, 28 scheduled pickups, market_maturity_days = 12, sparse on-demand forecast. Tests new-market behavior: scheduled signal first, no cross-city pattern transfer.",
    input: {
      city: "Austin",
      timestamp: "2026-05-13T08:15:00-05:00",
      time_window: "morning_rush",
      day_type: "weekday",
      fleet: {
        total_vehicles: 190,
        available_vehicles: 180,
        vehicles: [
          vehicle("V301", "idle", 30.27, -97.74, "Downtown"),
          vehicle("V302", "idle", 30.29, -97.72, "East-Austin"),
          vehicle("V303", "occupied", 30.31, -97.75, "North-Loop", 6.3),
          vehicle("V304", "idle", 30.24, -97.77, "South-Lamar"),
          vehicle("V305", "idle", 30.35, -97.78, "Domain"),
          vehicle("V306", "idle", 30.26, -97.73, "Downtown"),
          vehicle("V307", "charging", 30.30, -97.74, "UT-Campus", 14),
          vehicle("V308", "idle", 30.28, -97.71, "East-Austin"),
        ],
      },
      scheduled_rides: [
        {
          ride_id: "R-301",
          rider_id: "U-X1",
          pickup_location: { lat: 30.35, lng: -97.78 },
          pickup_corridor: "Domain",
          pickup_time: "2026-05-13T08:45:00-05:00",
          dropoff_corridor: "Downtown",
          confirmation_status: "confirmed",
          minutes_until_pickup: 30,
        },
        {
          ride_id: "R-302",
          rider_id: "U-X2",
          pickup_location: { lat: 30.24, lng: -97.77 },
          pickup_corridor: "South-Lamar",
          pickup_time: "2026-05-13T08:50:00-05:00",
          dropoff_corridor: "Downtown",
          confirmation_status: "pending",
          minutes_until_pickup: 35,
        },
      ],
      on_demand_forecast: {
        corridors: [
          {
            corridor_id: "Downtown",
            predicted_requests_next_30min: 5,
            predicted_requests_next_60min: 9,
            current_avg_eta_minutes: 6.5,
            baseline_avg_eta_minutes: 5.8,
          },
          {
            corridor_id: "East-Austin",
            predicted_requests_next_30min: 3,
            predicted_requests_next_60min: 6,
            current_avg_eta_minutes: 5.9,
            baseline_avg_eta_minutes: 5.6,
          },
        ],
      },
      disruptions: [],
      subscription_density_pct: 0.10,
      historical_no_show_rate: 0.08,
      market_maturity_days: 12,
    },
  },

  // ─── 4. Phoenix near on-demand floor ──────────────────────────────────
  {
    id: "phx-near-floor",
    label: "Phoenix · heavy schedule load · approaching on-demand floor",
    blurb:
      "200 available vehicles, 65 scheduled pickups (high subscription density 0.45). Forces the on-demand reserve toward the 0.15 floor. Tests guardrail behavior.",
    input: {
      city: "Phoenix",
      timestamp: "2026-05-13T07:45:00-07:00",
      time_window: "morning_rush",
      day_type: "weekday",
      fleet: {
        total_vehicles: 220,
        available_vehicles: 200,
        vehicles: Array.from({ length: 12 }, (_, i) =>
          vehicle(
            `V4${(i + 1).toString().padStart(2, "0")}`,
            i % 4 === 0 ? "occupied" : "idle",
            33.45 + (i % 5) * 0.01,
            -112.07 - (i % 4) * 0.02,
            `C${(i % 6) + 1}`,
            i % 4 === 0 ? 5 + i * 0.3 : 0,
          ),
        ),
      },
      scheduled_rides: Array.from({ length: 8 }, (_, i) => ({
        ride_id: `R-4${(i + 1).toString().padStart(2, "0")}`,
        rider_id: `U-D${i + 1}`,
        pickup_location: { lat: 33.45 + (i % 4) * 0.01, lng: -112.07 - i * 0.01 },
        pickup_corridor: `C${(i % 5) + 1}`,
        pickup_time: `2026-05-13T08:${(15 + i * 4).toString().padStart(2, "0")}:00-07:00`,
        dropoff_corridor: "C3",
        confirmation_status: i % 3 === 0 ? "pending" : "confirmed",
        minutes_until_pickup: 30 + i * 4,
      })),
      on_demand_forecast: {
        corridors: [
          {
            corridor_id: "C1",
            predicted_requests_next_30min: 10,
            predicted_requests_next_60min: 22,
            current_avg_eta_minutes: 5.8,
            baseline_avg_eta_minutes: 4.1,
          },
          {
            corridor_id: "C2",
            predicted_requests_next_30min: 12,
            predicted_requests_next_60min: 25,
            current_avg_eta_minutes: 6.3,
            baseline_avg_eta_minutes: 4.3,
          },
          {
            corridor_id: "C3",
            predicted_requests_next_30min: 16,
            predicted_requests_next_60min: 30,
            current_avg_eta_minutes: 9.1,
            baseline_avg_eta_minutes: 4.1,
          },
          {
            corridor_id: "C4",
            predicted_requests_next_30min: 7,
            predicted_requests_next_60min: 15,
            current_avg_eta_minutes: 4.6,
            baseline_avg_eta_minutes: 3.8,
          },
          {
            corridor_id: "C5",
            predicted_requests_next_30min: 5,
            predicted_requests_next_60min: 11,
            current_avg_eta_minutes: 5.2,
            baseline_avg_eta_minutes: 4.5,
          },
        ],
      },
      disruptions: [],
      subscription_density_pct: 0.45,
      historical_no_show_rate: 0.05,
      market_maturity_days: 360,
    },
  },

  // ─── 5. LA systemic no-show spike ─────────────────────────────────────
  {
    id: "la-systemic-no-shows",
    label: "LA · systemic no-show spike (rate > 0.30)",
    blurb:
      "300 available vehicles, 55 scheduled pickups, historical_no_show_rate = 0.34, multiple no_response rides. Tests systemic_spike detection and adaptive reallocation.",
    input: {
      city: "Los Angeles",
      timestamp: "2026-05-13T08:00:00-07:00",
      time_window: "morning_rush",
      day_type: "weekday",
      fleet: {
        total_vehicles: 320,
        available_vehicles: 300,
        vehicles: [
          vehicle("V501", "idle", 34.02, -118.49, "Santa-Monica"),
          vehicle("V502", "idle", 34.05, -118.24, "DTLA"),
          vehicle("V503", "idle", 34.08, -118.43, "Westwood"),
          vehicle("V504", "occupied", 34.07, -118.36, "WeHo", 6),
          vehicle("V505", "idle", 34.14, -118.14, "Pasadena"),
          vehicle("V506", "idle", 34.10, -118.33, "Hollywood"),
          vehicle("V507", "idle", 34.05, -118.28, "Koreatown"),
          vehicle("V508", "en_route_to_pickup", 34.04, -118.25, "DTLA", 3),
          vehicle("V509", "idle", 34.01, -118.40, "Culver-City"),
          vehicle("V510", "idle", 34.06, -118.31, "Mid-City"),
          vehicle("V511", "idle", 34.06, -118.40, "Beverly-Hills"),
          vehicle("V512", "idle", 34.05, -118.23, "DTLA"),
        ],
      },
      scheduled_rides: [
        {
          ride_id: "R-501",
          rider_id: "U-N1",
          pickup_location: { lat: 34.02, lng: -118.49 },
          pickup_corridor: "Santa-Monica",
          pickup_time: "2026-05-13T08:15:00-07:00",
          dropoff_corridor: "DTLA",
          confirmation_status: "no_response",
          minutes_until_pickup: 15,
        },
        {
          ride_id: "R-502",
          rider_id: "U-N2",
          pickup_location: { lat: 34.10, lng: -118.33 },
          pickup_corridor: "Hollywood",
          pickup_time: "2026-05-13T08:18:00-07:00",
          dropoff_corridor: "DTLA",
          confirmation_status: "no_response",
          minutes_until_pickup: 18,
        },
        {
          ride_id: "R-503",
          rider_id: "U-N3",
          pickup_location: { lat: 34.14, lng: -118.14 },
          pickup_corridor: "Pasadena",
          pickup_time: "2026-05-13T08:20:00-07:00",
          dropoff_corridor: "DTLA",
          confirmation_status: "no_response",
          minutes_until_pickup: 20,
        },
        {
          ride_id: "R-504",
          rider_id: "U-N4",
          pickup_location: { lat: 34.08, lng: -118.43 },
          pickup_corridor: "Westwood",
          pickup_time: "2026-05-13T08:22:00-07:00",
          dropoff_corridor: "DTLA",
          confirmation_status: "confirmed",
          minutes_until_pickup: 22,
        },
        {
          ride_id: "R-505",
          rider_id: "U-N5",
          pickup_location: { lat: 34.06, lng: -118.40 },
          pickup_corridor: "Beverly-Hills",
          pickup_time: "2026-05-13T08:25:00-07:00",
          dropoff_corridor: "DTLA",
          confirmation_status: "pending",
          minutes_until_pickup: 25,
        },
      ],
      on_demand_forecast: {
        corridors: [
          {
            corridor_id: "DTLA",
            predicted_requests_next_30min: 24,
            predicted_requests_next_60min: 42,
            current_avg_eta_minutes: 7.6,
            baseline_avg_eta_minutes: 5.0,
          },
          {
            corridor_id: "Santa-Monica",
            predicted_requests_next_30min: 8,
            predicted_requests_next_60min: 16,
            current_avg_eta_minutes: 5.5,
            baseline_avg_eta_minutes: 4.6,
          },
          {
            corridor_id: "Hollywood",
            predicted_requests_next_30min: 11,
            predicted_requests_next_60min: 21,
            current_avg_eta_minutes: 6.2,
            baseline_avg_eta_minutes: 4.9,
          },
        ],
      },
      disruptions: [],
      subscription_density_pct: 0.30,
      historical_no_show_rate: 0.34,
      market_maturity_days: 240,
    },
  },
];
