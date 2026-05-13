"use client";

import { useState } from "react";

export function JsonViewer({ data, label }: { data: unknown; label?: string }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const text = JSON.stringify(data, null, 2);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Silent fail — copy not supported.
    }
  };

  return (
    <div
      style={{
        background: "#0B1020",
        border: "1px solid #1E293B",
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: "100%",
          background: "transparent",
          border: "none",
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          color: "#94A3B8",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
        }}
      >
        <span>{label ?? "Raw JSON"}</span>
        <span style={{ fontSize: 12, color: "#64748B" }}>{expanded ? "▼ Collapse" : "▶ Expand"}</span>
      </button>
      {expanded && (
        <div style={{ borderTop: "1px solid #1E293B" }}>
          <div style={{ padding: "8px 14px", display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={handleCopy}
              style={{
                padding: "4px 10px",
                background: "transparent",
                border: "1px solid #1E293B",
                borderRadius: 6,
                color: copied ? "#22C55E" : "#94A3B8",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.1em",
                cursor: "pointer",
              }}
            >
              {copied ? "✓ COPIED" : "COPY"}
            </button>
          </div>
          <pre
            style={{
              margin: 0,
              padding: "0 14px 14px",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: 11,
              lineHeight: 1.5,
              color: "#CBD5E1",
              overflow: "auto",
              maxHeight: 480,
            }}
          >
            {text}
          </pre>
        </div>
      )}
    </div>
  );
}
