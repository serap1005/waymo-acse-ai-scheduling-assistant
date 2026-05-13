"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChatbotEvalFilters, type CategoryFilter, type StatusFilter } from "./components/ChatbotEvalFilters";
import { ChatbotEvalRow } from "./components/ChatbotEvalRow";
import { ChatbotEvalSummaryBar } from "./components/ChatbotEvalSummaryBar";
import { CHATBOT_EVAL_CASES } from "./lib/chatbotEvalCases";
import { runChatbotEvalCase, type ChatbotEvalResult } from "./lib/runChatbotEvalCase";

export default function ChatbotEvalsPage() {
  const [results, setResults] = useState<Map<string, ChatbotEvalResult>>(new Map());
  const [runningCaseId, setRunningCaseId] = useState<string | null>(null);
  const [runAllActive, setRunAllActive] = useState(false);
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const handleRun = async (caseId: string) => {
    const caseDef = CHATBOT_EVAL_CASES.find((c) => c.id === caseId);
    if (!caseDef) return;
    setRunningCaseId(caseDef.id);
    const result = await runChatbotEvalCase(caseDef);
    setResults((prev) => {
      const next = new Map(prev);
      next.set(caseDef.id, result);
      return next;
    });
    setRunningCaseId((cur) => (cur === caseDef.id ? null : cur));
  };

  const handleRunAll = async () => {
    setRunAllActive(true);
    for (const caseDef of CHATBOT_EVAL_CASES) {
      setRunningCaseId(caseDef.id);
      const result = await runChatbotEvalCase(caseDef);
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
    return CHATBOT_EVAL_CASES.filter((c) => {
      if (categoryFilter !== "all" && c.category !== categoryFilter) return false;
      const r = results.get(c.id);
      if (statusFilter === "pending" && r) return false;
      if (statusFilter === "passed" && (!r || !r.passed)) return false;
      if (statusFilter === "failed" && (!r || r.passed)) return false;
      return true;
    });
  }, [categoryFilter, statusFilter, results]);

  return (
    <main style={{ minHeight: "100vh", background: "#050813", color: "#E2E8F0", padding: "14px 20px 24px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <header style={{ marginBottom: 14, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
          <Link href="/evals" style={{ fontSize: 11, color: "#22D3EE", letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700, textDecoration: "none" }}>
            ← Evals
          </Link>
          <span style={{ fontSize: 11, color: "#22D3EE", letterSpacing: "0.25em", textTransform: "uppercase", fontWeight: 800 }}>
            ACSE Chatbot
          </span>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#F1F5F9" }}>
            Eval runner · {CHATBOT_EVAL_CASES.length} cases
          </span>
        </div>
        <div style={{ fontSize: 10, color: "#64748B", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Launch gate: ≥90% overall · 100% critical
        </div>
      </header>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <ChatbotEvalSummaryBar cases={CHATBOT_EVAL_CASES} results={results} runAllActive={runAllActive} onRunAll={handleRunAll} onClear={handleClear} />

        <ChatbotEvalFilters category={categoryFilter} status={statusFilter} onCategoryChange={setCategoryFilter} onStatusChange={setStatusFilter} />

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {filteredCases.length === 0 ? (
            <div style={{ padding: "24px 14px", background: "#0B1020", border: "1px dashed #1E293B", borderRadius: 12, textAlign: "center", color: "#64748B", fontSize: 12 }}>
              No cases match the current filters.
            </div>
          ) : (
            filteredCases.map((c) => (
              <ChatbotEvalRow
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
        Eval cases mirror the ACSE methodology (`SOURCE_OF_TRUTH.md` §9). Programmatic assertions against the
        response text — regex/substring checks for guardrails and policy keywords. Cases run sequentially through
        the live chatbot at `/api/chat`. Results in-memory for this session.
      </footer>
    </main>
  );
}
