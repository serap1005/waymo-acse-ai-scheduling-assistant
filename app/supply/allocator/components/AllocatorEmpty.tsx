"use client";

type Variant = "empty" | "loading" | "error";

interface Props {
  variant?: Variant;
  message?: string;
}

function Spinner() {
  return (
    <svg
      width="44"
      height="44"
      viewBox="0 0 44 44"
      style={{ display: "block", animation: "allocator-spin 0.9s linear infinite" }}
      aria-hidden="true"
    >
      <circle cx="22" cy="22" r="17" fill="none" stroke="#1E293B" strokeWidth="3" />
      <circle
        cx="22"
        cy="22"
        r="17"
        fill="none"
        stroke="#22D3EE"
        strokeWidth="3"
        strokeDasharray="40 67"
        strokeLinecap="round"
      />
      <style>{`@keyframes allocator-spin { to { transform: rotate(360deg); transform-origin: 50% 50%; } }`}</style>
    </svg>
  );
}

export function AllocatorEmpty({ variant = "empty", message }: Props) {
  const isLoading = variant === "loading";
  const isError = variant === "error";

  const headerColor = isError ? "#EF4444" : "#22D3EE";
  const headerText = isError
    ? "Allocator Error"
    : isLoading
      ? "Running Allocation"
      : "Supply Allocation Agent";

  const bodyText =
    message ??
    (isLoading
      ? "Sonnet typically takes 2–5 seconds for a full allocation cycle. Validating output against hard constraints…"
      : "Pick a scenario on the left and hit Run. The agent will return a structured allocation decision, validated against the three hard constraints (on-demand floor, corridor caps, reassignment SLA).");

  return (
    <div
      style={{
        height: "100%",
        minHeight: 400,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0B1020",
        border: `1px ${isError ? "solid" : "dashed"} ${isError ? "rgba(239, 68, 68, 0.4)" : "#1E293B"}`,
        borderRadius: 14,
        padding: 24,
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 380 }}>
        {isLoading && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
            <Spinner />
          </div>
        )}
        <div
          style={{
            fontSize: 10,
            color: headerColor,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            fontWeight: 800,
            marginBottom: 8,
          }}
        >
          {headerText}
        </div>
        <div style={{ fontSize: 14, color: "#94A3B8", lineHeight: 1.55 }}>{bodyText}</div>
      </div>
    </div>
  );
}
