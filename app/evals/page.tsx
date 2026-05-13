"use client";

import { EVAL_CASES } from "@/app/supply/allocator/lib/evalCases";
import Link from "next/link";

const labelStyle = {
  fontSize: 9,
  color: "#64748B",
  letterSpacing: "0.2em",
  textTransform: "uppercase" as const,
  fontWeight: 700,
};

interface AgentCard {
  href: string;
  agent: string;
  description: string;
  caseCount: number;
  categories: string[];
  criticalCount: number;
  available: boolean;
}

const CARDS: AgentCard[] = [
  {
    href: "/evals/chatbot",
    agent: "ACSE Chatbot",
    description:
      "Natural-language commute scheduling assistant. Tests standard intent parsing, policy grounding, and the L1/L2/L3 guardrails.",
    caseCount: 30,
    categories: ["Scheduling", "Policy", "Adversarial", "PII"],
    criticalCount: 12,
    available: true,
  },
  {
    href: "/evals/allocator",
    agent: "Supply Allocation Agent",
    description:
      "Structured fleet allocator. Tests baseline allocation, no-show recovery, disruption handling, fleet constraints, and new-market behavior.",
    caseCount: EVAL_CASES.length,
    categories: ["Baseline", "No-show", "Disruption", "Fleet", "New market", "Edge"],
    criticalCount: EVAL_CASES.filter((c) => c.critical).length,
    available: true,
  },
];

function Card({ card }: { card: AgentCard }) {
  return (
    <Link
      href={card.href}
      style={{
        display: "block",
        background: "#0B1020",
        border: "1px solid #1E293B",
        borderRadius: 16,
        padding: 22,
        textDecoration: "none",
        color: "inherit",
        transition: "border-color 120ms ease, background 120ms ease",
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: "#22D3EE",
          letterSpacing: "0.25em",
          textTransform: "uppercase",
          fontWeight: 800,
          marginBottom: 8,
        }}
      >
        {card.agent}
      </div>
      <div style={{ fontSize: 13, color: "#CBD5E1", lineHeight: 1.6, marginBottom: 18 }}>
        {card.description}
      </div>

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "baseline", marginBottom: 14 }}>
        <div>
          <div style={labelStyle}>Cases</div>
          <div style={{ fontSize: 22, color: "#F1F5F9", fontWeight: 800, fontVariantNumeric: "tabular-nums", marginTop: 2 }}>
            {card.caseCount}
          </div>
        </div>
        <div>
          <div style={labelStyle}>Critical</div>
          <div style={{ fontSize: 22, color: "#F59E0B", fontWeight: 800, fontVariantNumeric: "tabular-nums", marginTop: 2 }}>
            {card.criticalCount}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {card.categories.map((c) => (
          <span
            key={c}
            style={{
              fontSize: 10,
              color: "#94A3B8",
              padding: "3px 9px",
              borderRadius: 999,
              border: "1px solid #1E293B",
              fontWeight: 600,
            }}
          >
            {c}
          </span>
        ))}
      </div>

      <div
        style={{
          marginTop: 18,
          fontSize: 11,
          color: "#22D3EE",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          fontWeight: 700,
        }}
      >
        Run evals →
      </div>
    </Link>
  );
}

export default function EvalsHubPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#050813",
        color: "#E2E8F0",
        padding: "96px 20px 32px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <header
        style={{
          marginBottom: 24,
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: 11,
              color: "#22D3EE",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              fontWeight: 800,
            }}
          >
            Waymo Commute Pass · Evals
          </span>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#F1F5F9" }}>
            Agent test benches
          </span>
        </div>
        <div
          style={{
            fontSize: 10,
            color: "#64748B",
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          Launch gate per agent: ≥90% overall · 100% critical
        </div>
      </header>

      <div style={{ marginBottom: 18, fontSize: 13, color: "#94A3B8", lineHeight: 1.55, maxWidth: 720 }}>
        Two agents ship with this product. Each has its own programmatic eval suite that runs against the live model
        with hard-constraint and scenario assertions. Pick an agent below.
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
          gap: 14,
        }}
      >
        {CARDS.map((c) => (
          <Card key={c.href} card={c} />
        ))}
      </div>

      <footer
        style={{
          marginTop: 32,
          fontSize: 9,
          color: "#475569",
          letterSpacing: "0.05em",
          lineHeight: 1.5,
        }}
      >
        Eval cases live in code alongside each agent. The chatbot suite mirrors the ACSE methodology
        (`SOURCE_OF_TRUTH.md` §9 — 4 categories, 30 cases). The allocator suite mirrors the Commute Pass
        Dispatch Model eval set (6 categories, 18 cases).
      </footer>
    </main>
  );
}
