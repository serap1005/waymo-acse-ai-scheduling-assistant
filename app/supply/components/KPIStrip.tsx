"use client";

import { type RefObject } from "react";

export interface KpiRefs {
  ondemandDeadhead: RefObject<HTMLSpanElement | null>;
  ondemandEta: RefObject<HTMLSpanElement | null>;
  ondemandActive: RefObject<HTMLSpanElement | null>;
  commutepassDeadhead: RefObject<HTMLSpanElement | null>;
  commutepassSubEta: RefObject<HTMLSpanElement | null>;
  commutepassNonSubEta: RefObject<HTMLSpanElement | null>;
  commutepassActive: RefObject<HTMLSpanElement | null>;
  deadheadDelta: RefObject<HTMLSpanElement | null>;
  etaDelta: RefObject<HTMLSpanElement | null>;
  activeDelta: RefObject<HTMLSpanElement | null>;
}

const labelStyle = {
  fontSize: 9,
  color: "#64748B",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  fontWeight: 700,
} as const;

const numStyle = {
  fontVariantNumeric: "tabular-nums",
  fontWeight: 700,
} as const;

const subLabelStyle = {
  fontSize: 8,
  color: "#475569",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  fontWeight: 700,
  marginRight: 4,
} as const;

function Cell({
  label,
  unit,
  leftRef,
  rightSimpleRef,
  rightSplitTopRef,
  rightSplitBottomRef,
  deltaRef,
}: {
  label: string;
  unit?: string;
  leftRef: RefObject<HTMLSpanElement | null>;
  rightSimpleRef?: RefObject<HTMLSpanElement | null>;
  rightSplitTopRef?: RefObject<HTMLSpanElement | null>;
  rightSplitBottomRef?: RefObject<HTMLSpanElement | null>;
  deltaRef: RefObject<HTMLSpanElement | null>;
}) {
  return (
    <div style={{ flex: 1, padding: "8px 12px" }}>
      <div style={labelStyle}>
        {label}
        {unit && <span style={{ color: "#475569", marginLeft: 5, letterSpacing: 0 }}>({unit})</span>}
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginTop: 4 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 8, color: "#64748B", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            On-demand
          </div>
          <div style={{ fontSize: 18, color: "#94A3B8", marginTop: 0, ...numStyle }}>
            <span ref={leftRef}>—</span>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 8, color: "#22D3EE", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Commute Pass
          </div>
          {rightSimpleRef ? (
            <div style={{ fontSize: 18, color: "#22D3EE", marginTop: 0, ...numStyle }}>
              <span ref={rightSimpleRef}>—</span>
            </div>
          ) : (
            <div style={{ marginTop: 0 }}>
              <div style={{ fontSize: 13, color: "#22D3EE", ...numStyle }}>
                <span style={subLabelStyle}>Sub</span>
                <span ref={rightSplitTopRef}>—</span>
              </div>
              <div style={{ fontSize: 13, color: "#94A3B8", ...numStyle }}>
                <span style={subLabelStyle}>Non-sub</span>
                <span ref={rightSplitBottomRef}>—</span>
              </div>
            </div>
          )}
          <div style={{ fontSize: 10, color: "#22D3EE", marginTop: 3, ...numStyle }}>
            <span ref={deltaRef}>—</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function KPIStrip({ refs }: { refs: KpiRefs }) {
  return (
    <div
      style={{
        display: "flex",
        marginBottom: 10,
        background: "#0B1020",
        borderRadius: 12,
        border: "1px solid #1E293B",
        overflow: "hidden",
      }}
    >
      <Cell
        label="Deadhead"
        unit="%"
        leftRef={refs.ondemandDeadhead}
        rightSimpleRef={refs.commutepassDeadhead}
        deltaRef={refs.deadheadDelta}
      />
      <div style={{ width: 1, background: "#1E293B" }} />
      <Cell
        label="Avg ETA"
        unit="min"
        leftRef={refs.ondemandEta}
        rightSplitTopRef={refs.commutepassSubEta}
        rightSplitBottomRef={refs.commutepassNonSubEta}
        deltaRef={refs.etaDelta}
      />
      <div style={{ width: 1, background: "#1E293B" }} />
      <Cell
        label="Vehicles active"
        leftRef={refs.ondemandActive}
        rightSimpleRef={refs.commutepassActive}
        deltaRef={refs.activeDelta}
      />
    </div>
  );
}
