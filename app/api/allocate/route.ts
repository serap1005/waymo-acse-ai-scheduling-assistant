import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { SYSTEM_PROMPT } from "@/app/supply/allocator/lib/systemPrompt";
import { ALLOCATION_TOOL } from "@/app/supply/allocator/lib/toolSchema";
import { checkConstraints } from "@/app/supply/allocator/lib/constraintChecks";
import type {
  AllocatorInput,
  AllocatorOutput,
  AllocatorResponse,
} from "@/app/supply/allocator/lib/schemas";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Rate limit — reused pattern from app/api/chat/route.ts. In-memory, resets on
// server restart. Fine for pilot / demo; swap for Redis at scale.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 20;
const RATE_WINDOW = 60 * 1000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  entry.count++;
  return false;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment before trying again." },
      { status: 429 },
    );
  }

  let input: AllocatorInput;
  try {
    input = (await req.json()) as AllocatorInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!input || typeof input !== "object" || !input.city || !input.fleet) {
    return NextResponse.json({ error: "Missing required AllocatorInput fields" }, { status: 400 });
  }

  const startedAt = Date.now();

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 4096,
      // Prompt cache the system prompt — back-to-back decision cycles only pay
      // the ~1.8k-token prompt cost on the first call within the 5-min cache TTL.
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      tools: [ALLOCATION_TOOL],
      // Force the model to emit the structured decision via tool use rather than
      // free-text JSON. Eliminates parse errors at the SDK boundary.
      tool_choice: { type: "tool", name: "emit_allocation_decision" },
      messages: [
        {
          role: "user",
          content: JSON.stringify(input),
        },
      ],
    });

    const toolUse = response.content.find(
      (c): c is Anthropic.Messages.ToolUseBlock => c.type === "tool_use",
    );
    if (!toolUse) {
      return NextResponse.json(
        { error: "Agent did not emit an allocation decision" },
        { status: 502 },
      );
    }

    // Backfill any missing top-level fields with safe defaults.
    const raw = (toolUse.input ?? {}) as Partial<AllocatorOutput>;
    const assignments = Array.isArray(raw.vehicle_assignments) ? raw.vehicle_assignments : [];

    // Recompute derivable fields from input + assignments. The model is
    // unreliable at numerical fields it has to track itself — it routinely
    // emits 0 for active_disruptions when input.disruptions.length=2, or
    // reports on_demand_reserve_pct=0 while emitting zero scheduled actions
    // (internally inconsistent). For fields that ARE derivable from input +
    // its own vehicle_assignments[] array, we compute the truthful value
    // server-side rather than trusting whatever number the model emitted.
    // Model judgment is preserved for the creative decisions (assignments
    // themselves, corridor projections, recommendation prose).
    const countByAction = (action: string) =>
      assignments.filter((a) => a?.action === action).length;
    const assigned_scheduled = countByAction("assign_to_scheduled");
    const assigned_on_demand = countByAction("release_to_on_demand");
    const repositioning =
      countByAction("reposition_to_staging") + countByAction("reroute");
    const idle = countByAction("hold_position");
    const available = Math.max(input.fleet?.available_vehicles ?? 1, 1);
    const computed_reserve_pct = Math.max(
      0,
      (available - assigned_scheduled - repositioning) / available,
    );
    const computed_utilization_rate = Math.min(
      1,
      (assigned_scheduled + assigned_on_demand + repositioning) / available,
    );

    const input_disruptions = Array.isArray(input.disruptions) ? input.disruptions : [];
    const affected_corridors = new Set(
      input_disruptions.flatMap((d) => d.affected_corridors ?? []),
    );
    const scheduled_rides = Array.isArray(input.scheduled_rides) ? input.scheduled_rides : [];
    const computed_rerouted_rides = scheduled_rides.filter(
      (r) =>
        affected_corridors.has(r.pickup_corridor) ||
        affected_corridors.has(r.dropoff_corridor),
    ).length;
    const computed_speed_compensation =
      input_disruptions.some((d) => d.type === "weather");

    const rawFleetState = raw.fleet_state_after ?? {
      vehicles_assigned_scheduled: 0,
      vehicles_assigned_on_demand: 0,
      vehicles_repositioning: 0,
      vehicles_idle: 0,
      on_demand_reserve_pct: 0,
      utilization_rate: 0,
    };
    const rawDisruption = raw.disruption_response ?? {
      active_disruptions: 0,
      rerouted_rides: 0,
      eta_adjustments_communicated: 0,
      speed_compensation_applied: false,
    };

    const decision: AllocatorOutput = {
      timestamp: raw.timestamp ?? new Date().toISOString(),
      decision_id: raw.decision_id ?? `dec-fallback-${Date.now()}`,
      vehicle_assignments: assignments,
      fleet_state_after: {
        // Counts: trust the model's numbers if the assignment array is small
        // (likely a sample), but always overwrite when assignments are dense.
        vehicles_assigned_scheduled:
          assigned_scheduled > 0 ? assigned_scheduled : rawFleetState.vehicles_assigned_scheduled,
        vehicles_assigned_on_demand:
          assigned_on_demand > 0 ? assigned_on_demand : rawFleetState.vehicles_assigned_on_demand,
        vehicles_repositioning:
          repositioning > 0 ? repositioning : rawFleetState.vehicles_repositioning,
        vehicles_idle: idle > 0 ? idle : rawFleetState.vehicles_idle,
        // Reserve and utilization: always recompute from the truth.
        on_demand_reserve_pct: Number(computed_reserve_pct.toFixed(4)),
        utilization_rate: Number(computed_utilization_rate.toFixed(4)),
      },
      corridor_impacts: Array.isArray(raw.corridor_impacts) ? raw.corridor_impacts : [],
      no_show_handling: raw.no_show_handling ?? {
        probable_no_shows: 0,
        vehicles_released: 0,
        avg_reassignment_time_minutes: 0,
        pattern_detected: null,
      },
      tradeoff_summary: raw.tradeoff_summary ?? {
        scheduled_eta_compliance_pct: 0,
        on_demand_eta_impact_pct: 0,
        deadheading_rate_pct: 0,
        capacity_warnings: [],
        recommendation: "(agent output incomplete — backfilled with defaults)",
      },
      disruption_response: {
        // Always overwrite from input — these are derivable, not creative.
        active_disruptions: input_disruptions.length,
        speed_compensation_applied: computed_speed_compensation,
        rerouted_rides:
          // Trust model if it claimed a count, else compute from input crossing.
          typeof rawDisruption.rerouted_rides === "number" && rawDisruption.rerouted_rides > 0
            ? rawDisruption.rerouted_rides
            : computed_rerouted_rides,
        eta_adjustments_communicated: rawDisruption.eta_adjustments_communicated ?? 0,
      },
    };
    const constraint_checks = checkConstraints(decision);
    const latency_ms = Date.now() - startedAt;

    const usage = response.usage as Anthropic.Messages.Usage & {
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };

    const result: AllocatorResponse = {
      decision,
      constraint_checks,
      latency_ms,
      tokens: {
        input: usage.input_tokens,
        output: usage.output_tokens,
        cached_input: usage.cache_read_input_tokens ?? 0,
        cache_creation_input: usage.cache_creation_input_tokens ?? 0,
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("[allocator] API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
