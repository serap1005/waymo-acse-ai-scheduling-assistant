"use client";

import type { AllocatorOutput } from "../lib/schemas";

const labelStyle = {
  fontSize: 9,
  color: "#64748B",
  letterSpacing: "0.18em",
  textTransform: "uppercase" as const,
  fontWeight: 700,
};

const SEVERITY_COLOR: Record<"low" | "medium" | "high", string> = {
  low: "#94A3B8",
  medium: "#F59E0B",
  high: "#EF4444",
};

function fmtPct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

export function TradeoffCard({ output }: { output: AllocatorOutput }) {
  const s = output.tradeoff_summary;
  return (
    <div
      style={{
        background: "#0B1020",
        border: "1px solid #1E293B",
        borderRadius: 14,
        padding: 16,
      }}
    >
      <div style={labelStyle}>Recommendation</div>
      <div style={{ fontSize: 14, color: "#E2E8F0", marginTop: 6, lineHeight: 1.55 }}>
        {s.recommendation}
      </div>

      <div style={{ display: "flex", gap: 24, marginTop: 16, flexWrap: "wrap" }}>
        <div>
          <div style={labelStyle}>Scheduled ETA compliance</div>
          <div style={{ fontSize: 22, color: "#22D3EE", fontWeight: 700, fontVariantNumeric: "tabular-nums", marginTop: 2 }}>
            {fmtPct(s.scheduled_eta_compliance_pct)}
          </div>
        </div>
        <div>
          <div style={labelStyle}>On-demand ETA impact</div>
          <div
            style={{
              fontSize: 22,
              color: s.on_demand_eta_impact_pct > 0.10 ? "#F59E0B" : "#E2E8F0",
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
              marginTop: 2,
            }}
          >
            {s.on_demand_eta_impact_pct >= 0 ? "+" : ""}
            {fmtPct(s.on_demand_eta_impact_pct)}
          </div>
        </div>
        <div>
          <div style={labelStyle}>Deadheading</div>
          <div style={{ fontSize: 22, color: "#E2E8F0", fontWeight: 700, fontVariantNumeric: "tabular-nums", marginTop: 2 }}>
            {fmtPct(s.deadheading_rate_pct)}
          </div>
        </div>
      </div>

      {s.capacity_warnings.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={labelStyle}>Capacity warnings · {s.capacity_warnings.length}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
            {s.capacity_warnings.map((w, i) => (
              <div
                key={i}
                style={{
                  fontSize: 11,
                  color: "#CBD5E1",
                  display: "flex",
                  gap: 8,
                  alignItems: "flex-start",
                  padding: "6px 10px",
                  background: "rgba(15, 23, 42, 0.6)",
                  borderRadius: 6,
                  borderLeft: `3px solid ${SEVERITY_COLOR[w.severity]}`,
                }}
              >
                <span style={{ color: SEVERITY_COLOR[w.severity], fontWeight: 700, textTransform: "uppercase", fontSize: 9, letterSpacing: "0.1em", marginTop: 2 }}>
                  {w.severity}
                </span>
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {w.warning_type.replace(/_/g, " ")} · {w.corridor_id}
                  </div>
                  <div style={{ color: "#94A3B8", marginTop: 2 }}>{w.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
