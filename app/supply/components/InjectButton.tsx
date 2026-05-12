"use client";

import type { ScheduledRide } from "../lib/scheduleStore";

const SAMPLES: Omit<ScheduledRide, "id" | "createdAt">[] = [
  {
    origin: "Santa Monica",
    destination: "DTLA",
    days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    departureTime: "8:00 AM",
    returnTrip: false,
    lockedPrice: "$28",
  },
  {
    origin: "Beverly Hills",
    destination: "DTLA",
    days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    departureTime: "7:45 AM",
    returnTrip: false,
    lockedPrice: "$22",
  },
  {
    origin: "Culver City",
    destination: "DTLA",
    days: ["Monday", "Wednesday", "Friday"],
    departureTime: "8:30 AM",
    returnTrip: false,
    lockedPrice: "$24",
  },
  {
    origin: "Pasadena",
    destination: "DTLA",
    days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    departureTime: "8:15 AM",
    returnTrip: false,
    lockedPrice: "$26",
  },
  {
    origin: "Hollywood",
    destination: "DTLA",
    days: ["Tuesday", "Thursday"],
    departureTime: "9:00 AM",
    returnTrip: false,
    lockedPrice: "$18",
  },
];

export function InjectButton({
  onInject,
  onClear,
  hasRides,
}: {
  onInject: (sample: Omit<ScheduledRide, "id" | "createdAt">) => void;
  onClear: () => void;
  hasRides: boolean;
}) {
  const handleInject = () => {
    const sample = SAMPLES[Math.floor(Math.random() * SAMPLES.length)];
    onInject(sample);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 44,
        right: 250,
        zIndex: 9998,
        display: "flex",
        gap: 4,
        alignItems: "center",
        background: "rgba(255,255,255,0.08)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        padding: 6,
        borderRadius: 999,
        border: "1.5px dashed rgba(255,255,255,0.2)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      }}
    >
      <span
        style={{
          fontSize: 11,
          color: "#64748B",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          fontWeight: 700,
          padding: "0 8px",
          alignSelf: "center",
        }}
      >
        Demo
      </span>
      <button
        onClick={handleInject}
        style={{
          padding: "10px 22px",
          borderRadius: 999,
          background: "#22D3EE",
          color: "#0B1020",
          border: "none",
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: "0.05em",
          cursor: "pointer",
        }}
      >
        + Test schedule
      </button>
      {hasRides && (
        <button
          onClick={onClear}
          style={{
            padding: "10px 18px",
            borderRadius: 999,
            background: "transparent",
            color: "#94A3B8",
            border: "1px solid rgba(255,255,255,0.2)",
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.05em",
            cursor: "pointer",
          }}
        >
          × Clear
        </button>
      )}
    </div>
  );
}