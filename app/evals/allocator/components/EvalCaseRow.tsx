"use client";

import type { EvalCase, EvalResult } from "@/app/supply/allocator/lib/schemas";

const CATEGORY_COLOR: Record<EvalCase["category"], string> = {
  baseline: "#22D3EE",
  no_show: "#F59E0B",
  disruption: "#EF4444",
  fleet_constraint: "#3B82F6",
  new_market: "#A78BFA",
  edge: "#94A3B8",
};

const CATEGORY_LABEL: Record<EvalCase["category"], string> = {
  baseline: "Baseline",
  no_show: "No-show",
  disruption: "Disruption",
  fleet_constraint: "Fleet",
  new_market: "New market",
  edge: "Edge",
};

interface Props {
  caseDef: EvalCase;
  result: EvalResult | undefined;
  isRunning: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onRun: () => void;
  disabled: boolean;
}

function Status({ result, isRunning }: { result: EvalResult | undefined; isRunning: boolean }) {
  if (isRunning) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 9px", borderRadius: 999, background: "rgba(34, 211, 238, 0.15)", border: "1px solid #22D3EE66", color: "#22D3EE", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em" }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22D3EE", animation: "eval-pulse 0.8s ease-in-out infinite" }} />
        RUNNING
        <style>{`@keyframes eval-pulse { 0%,100% { opacity: 0.3; } 50% { opacity: 1; } }`}</style>
      </span>
    );
  }
  if (!result) {
    return <span style={{ padding: "3px 9px", borderRadius: 999, color: "#64748B", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", border: "1px solid #1E293B" }}>— NOT RUN</span>;
  }
  if (result.error) {
    return <span style={{ padding: "3px 9px", borderRadius: 999, background: "rgba(245, 158, 11, 0.15)", border: "1px solid #F59E0B66", color: "#F59E0B", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em" }}>⚠ ERROR</span>;
  }
  const color = result.passed ? "#22C55E" : "#EF4444";
  return <span style={{ padding: "3px 9px", borderRadius: 999, background: `${color}22`, border: `1px solid ${color}66`, color, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em" }}>{result.passed ? "✓ PASS" : "✗ FAIL"}</span>;
}

function AssertionRow({ name, pass, detail }: { name: string; pass: boolean; detail: string }) {
  const color = pass ? "#22C55E" : "#EF4444";
  return (
    <div style={{ display: "flex", gap: 10, padding: "6px 0", borderBottom: "1px solid #0F172A", fontSize: 11, alignItems: "flex-start" }}>
      <span style={{ color, fontWeight: 800, minWidth: 14, marginTop: 1 }}>{pass ? "✓" : "✗"}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "#E2E8F0", fontWeight: 600 }}>{name}</div>
        <div style={{ color: "#94A3B8", marginTop: 2, fontFamily: "ui-monospace, monospace", fontSize: 10, wordBreak: "break-word" }}>{detail}</div>
      </div>
    </div>
  );
}

export function EvalCaseRow({ caseDef, result, isRunning, expanded, onToggleExpand, onRun, disabled }: Props) {
  const categoryColor = CATEGORY_COLOR[caseDef.category];

  return (
    <div style={{ background: "#0B1020", border: "1px solid #1E293B", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "auto auto 1fr auto auto", gap: 12, padding: "10px 14px", alignItems: "center" }}>
        <span title={caseDef.critical ? "Critical (must pass for launch)" : ""}>
          <span style={{ fontSize: 11, color: caseDef.critical ? "#F59E0B" : "#1E293B", fontWeight: 800 }}>★</span>
        </span>
        <span style={{ padding: "2px 8px", borderRadius: 999, background: `${categoryColor}22`, color: categoryColor, fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
          {CATEGORY_LABEL[caseDef.category]}
        </span>
        <button onClick={onToggleExpand} style={{ background: "transparent", border: "none", color: "#E2E8F0", fontSize: 12, textAlign: "left", padding: 0, cursor: "pointer", display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
          <span style={{ fontSize: 11, color: "#475569", fontVariantNumeric: "tabular-nums", fontFamily: "ui-monospace, monospace" }}>{caseDef.id}</span>
          <span style={{ color: "#E2E8F0", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{caseDef.label}</span>
        </button>
        <Status result={result} isRunning={isRunning} />
        <button onClick={onRun} disabled={disabled || isRunning} style={{ padding: "5px 11px", borderRadius: 999, background: disabled || isRunning ? "#1E293B" : "transparent", color: disabled || isRunning ? "#64748B" : "#22D3EE", border: `1px solid ${disabled || isRunning ? "#1E293B" : "#22D3EE66"}`, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", cursor: disabled || isRunning ? "not-allowed" : "pointer" }}>
          ▶ RUN
        </button>
      </div>

      {expanded && (
        <div style={{ borderTop: "1px solid #1E293B", padding: "10px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.5 }}>{caseDef.description}</div>

          {result?.error && (
            <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#EF4444", fontSize: 11 }}>
              Error: {result.error}
            </div>
          )}

          {result && !result.error && (
            <>
              <div>
                <div style={{ fontSize: 9, color: "#64748B", letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>Hard constraints</div>
                {result.hardConstraints.map((c) => (
                  <AssertionRow key={c.rule} name={c.rule.replace(/_/g, " ")} pass={c.passed} detail={c.detail} />
                ))}
              </div>

              {result.assertions.length > 0 && (
                <div>
                  <div style={{ fontSize: 9, color: "#64748B", letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>Scenario assertions</div>
                  {result.assertions.map((a, i) => (
                    <AssertionRow key={i} name={a.name} pass={a.pass} detail={a.detail} />
                  ))}
                </div>
              )}

              <div style={{ fontSize: 10, color: "#475569", display: "flex", gap: 16 }}>
                <span>Latency: {(result.latencyMs / 1000).toFixed(2)}s</span>
                <span>
                  Tokens: {result.tokens.input + result.tokens.cached_input + result.tokens.cache_creation_input} in / {result.tokens.output} out
                  {result.tokens.cached_input > 0 && <span style={{ color: "#22C55E", marginLeft: 4 }}>({result.tokens.cached_input} cached)</span>}
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
