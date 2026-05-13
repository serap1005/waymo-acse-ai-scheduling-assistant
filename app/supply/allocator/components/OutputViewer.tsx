"use client";

import type { AllocatorInput, AllocatorResponse } from "../lib/schemas";
import { AssignmentMap } from "./AssignmentMap";
import { ConstraintBadges } from "./ConstraintBadges";
import { JsonViewer } from "./JsonViewer";
import { TradeoffCard } from "./TradeoffCard";

interface Props {
  input: AllocatorInput;
  response: AllocatorResponse;
}

const metaStyle = {
  fontSize: 10,
  color: "#64748B",
  letterSpacing: "0.15em",
  textTransform: "uppercase" as const,
  fontWeight: 700,
};

function formatTokens(n: number): string {
  return n.toLocaleString();
}

export function OutputViewer({ input, response }: Props) {
  const { decision, constraint_checks, latency_ms, tokens } = response;
  const totalInputTokens = tokens.input + tokens.cached_input + tokens.cache_creation_input;
  const cacheHit = tokens.cached_input > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <TradeoffCard output={decision} />
      <ConstraintBadges checks={constraint_checks} />
      <AssignmentMap input={input} output={decision} />

      <div
        style={{
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          padding: "10px 14px",
          background: "#0B1020",
          border: "1px solid #1E293B",
          borderRadius: 10,
        }}
      >
        <div>
          <div style={metaStyle}>Latency</div>
          <div style={{ fontSize: 13, color: "#E2E8F0", fontWeight: 700, fontVariantNumeric: "tabular-nums", marginTop: 2 }}>
            {(latency_ms / 1000).toFixed(2)}s
          </div>
        </div>
        <div>
          <div style={metaStyle}>Input tokens</div>
          <div style={{ fontSize: 13, color: "#E2E8F0", fontWeight: 700, fontVariantNumeric: "tabular-nums", marginTop: 2 }}>
            {formatTokens(totalInputTokens)}
            {cacheHit && (
              <span style={{ fontSize: 10, color: "#22C55E", marginLeft: 6 }}>
                ({formatTokens(tokens.cached_input)} cached)
              </span>
            )}
          </div>
        </div>
        <div>
          <div style={metaStyle}>Output tokens</div>
          <div style={{ fontSize: 13, color: "#E2E8F0", fontWeight: 700, fontVariantNumeric: "tabular-nums", marginTop: 2 }}>
            {formatTokens(tokens.output)}
          </div>
        </div>
        <div>
          <div style={metaStyle}>Decision ID</div>
          <div
            style={{
              fontSize: 11,
              color: "#94A3B8",
              fontFamily: "ui-monospace, monospace",
              marginTop: 2,
            }}
          >
            {decision.decision_id}
          </div>
        </div>
      </div>

      <JsonViewer data={decision} label="Decision · raw JSON" />
    </div>
  );
}
