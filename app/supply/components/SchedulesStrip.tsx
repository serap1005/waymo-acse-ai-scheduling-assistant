"use client";

import { matchNeighborhood, type ScheduledRide } from "../lib/scheduleStore";

const DAY_ABBR: Record<string, string> = {
  Monday: "M",
  Tuesday: "T",
  Wednesday: "W",
  Thursday: "Th",
  Friday: "F",
  Saturday: "Sa",
  Sunday: "Su",
};

function formatDays(days: string[]): string {
  const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  if (days.length === 5 && weekdays.every((d) => days.includes(d))) return "M–F";
  if (days.length === 7) return "Daily";
  return days.map((d) => DAY_ABBR[d] ?? d.slice(0, 2)).join("/");
}

export function SchedulesStrip({
  rides,
  onRemove,
}: {
  rides: ScheduledRide[];
  onRemove: (id: string) => void;
}) {
  if (rides.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        alignItems: "center",
        padding: "8px 14px",
        background: "#0B1020",
        borderRadius: 10,
        border: "1px solid #5C3A1A",
        marginBottom: 10,
      }}
    >
      <span
        style={{
          fontSize: 10,
          color: "#FB923C",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fontWeight: 700,
        }}
      >
        Your scheduled commutes · {rides.length}
      </span>
      {rides.map((ride) => {
        const origin = matchNeighborhood(ride.origin);
        const dest = matchNeighborhood(ride.destination);
        const onMap = !!origin && !!dest && origin.name !== dest.name;
        return (
          <span
            key={ride.id}
            title={onMap ? "On map" : "Not yet mapped — your origin/destination doesn't match an LA neighborhood we render"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              background: onMap ? "rgba(251, 146, 60, 0.12)" : "rgba(71, 85, 105, 0.18)",
              border: `1px solid ${onMap ? "#FB923C66" : "#475569"}`,
              borderRadius: 999,
              fontSize: 11,
              color: onMap ? "#E2E8F0" : "#94A3B8",
              fontWeight: 500,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <span style={{ color: onMap ? "#FB923C" : "#64748B", fontSize: 9 }}>●</span>
            {origin?.name ?? ride.origin} → {dest?.name ?? ride.destination}
            <span style={{ color: "#64748B" }}>·</span>
            <span>{formatDays(ride.days)}</span>
            <span style={{ color: "#64748B" }}>·</span>
            <span>{ride.departureTime}</span>
            <button
              onClick={() => onRemove(ride.id)}
              aria-label="Remove schedule"
              style={{
                marginLeft: 4,
                background: "transparent",
                border: "none",
                color: "#64748B",
                cursor: "pointer",
                fontSize: 13,
                padding: 0,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </span>
        );
      })}
    </div>
  );
}
