"use client";

import { type RefObject } from "react";

export interface HeroRefs {
  deadheadValue: RefObject<HTMLSpanElement | null>;
  peakEtaDelta: RefObject<HTMLSpanElement | null>;
  extraRides: RefObject<HTMLSpanElement | null>;
}

export function HeroBlock({ refs }: { refs: HeroRefs }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 28, marginBottom: 12, flexWrap: "wrap" }}>
      <div>
        <div
          style={{
            fontSize: 10,
            color: "#64748B",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          With Commute Pass
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 2 }}>
          <span
            ref={refs.deadheadValue}
            style={{
              fontSize: 52,
              fontWeight: 800,
              color: "#22D3EE",
              letterSpacing: "-0.02em",
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1,
            }}
          >
            —
          </span>
          <span style={{ fontSize: 14, color: "#94A3B8", fontWeight: 500 }}>
            deadheading vs. on-demand only
          </span>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 24,
          paddingLeft: 22,
          borderLeft: "1px solid #1E293B",
          alignSelf: "stretch",
          alignItems: "center",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 9,
              color: "#64748B",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            Peak ETA
          </div>
          <div
            style={{
              fontSize: 18,
              color: "#E2E8F0",
              fontWeight: 700,
              marginTop: 2,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <span ref={refs.peakEtaDelta}>—</span>
            <span style={{ fontSize: 11, color: "#64748B", fontWeight: 500, marginLeft: 4 }}>min</span>
          </div>
        </div>
        <div>
          <div
            style={{
              fontSize: 9,
              color: "#64748B",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            Extra rides served
          </div>
          <div
            style={{
              fontSize: 18,
              color: "#E2E8F0",
              fontWeight: 700,
              marginTop: 2,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <span ref={refs.extraRides}>—</span>
          </div>
        </div>
      </div>
    </div>
  );
}
