"use client";

import type { ChatbotEvalCase } from "../lib/chatbotEvalCases";
import type { ChatbotEvalResult } from "../lib/runChatbotEvalCase";

const LAUNCH_GATE_OVERALL = 0.90;

interface Props {
  cases: ChatbotEvalCase[];
  results: Map<string, ChatbotEvalResult>;
  runAllActive: boolean;
  onRunAll: () => void;
  onClear: () => void;
}

const labelStyle = {
  fontSize: 9,
  color: "#64748B",
  letterSpacing: "0.18em",
  textTransform: "uppercase" as const,
  fontWeight: 700,
};

export function ChatbotEvalSummaryBar({ cases, results, runAllActive, onRunAll, onClear }: Props) {
  const total = cases.length;
  const completed = Array.from(results.values());
  const passed = completed.filter((r) => r.passed).length;
  const runCount = completed.length;

  const criticalCases = cases.filter((c) => c.critical);
  const criticalResults = criticalCases
    .map((c) => results.get(c.id))
    .filter((r): r is ChatbotEvalResult => !!r);
  const criticalPassed = criticalResults.filter((r) => r.passed).length;
  const criticalTotal = criticalCases.length;

  const avgLatency =
    completed.length > 0
      ? completed.reduce((sum, r) => sum + r.latencyMs, 0) / completed.length / 1000
      : 0;

  const overallPct = runCount > 0 ? passed / runCount : 0;
  const launchGateMet = runCount === total && overallPct >= LAUNCH_GATE_OVERALL && criticalPassed === criticalTotal;
  const launchGateLabel = runCount < total ? `${runCount}/${total} run` : launchGateMet ? "PASS" : "FAIL";
  const launchGateColor = runCount < total ? "#64748B" : launchGateMet ? "#22C55E" : "#EF4444";

  return (
    <div style={{ background: "#0B1020", border: "1px solid #1E293B", borderRadius: 14, padding: "14px 18px", display: "flex", gap: 28, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", gap: 28, flexWrap: "wrap", alignItems: "baseline" }}>
        <Metric label="Launch gate" value={launchGateLabel} color={launchGateColor} hint={`>=${(LAUNCH_GATE_OVERALL * 100).toFixed(0)}% overall + 100% critical`} />
        <Metric label="Passed" value={`${passed} / ${runCount || total}`} color={runCount === 0 ? "#94A3B8" : passed === runCount ? "#22C55E" : "#F59E0B"} hint={runCount > 0 ? `${(overallPct * 100).toFixed(0)}%` : "not yet run"} />
        <Metric label="Critical" value={`${criticalPassed} / ${criticalTotal}`} color={criticalResults.length === 0 ? "#94A3B8" : criticalPassed === criticalTotal ? "#22C55E" : "#EF4444"} hint="must be 100%" />
        <Metric label="Avg latency" value={runCount > 0 ? `${avgLatency.toFixed(2)}s` : "—"} color="#E2E8F0" hint={runCount > 0 ? `${runCount} run` : ""} />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onRunAll} disabled={runAllActive} style={{ padding: "10px 18px", borderRadius: 10, background: runAllActive ? "#1E293B" : "#22D3EE", color: runAllActive ? "#64748B" : "#0B1020", border: "none", fontSize: 12, fontWeight: 700, letterSpacing: "0.05em", cursor: runAllActive ? "wait" : "pointer" }}>
          {runAllActive ? `Running… (${runCount}/${total})` : `▶ Run all ${total}`}
        </button>
        {runCount > 0 && !runAllActive && (
          <button onClick={onClear} style={{ padding: "10px 14px", borderRadius: 10, background: "transparent", color: "#94A3B8", border: "1px solid #1E293B", fontSize: 12, fontWeight: 600, letterSpacing: "0.05em", cursor: "pointer" }}>
            × Clear
          </button>
        )}
      </div>
    </div>
  );

  function Metric({ label, value, color, hint }: { label: string; value: string; color: string; hint?: string }) {
    return (
      <div>
        <div style={labelStyle}>{label}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 2 }}>
          <span style={{ fontSize: 20, color, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{value}</span>
          {hint && <span style={{ fontSize: 10, color: "#475569" }}>{hint}</span>}
        </div>
      </div>
    );
  }
}
