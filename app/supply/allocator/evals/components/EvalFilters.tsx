"use client";

import type { EvalCase } from "../../lib/schemas";

export type CategoryFilter = "all" | EvalCase["category"];
export type StatusFilter = "all" | "pending" | "passed" | "failed";

interface Props {
  category: CategoryFilter;
  status: StatusFilter;
  onCategoryChange: (c: CategoryFilter) => void;
  onStatusChange: (s: StatusFilter) => void;
}

const CATEGORY_OPTIONS: { value: CategoryFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "baseline", label: "Baseline" },
  { value: "no_show", label: "No-show" },
  { value: "disruption", label: "Disruption" },
  { value: "fleet_constraint", label: "Fleet" },
  { value: "new_market", label: "New market" },
  { value: "edge", label: "Edge" },
];

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "passed", label: "Passed" },
  { value: "failed", label: "Failed" },
  { value: "pending", label: "Not run" },
];

const labelStyle = {
  fontSize: 9,
  color: "#475569",
  letterSpacing: "0.18em",
  textTransform: "uppercase" as const,
  fontWeight: 700,
  alignSelf: "center" as const,
  marginRight: 10,
};

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "5px 11px",
        borderRadius: 999,
        background: active ? "#22D3EE" : "transparent",
        color: active ? "#0B1020" : "#94A3B8",
        border: `1px solid ${active ? "#22D3EE" : "#1E293B"}`,
        fontSize: 11,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

export function EvalFilters({ category, status, onCategoryChange, onStatusChange }: Props) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: "10px 14px",
        background: "#0B1020",
        border: "1px solid #1E293B",
        borderRadius: 12,
      }}
    >
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <span style={labelStyle}>Category</span>
        {CATEGORY_OPTIONS.map((opt) => (
          <Pill key={opt.value} active={category === opt.value} onClick={() => onCategoryChange(opt.value)}>
            {opt.label}
          </Pill>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <span style={labelStyle}>Status</span>
        {STATUS_OPTIONS.map((opt) => (
          <Pill key={opt.value} active={status === opt.value} onClick={() => onStatusChange(opt.value)}>
            {opt.label}
          </Pill>
        ))}
      </div>
    </div>
  );
}
