"use client";

import { useRef, type PointerEvent, type RefObject } from "react";

interface Props {
  simTimeRef: RefObject<number>;
  fillRef: RefObject<HTMLDivElement | null>;
  playheadRef: RefObject<HTMLDivElement | null>;
  hourLabelRef: RefObject<HTMLSpanElement | null>;
  onPause: () => void;
  onResume: () => void;
}

const HOURS = [6, 8, 10, 12, 14, 16, 18, 20];
const PEAK_BANDS = [
  { startHour: 8, endHour: 9 },
  { startHour: 17, endHour: 19 },
];
const HOURS_SPAN = 21 - 6;

export function Scrubber({ simTimeRef, fillRef, playheadRef, hourLabelRef, onPause, onResume }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const idleTimerRef = useRef<number | null>(null);

  const updateFromPointer = (e: PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const t = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    simTimeRef.current = t;
  };

  const handleDown = (e: PointerEvent<HTMLDivElement>) => {
    onPause();
    if (idleTimerRef.current !== null) {
      window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    updateFromPointer(e);
  };

  const handleMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.buttons === 0) return;
    updateFromPointer(e);
  };

  const handleUp = (e: PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    idleTimerRef.current = window.setTimeout(() => {
      onResume();
      idleTimerRef.current = null;
    }, 2000);
  };

  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 4,
        }}
      >
        <span
          style={{
            fontSize: 10,
            color: "#64748B",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          Time of day · drag to scrub
        </span>
        <span
          ref={hourLabelRef}
          style={{
            fontSize: 13,
            color: "#22D3EE",
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          —
        </span>
      </div>

      <div
        ref={trackRef}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerCancel={handleUp}
        style={{
          position: "relative",
          height: 12,
          padding: "3px 0",
          cursor: "ew-resize",
          touchAction: "none",
        }}
      >
        <div style={{ position: "absolute", left: 0, right: 0, top: 3, height: 6, background: "#1E293B", borderRadius: 3 }}>
          {PEAK_BANDS.map((b, i) => {
            const left = ((b.startHour - 6) / HOURS_SPAN) * 100;
            const width = ((b.endHour - b.startHour) / HOURS_SPAN) * 100;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: `${left}%`,
                  width: `${width}%`,
                  top: 0,
                  height: "100%",
                  background: "#22D3EE",
                  opacity: 0.18,
                  borderRadius: 3,
                }}
              />
            );
          })}
          <div
            ref={fillRef}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              height: "100%",
              width: "0%",
              background: "linear-gradient(90deg, #3B82F6, #22D3EE)",
              borderRadius: 3,
              willChange: "width",
            }}
          />
          <div
            ref={playheadRef}
            style={{
              position: "absolute",
              left: 0,
              top: -6,
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "#E2E8F0",
              transform: "translate(-50%, 0)",
              boxShadow: "0 2px 10px rgba(34, 211, 238, 0.6)",
              border: "3px solid #22D3EE",
              willChange: "left",
              pointerEvents: "none",
            }}
          />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 8,
          fontSize: 9,
          color: "#64748B",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {HOURS.map((h) => (
          <span key={h}>{h <= 12 ? `${h} AM` : `${h - 12} PM`}</span>
        ))}
      </div>
    </div>
  );
}
