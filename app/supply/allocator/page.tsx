"use client";

import Link from "next/link";
import { useState } from "react";
import { AllocatorEmpty } from "./components/AllocatorEmpty";
import { InputEditor } from "./components/InputEditor";
import { OutputViewer } from "./components/OutputViewer";
import { callAllocator } from "./lib/callAllocator";
import { SAMPLES } from "./lib/sampleInputs";
import type { AllocatorInput, AllocatorResponse } from "./lib/schemas";

export default function AllocatorPage() {
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(SAMPLES[0].id);
  const [jsonValue, setJsonValue] = useState<string>(JSON.stringify(SAMPLES[0].input, null, 2));
  const [currentInput, setCurrentInput] = useState<AllocatorInput | null>(null);
  const [response, setResponse] = useState<AllocatorResponse | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectSample = (id: string) => {
    const sample = SAMPLES.find((s) => s.id === id);
    if (!sample) return;
    setSelectedSampleId(id);
    setJsonValue(JSON.stringify(sample.input, null, 2));
    setError(null);
  };

  const handleRun = async (input: AllocatorInput) => {
    // Clear previous output immediately so the loading state replaces stale results.
    setResponse(null);
    setError(null);
    setCurrentInput(input);
    setIsRunning(true);
    try {
      const result = await callAllocator(input);
      setResponse(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setResponse(null);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#050813",
        color: "#E2E8F0",
        padding: "14px 20px 24px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <header
        style={{
          marginBottom: 14,
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
          <Link
            href="/supply"
            style={{
              fontSize: 11,
              color: "#22D3EE",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            ← Supply
          </Link>
          <span style={{ fontSize: 11, color: "#22D3EE", letterSpacing: "0.25em", textTransform: "uppercase", fontWeight: 800 }}>
            Waymo · Allocator
          </span>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#F1F5F9" }}>
            Supply Allocation Agent · test bench
          </span>
        </div>
        <div style={{ fontSize: 10, color: "#64748B", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Claude Sonnet · tool-use · prompt-cached
        </div>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(420px, 1fr) 2fr",
          gap: 14,
          alignItems: "start",
        }}
      >
        <div
          style={{
            minWidth: 0,
            position: "sticky",
            top: 14,
            maxHeight: "calc(100vh - 28px)",
            display: "flex",
          }}
        >
          <InputEditor
            selectedSampleId={selectedSampleId}
            jsonValue={jsonValue}
            onChange={setJsonValue}
            onSelectSample={handleSelectSample}
            onRun={handleRun}
            isRunning={isRunning}
          />
        </div>

        <div style={{ minWidth: 0 }}>
          {error ? (
            <AllocatorEmpty variant="error" message={error} />
          ) : isRunning ? (
            <AllocatorEmpty variant="loading" />
          ) : response && currentInput ? (
            <OutputViewer input={currentInput} response={response} />
          ) : (
            <AllocatorEmpty />
          )}
        </div>
      </div>

      <footer
        style={{
          marginTop: 16,
          fontSize: 9,
          color: "#475569",
          letterSpacing: "0.05em",
          lineHeight: 1.5,
        }}
      >
        All sample inputs are synthetic. The agent's outputs are LLM-generated and not connected to a real fleet.
        Hard-constraint validation runs server-side regardless of what the agent emits — failures surface as red
        badges, never silent retries.
      </footer>
    </main>
  );
}
