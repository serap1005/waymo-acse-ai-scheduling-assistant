"use client";

import type { ScheduledRide } from "../lib/scheduleStore";

// Sample schedules for demo rehearsal. Mix of corridors that match pre-baked
// ones (Santa Monica → DTLA), novel matches (Beverly Hills → DTLA), and one
// no-match case (Mission District) so we can show all three rendering branches.
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
        bottom: 16,
        right: 16,
        zIndex: 9998,
        display: "flex",
        gap: 6,
        background: "rgba(11, 16, 32, 0.85)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        padding: 6,
        borderRadius: 999,
        border: "1px dashed #475569",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)",
      }}
    >
      <span
        style={{
          fontSize: 9,
          color: "#64748B",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fontWeight: 700,
          padding: "5px 8px 5px 10px",
          alignSelf: "center",
        }}
      >
        Demo
      </span>
      <button
        onClick={handleInject}
        style={{
          padding: "5px 12px",
          borderRadius: 999,
          background: "#22D3EE",
          color: "#0B1020",
          border: "none",
          fontSize: 11,
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
            padding: "5px 12px",
            borderRadius: 999,
            background: "transparent",
            color: "#94A3B8",
            border: "1px solid #475569",
            fontSize: 11,
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
