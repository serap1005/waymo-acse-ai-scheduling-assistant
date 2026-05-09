"use client";

import { STATE_COLOR, type VehicleState } from "../lib/types";

const ITEMS: { state: VehicleState; label: string }[] = [
  { state: "idle", label: "Empty (deadheading)" },
  { state: "dispatched", label: "Dispatched to pickup" },
  { state: "with_passenger", label: "With passenger (revenue)" },
];

export function Legend() {
  return (
    <div
      style={{
        display: "flex",
        gap: 18,
        flexWrap: "wrap",
        padding: "8px 14px",
        background: "#0B1020",
        borderRadius: 10,
        border: "1px solid #1E293B",
        marginBottom: 10,
        alignItems: "center",
      }}
    >
      {ITEMS.map((it) => (
        <div key={it.state} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 11,
              height: 11,
              borderRadius: "50%",
              background: STATE_COLOR[it.state],
              boxShadow: `0 0 8px ${STATE_COLOR[it.state]}66`,
              display: "inline-block",
            }}
          />
          <span style={{ fontSize: 12, color: "#CBD5E1", fontWeight: 500 }}>{it.label}</span>
        </div>
      ))}
      <span
        style={{
          fontSize: 11,
          color: "#64748B",
          marginLeft: "auto",
          fontStyle: "italic",
        }}
      >
        Empty miles = wasted supply.
      </span>
    </div>
  );
}
