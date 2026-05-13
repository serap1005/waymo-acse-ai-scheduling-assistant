"use client";

import type { ConstraintCheck } from "../lib/schemas";

const RULE_LABEL: Record<ConstraintCheck["rule"], string> = {
  on_demand_floor: "On-demand floor ≥ 15%",
  corridor_caps: "Corridor caps ≤ 60%",
  reassignment_sla: "Reassignment SLA ≤ 4 min",
};

export function ConstraintBadges({ checks }: { checks: ConstraintCheck[] }) {
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
          marginBottom: 10,
        }}
      >
        Hard-constraint validation (server-side)
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {checks.map((c) => {
          const color = c.passed ? "#22C55E" : "#EF4444";
          return (
            <div
              key={c.rule}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "8px 12px",
                background: `${color}11`,
                border: `1px solid ${color}44`,
                borderRadius: 8,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: color,
                  flexShrink: 0,
                  boxShadow: `0 0 8px ${color}99`,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#E2E8F0" }}>
                  {RULE_LABEL[c.rule]}
                  <span style={{ marginLeft: 8, color, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em" }}>
                    {c.passed ? "PASS" : "FAIL"}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#94A3B8",
                    marginTop: 2,
                    fontVariantNumeric: "tabular-nums",
                    fontFamily: "ui-monospace, monospace",
                  }}
                >
                  {c.detail}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
