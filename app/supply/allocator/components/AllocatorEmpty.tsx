"use client";

export function AllocatorEmpty({ message }: { message?: string }) {
  return (
    <div
      style={{
        height: "100%",
        minHeight: 400,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0B1020",
        border: "1px dashed #1E293B",
        borderRadius: 14,
        padding: 24,
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 360 }}>
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
          Supply Allocation Agent
        </div>
        <div style={{ fontSize: 14, color: "#94A3B8", lineHeight: 1.5 }}>
          {message ??
            "Pick a scenario on the left and hit Run. The agent will return a structured allocation decision, validated against the three hard constraints (on-demand floor, corridor caps, reassignment SLA)."}
        </div>
      </div>
    </div>
  );
}
