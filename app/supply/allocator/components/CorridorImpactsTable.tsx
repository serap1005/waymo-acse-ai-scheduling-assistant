"use client";

import type { CorridorImpact } from "../lib/schemas";

const CAP_LIMIT = 0.60;
const CAP_WARN = 0.50;

function CapBar({ pct }: { pct: number }) {
  const overWarn = pct >= CAP_WARN;
  const overLimit = pct > CAP_LIMIT;
  const fillColor = overLimit ? "#EF4444" : overWarn ? "#F59E0B" : "#22D3EE";
  const widthPct = Math.min(pct / CAP_LIMIT, 1.15) * 100;
  return (
    <div style={{ position: "relative", height: 6, background: "#1E293B", borderRadius: 3, width: 100 }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          height: "100%",
          width: `${widthPct * (CAP_LIMIT)}%`,
          background: fillColor,
          borderRadius: 3,
          opacity: 0.9,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: `${CAP_LIMIT * 100}%`,
          top: -2,
          width: 1.5,
          height: 10,
          background: "#94A3B8",
          opacity: 0.7,
        }}
        title="60% cap"
      />
    </div>
  );
}

export function CorridorImpactsTable({ impacts }: { impacts: CorridorImpact[] }) {
  if (impacts.length === 0) return null;

  // Sort by cap usage descending so the at-risk corridors land at the top.
  const sorted = [...impacts].sort((a, b) => b.corridor_cap_usage_pct - a.corridor_cap_usage_pct);

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
        Corridor impacts · {impacts.length}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.7fr 1.3fr 0.7fr 1fr", gap: 0, fontSize: 11 }}>
        {/* Header row */}
        <Header>Corridor</Header>
        <Header align="right">Vehicles</Header>
        <Header>Cap usage</Header>
        <Header align="right">ETA Δ</Header>
        <Header>Alert</Header>

        {sorted.map((c) => (
          <Row key={c.corridor_id} impact={c} />
        ))}
      </div>
    </div>
  );
}

function Header({ children, align }: { children: React.ReactNode; align?: "right" }) {
  return (
    <div
      style={{
        fontSize: 9,
        color: "#475569",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        fontWeight: 700,
        padding: "6px 10px",
        borderBottom: "1px solid #1E293B",
        textAlign: align ?? "left",
      }}
    >
      {children}
    </div>
  );
}

function Row({ impact }: { impact: CorridorImpact }) {
  const capPct = impact.corridor_cap_usage_pct;
  const etaDelta = impact.eta_delta_vs_baseline_pct;
  const capLabel = `${(capPct * 100).toFixed(0)}%`;
  const overCap = capPct > CAP_LIMIT;
  const etaConcern = etaDelta > 0.10;

  return (
    <>
      <Cell>
        <span style={{ color: "#E2E8F0", fontWeight: 600 }}>{impact.corridor_id}</span>
      </Cell>
      <Cell align="right">
        <span style={{ color: "#CBD5E1", fontVariantNumeric: "tabular-nums" }}>
          {impact.scheduled_vehicles_allocated}
        </span>
      </Cell>
      <Cell>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <CapBar pct={capPct} />
          <span
            style={{
              fontSize: 11,
              color: overCap ? "#EF4444" : "#CBD5E1",
              fontVariantNumeric: "tabular-nums",
              fontWeight: 600,
              minWidth: 32,
            }}
          >
            {capLabel}
          </span>
        </div>
      </Cell>
      <Cell align="right">
        <span
          style={{
            color: etaConcern ? "#F59E0B" : etaDelta < 0 ? "#22C55E" : "#CBD5E1",
            fontVariantNumeric: "tabular-nums",
            fontWeight: 600,
          }}
        >
          {etaDelta >= 0 ? "+" : ""}
          {(etaDelta * 100).toFixed(1)}%
        </span>
      </Cell>
      <Cell>
        {impact.alert ? (
          <span style={{ color: "#F59E0B", fontSize: 10 }}>{impact.alert}</span>
        ) : (
          <span style={{ color: "#475569", fontSize: 10 }}>—</span>
        )}
      </Cell>
    </>
  );
}

function Cell({
  children,
  align,
}: {
  children: React.ReactNode;
  align?: "right";
}) {
  return (
    <div
      style={{
        padding: "8px 10px",
        borderBottom: "1px solid #0F172A",
        textAlign: align ?? "left",
        display: "flex",
        alignItems: "center",
        justifyContent: align === "right" ? "flex-end" : "flex-start",
      }}
    >
      {children}
    </div>
  );
}
