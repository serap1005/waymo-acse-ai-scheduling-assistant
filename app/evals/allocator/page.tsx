"use client";

import { EVAL_CASES } from "@/app/supply/allocator/lib/evalCases";
import { runEvalCase } from "@/app/supply/allocator/lib/runEvalCase";
import type { EvalResult } from "@/app/supply/allocator/lib/schemas";
import Link from "next/link";
import { useMemo, useState } from "react";
import { EvalCaseRow } from "./components/EvalCaseRow";
import { EvalFilters, type CategoryFilter, type StatusFilter } from "./components/EvalFilters";
import { EvalSummaryBar } from "./components/EvalSummaryBar";

export default function AllocatorEvalsPage() {
  const [results, setResults] = useState<Map<string, EvalResult>>(new Map());
  const [runningCaseId, setRunningCaseId] = useState<string | null>(null);
  const [runAllActive, setRunAllActive] = useState(false);
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const handleRun = async (caseId: string) => {
    const caseDef = EVAL_CASES.find((c) => c.id === caseId);
    if (!caseDef) return;
    setRunningCaseId(caseDef.id);
    const result = await runEvalCase(caseDef);
    setResults((prev) => {
      const next = new Map(prev);
      next.set(caseDef.id, result);
      return next;
    });
    setRunningCaseId((cur) => (cur === caseDef.id ? null : cur));
  };

  const handleRunAll = async () => {
    setRunAllActive(true);
    for (const caseDef of EVAL_CASES) {
      setRunningCaseId(caseDef.id);
      const result = await runEvalCase(caseDef);
      setResults((prev) => {
        const next = new Map(prev);
        next.set(caseDef.id, result);
        return next;
      });
    }
    setRunningCaseId(null);
    setRunAllActive(false);
  };

  const handleClear = () => {
    setResults(new Map());
    setExpandedCaseId(null);
  };

  const filteredCases = useMemo(() => {
    return EVAL_CASES.filter((c) => {
      if (categoryFilter !== "all" && c.category !== categoryFilter) return false;
      const r = results.get(c.id);
      if (statusFilter === "pending" && r) return false;
      if (statusFilter === "passed" && (!r || !r.passed)) return false;
      if (statusFilter === "failed" && (!r || r.passed)) return false;
      return true;
    });
  }, [categoryFilter, statusFilter, results]);

  return (
    <main style={{ minHeight: "100vh", background: "#050813", color: "#E2E8F0", padding: "96px 20px 24px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <header style={{ marginBottom: 14, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
          <Link href="/evals" style={{ fontSize: 11, color: "#22D3EE", letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700, textDecoration: "none" }}>
            ← Evals
          </Link>
          <span style={{ fontSize: 11, color: "#22D3EE", letterSpacing: "0.25em", textTransform: "uppercase", fontWeight: 800 }}>
            Allocator agent
          </span>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#F1F5F9" }}>
            Eval runner · {EVAL_CASES.length} cases
          </span>
        </div>
        <div style={{ fontSize: 10, color: "#64748B", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Launch gate: ≥90% overall · 100% critical
        </div>
      </header>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <EvalSummaryBar cases={EVAL_CASES} results={results} runAllActive={runAllActive} onRunAll={handleRunAll} onClear={handleClear} />

        <EvalFilters category={categoryFilter} status={statusFilter} onCategoryChange={setCategoryFilter} onStatusChange={setStatusFilter} />

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {filteredCases.length === 0 ? (
            <div style={{ padding: "24px 14px", background: "#0B1020", border: "1px dashed #1E293B", borderRadius: 12, textAlign: "center", color: "#64748B", fontSize: 12 }}>
              No cases match the current filters.
            </div>
          ) : (
            filteredCases.map((c) => (
              <EvalCaseRow
                key={c.id}
                caseDef={c}
                result={results.get(c.id)}
                isRunning={c.id === runningCaseId}
                expanded={c.id === expandedCaseId}
                onToggleExpand={() => setExpandedCaseId((prev) => (prev === c.id ? null : c.id))}
                onRun={() => handleRun(c.id)}
                disabled={runAllActive}
              />
            ))
          )}
        </div>
      </div>

      <footer style={{ marginTop: 16, fontSize: 9, color: "#475569", letterSpacing: "0.05em", lineHeight: 1.5 }}>
        Eval cases assert programmatically against the agent&apos;s structured output plus the three hard constraints validated server-side. Cases run sequentially (~3-5s each) to stay under the per-IP rate limit. Results are in-memory for this session.
      </footer>
    </main>
  );
}
