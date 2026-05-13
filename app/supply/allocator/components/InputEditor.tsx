"use client";

import { useState } from "react";
import { SAMPLES } from "../lib/sampleInputs";
import type { AllocatorInput } from "../lib/schemas";

interface Props {
  selectedSampleId: string | null;
  jsonValue: string;
  onChange: (json: string) => void;
  onSelectSample: (sampleId: string) => void;
  onRun: (input: AllocatorInput) => void;
  isRunning: boolean;
}

export function InputEditor({
  selectedSampleId,
  jsonValue,
  onChange,
  onSelectSample,
  onRun,
  isRunning,
}: Props) {
  const [parseError, setParseError] = useState<string | null>(null);

  const handleRun = () => {
    try {
      const parsed = JSON.parse(jsonValue) as AllocatorInput;
      setParseError(null);
      onRun(parsed);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Invalid JSON");
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        background: "#0B1020",
        border: "1px solid #1E293B",
        borderRadius: 14,
        padding: 16,
        height: "100%",
        minHeight: 0,
      }}
    >
      <div>
        <div
          style={{
            fontSize: 10,
            color: "#64748B",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            fontWeight: 700,
            marginBottom: 8,
          }}
        >
          Scenario
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {SAMPLES.map((s) => {
            const active = s.id === selectedSampleId;
            return (
              <button
                key={s.id}
                onClick={() => onSelectSample(s.id)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  background: active ? "#22D3EE" : "transparent",
                  color: active ? "#0B1020" : "#94A3B8",
                  border: `1px solid ${active ? "#22D3EE" : "#1E293B"}`,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>
        {selectedSampleId && (
          <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 8, lineHeight: 1.5, fontStyle: "italic" }}>
            {SAMPLES.find((s) => s.id === selectedSampleId)?.blurb}
          </div>
        )}
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div
          style={{
            fontSize: 10,
            color: "#64748B",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            fontWeight: 700,
            marginBottom: 6,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>Input JSON</span>
          <span style={{ color: "#475569", letterSpacing: 0, textTransform: "none", fontWeight: 500 }}>
            editable — pick a sample or paste your own
          </span>
        </div>
        <textarea
          value={jsonValue}
          onChange={(e) => {
            onChange(e.target.value);
            if (parseError) setParseError(null);
          }}
          spellCheck={false}
          style={{
            flex: 1,
            minHeight: 240,
            background: "#070C1C",
            color: "#CBD5E1",
            border: `1px solid ${parseError ? "#EF4444" : "#1E293B"}`,
            borderRadius: 8,
            padding: 12,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 11,
            lineHeight: 1.5,
            resize: "none",
            outline: "none",
          }}
        />
        {parseError && (
          <div style={{ fontSize: 11, color: "#EF4444", marginTop: 6 }}>JSON error: {parseError}</div>
        )}
      </div>

      <button
        onClick={handleRun}
        disabled={isRunning}
        style={{
          padding: "10px 16px",
          borderRadius: 10,
          background: isRunning ? "#1E293B" : "#22D3EE",
          color: isRunning ? "#64748B" : "#0B1020",
          border: "none",
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: "0.05em",
          cursor: isRunning ? "wait" : "pointer",
        }}
      >
        {isRunning ? "Running…" : "Run allocation"}
      </button>
    </div>
  );
}
