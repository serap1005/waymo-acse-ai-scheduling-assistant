"use client";

import { useState } from "react";
import type { VehicleAction, VehicleAssignment } from "../lib/schemas";

const ACTION_LABEL: Record<VehicleAction, string> = {
  assign_to_scheduled: "Scheduled",
  reposition_to_staging: "Repositioning",
  release_to_on_demand: "On-demand",
  hold_position: "Hold",
  reroute: "Reroute",
};

const ACTION_COLOR: Record<VehicleAction, string> = {
  assign_to_scheduled: "#3B82F6",
  reposition_to_staging: "#F59E0B",
  release_to_on_demand: "#22D3EE",
  hold_position: "#6B7280",
  reroute: "#EF4444",
};

const ACTION_ORDER: VehicleAction[] = [
  "assign_to_scheduled",
  "reposition_to_staging",
  "release_to_on_demand",
  "hold_position",
  "reroute",
];

export function AssignmentsSummary({ assignments }: { assignments: VehicleAssignment[] }) {
  const [expanded, setExpanded] = useState(false);
  if (assignments.length === 0) return null;

  const counts = new Map<VehicleAction, number>();
  for (const a of assignments) counts.set(a.action, (counts.get(a.action) ?? 0) + 1);

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
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <div
          style={{
            fontSize: 9,
            color: "#64748B",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          Vehicle assignments · {assignments.length}
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          style={{
            background: "transparent",
            border: "none",
            color: "#64748B",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.1em",
            cursor: "pointer",
            padding: 0,
          }}
        >
          {expanded ? "▼ Hide list" : "▶ Show all"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
        {ACTION_ORDER.map((action) => {
          const count = counts.get(action) ?? 0;
          if (count === 0) return null;
          return (
            <div key={action} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: ACTION_COLOR[action],
                  display: "inline-block",
                }}
              />
              <span style={{ fontSize: 13, color: "#E2E8F0", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                {count}
              </span>
              <span style={{ fontSize: 11, color: "#94A3B8" }}>{ACTION_LABEL[action]}</span>
            </div>
          );
        })}
      </div>

      {expanded && (
        <div style={{ marginTop: 12, borderTop: "1px solid #1E293B", paddingTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
          {assignments.map((a) => (
            <div
              key={a.vehicle_id}
              style={{
                display: "grid",
                gridTemplateColumns: "70px 110px 1fr 70px",
                gap: 10,
                fontSize: 11,
                padding: "4px 0",
                alignItems: "baseline",
              }}
            >
              <span style={{ color: "#94A3B8", fontVariantNumeric: "tabular-nums" }}>{a.vehicle_id}</span>
              <span style={{ color: ACTION_COLOR[a.action], fontWeight: 600 }}>
                {ACTION_LABEL[a.action]}
              </span>
              <span style={{ color: "#CBD5E1", lineHeight: 1.45 }}>{a.reason}</span>
              <span style={{ color: "#64748B", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                {a.estimated_arrival_minutes.toFixed(1)}m
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
