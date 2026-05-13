"use client";

import { useMemo } from "react";
import type { AllocatorInput, AllocatorOutput, VehicleAction } from "../lib/schemas";

const W = 520;
const H = 280;
const PADDING = 24;

const ACTION_COLOR: Record<VehicleAction, string> = {
  assign_to_scheduled: "#3B82F6",
  reposition_to_staging: "#F59E0B",
  release_to_on_demand: "#22D3EE",
  hold_position: "#6B7280",
  reroute: "#EF4444",
};

const ACTION_LABEL: Record<VehicleAction, string> = {
  assign_to_scheduled: "Scheduled pickup",
  reposition_to_staging: "Repositioning",
  release_to_on_demand: "On-demand",
  hold_position: "Hold",
  reroute: "Reroute",
};

interface Bounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

function computeBounds(input: AllocatorInput, output: AllocatorOutput): Bounds {
  const lats: number[] = [];
  const lngs: number[] = [];
  input.fleet.vehicles.forEach((v) => {
    lats.push(v.current_location.lat);
    lngs.push(v.current_location.lng);
  });
  input.scheduled_rides.forEach((r) => {
    lats.push(r.pickup_location.lat);
    lngs.push(r.pickup_location.lng);
  });
  output.vehicle_assignments.forEach((a) => {
    lats.push(a.target_location.lat);
    lngs.push(a.target_location.lng);
  });
  if (lats.length === 0) {
    return { minLat: 0, maxLat: 1, minLng: 0, maxLng: 1 };
  }
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  // Pad bounds 5% to avoid edge-clipping.
  const dLat = Math.max(maxLat - minLat, 0.001);
  const dLng = Math.max(maxLng - minLng, 0.001);
  return {
    minLat: minLat - dLat * 0.05,
    maxLat: maxLat + dLat * 0.05,
    minLng: minLng - dLng * 0.05,
    maxLng: maxLng + dLng * 0.05,
  };
}

function makeProjection(bounds: Bounds) {
  const innerW = W - PADDING * 2;
  const innerH = H - PADDING * 2;
  return (lat: number, lng: number): { x: number; y: number } => {
    const xPct = (lng - bounds.minLng) / (bounds.maxLng - bounds.minLng);
    // Latitude axis is flipped (north = top, larger lat = smaller y).
    const yPct = (bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat);
    return {
      x: PADDING + xPct * innerW,
      y: PADDING + yPct * innerH,
    };
  };
}

export function AssignmentMap({
  input,
  output,
}: {
  input: AllocatorInput;
  output: AllocatorOutput;
}) {
  const bounds = useMemo(() => computeBounds(input, output), [input, output]);
  const project = useMemo(() => makeProjection(bounds), [bounds]);

  // Vehicle id → current location lookup so we can draw lines for repositioning.
  const currentByVehicleId = useMemo(() => {
    const m = new Map<string, { lat: number; lng: number }>();
    input.fleet.vehicles.forEach((v) => m.set(v.vehicle_id, v.current_location));
    return m;
  }, [input.fleet.vehicles]);

  return (
    <div
      style={{
        background: "#0B1020",
        border: "1px solid #1E293B",
        borderRadius: 14,
        padding: 14,
      }}
    >
      <div
        style={{
          fontSize: 9,
          color: "#64748B",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          fontWeight: 700,
          marginBottom: 8,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <span>Vehicle assignments · {input.city}</span>
        <span style={{ color: "#475569", letterSpacing: 0, textTransform: "none", fontWeight: 500 }}>
          auto-fit lat/lng · {output.vehicle_assignments.length} actions
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
        <defs>
          <radialGradient id="alloc-bg" cx="50%" cy="40%" r="80%">
            <stop offset="0%" stopColor="#0F1A35" />
            <stop offset="100%" stopColor="#070C1C" />
          </radialGradient>
        </defs>
        <rect x={0} y={0} width={W} height={H} fill="url(#alloc-bg)" rx={10} />

        {/* Grid */}
        <g opacity={0.14} stroke="#3B82F6" strokeWidth={0.5}>
          {Array.from({ length: 7 }).map((_, i) => (
            <line key={`v${i}`} x1={(i * W) / 6} y1={0} x2={(i * W) / 6} y2={H} />
          ))}
          {Array.from({ length: 5 }).map((_, i) => (
            <line key={`h${i}`} x1={0} y1={(i * H) / 4} x2={W} y2={(i * H) / 4} />
          ))}
        </g>

        {/* Pickup pins for scheduled rides — small open circles */}
        {input.scheduled_rides.map((r) => {
          const { x, y } = project(r.pickup_location.lat, r.pickup_location.lng);
          return (
            <circle
              key={`pickup-${r.ride_id}`}
              cx={x}
              cy={y}
              r={4}
              fill="none"
              stroke="#64748B"
              strokeWidth={1}
              strokeDasharray="2 2"
              opacity={0.7}
            />
          );
        })}

        {/* Assignment movement lines */}
        {output.vehicle_assignments.map((a, i) => {
          if (a.action === "hold_position") return null;
          const from = currentByVehicleId.get(a.vehicle_id);
          if (!from) return null;
          const start = project(from.lat, from.lng);
          const end = project(a.target_location.lat, a.target_location.lng);
          const color = ACTION_COLOR[a.action];
          return (
            <line
              key={`line-${i}`}
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke={color}
              strokeWidth={1}
              strokeDasharray="3 3"
              opacity={0.55}
            />
          );
        })}

        {/* Vehicle target dots */}
        {output.vehicle_assignments.map((a, i) => {
          const { x, y } = project(a.target_location.lat, a.target_location.lng);
          const color = ACTION_COLOR[a.action];
          return (
            <g key={`dot-${i}`}>
              <circle cx={x} cy={y} r={6} fill={color} opacity={0.25} />
              <circle cx={x} cy={y} r={3.5} fill={color} />
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 10 }}>
        {(Object.keys(ACTION_COLOR) as VehicleAction[]).map((a) => {
          const used = output.vehicle_assignments.some((x) => x.action === a);
          return (
            <div
              key={a}
              style={{ display: "flex", alignItems: "center", gap: 6, opacity: used ? 1 : 0.4 }}
            >
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: ACTION_COLOR[a],
                  display: "inline-block",
                }}
              />
              <span style={{ fontSize: 10, color: "#CBD5E1", fontWeight: 500 }}>
                {ACTION_LABEL[a]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
