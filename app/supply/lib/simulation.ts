import { CITY_BOUNDS, CORRIDORS, NEIGHBORHOODS, PEAK, type Hood } from "./sf";
import type {
  FleetCurve,
  KPICurve,
  KPISnapshot,
  SimulationData,
  VehicleKeyframe,
  VehiclePath,
  VehicleState,
} from "./types";

const KEYFRAMES = 31;
const VEHICLES = 40;

function seedRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function clampToCity(x: number, y: number) {
  return {
    x: Math.max(CITY_BOUNDS.minX, Math.min(CITY_BOUNDS.maxX, x)),
    y: Math.max(CITY_BOUNDS.minY, Math.min(CITY_BOUNDS.maxY, y)),
  };
}

function jitter(h: Hood, rng: () => number, scale = 1) {
  const angle = rng() * Math.PI * 2;
  const dist = rng() * (h.r * scale);
  return clampToCity(h.cx + Math.cos(angle) * dist, h.cy + Math.sin(angle) * dist);
}

function lerpPos(a: Hood, b: Hood, phase: number, jitterAmt: number, rng: () => number) {
  const x = a.cx + (b.cx - a.cx) * phase + (rng() - 0.5) * jitterAmt;
  const y = a.cy + (b.cy - a.cy) * phase + (rng() - 0.5) * jitterAmt;
  return clampToCity(x, y);
}

function isPeak(t: number): boolean {
  return (
    (t >= PEAK.morningStart && t < PEAK.morningEnd) ||
    (t >= PEAK.eveningStart && t < PEAK.eveningEnd)
  );
}

// Drift toward a target point. Picks a new target on arrival or with low probability per step.
// Used by both on-demand and smart-fleet path generators — the difference is *what* targets they pick.
function driftStep(
  pos: { x: number; y: number },
  target: { x: number; y: number },
  rng: () => number,
  speed: number,
  jitterAmt: number,
): { x: number; y: number; arrived: boolean } {
  const dx = target.x - pos.x;
  const dy = target.y - pos.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const arrived = dist < 25;
  const inv = 1 / Math.max(dist, 1);
  const next = clampToCity(
    pos.x + dx * inv * speed + (rng() - 0.5) * jitterAmt,
    pos.y + dy * inv * speed + (rng() - 0.5) * jitterAmt,
  );
  return { ...next, arrived };
}

// Left-panel: cruising taxi. Targets are random points anywhere in the city.
// Heavy idle off-peak (matches 44% deadhead baseline). State changes hold for a few keyframes.
function generateOnDemandPath(id: number): VehiclePath {
  const rng = seedRand(id * 17 + 3);
  const tempoOffset = (rng() - 0.5) * 0.024;
  const wobblePhase = rng() * Math.PI * 2;
  const keyframes: VehicleKeyframe[] = [];
  let pos = clampToCity(
    CITY_BOUNDS.minX + rng() * (CITY_BOUNDS.maxX - CITY_BOUNDS.minX),
    CITY_BOUNDS.minY + rng() * (CITY_BOUNDS.maxY - CITY_BOUNDS.minY),
  );
  let target = {
    x: CITY_BOUNDS.minX + rng() * (CITY_BOUNDS.maxX - CITY_BOUNDS.minX),
    y: CITY_BOUNDS.minY + rng() * (CITY_BOUNDS.maxY - CITY_BOUNDS.minY),
  };
  let state: VehicleState = "idle";
  let stateHold = Math.floor(rng() * 5);

  for (let i = 0; i < KEYFRAMES; i++) {
    const t = i / (KEYFRAMES - 1);
    const step = driftStep(pos, target, rng, 16, 5);
    pos = { x: step.x, y: step.y };

    let stateChanged = false;
    if (stateHold <= 0) {
      const roll = rng();
      if (isPeak(t)) {
        state = roll < 0.45 ? "idle" : roll < 0.7 ? "with_passenger" : "dispatched";
      } else {
        state = roll < 0.65 ? "idle" : roll < 0.85 ? "with_passenger" : "dispatched";
      }
      stateHold = 3 + Math.floor(rng() * 3);
      stateChanged = true;
    }
    stateHold--;

    // Direction change couples to state change: a car that just picked someone up
    // heads to a new destination rather than continuing its prior drift.
    if (step.arrived || stateChanged || rng() < 0.05) {
      target = {
        x: CITY_BOUNDS.minX + rng() * (CITY_BOUNDS.maxX - CITY_BOUNDS.minX),
        y: CITY_BOUNDS.minY + rng() * (CITY_BOUNDS.maxY - CITY_BOUNDS.minY),
      };
    }

    keyframes.push({ t, x: pos.x, y: pos.y, state });
  }

  return { id, keyframes, tempoOffset, wobblePhase };
}

// Right-panel non-subscribers: schedule visibility benefits the whole fleet, not just subscribers.
// Targets bias toward demand zones (corridor neighborhoods). State is heavy on active.
function generateSmartFleetPath(id: number): VehiclePath {
  const rng = seedRand(id * 17 + 5009);
  const tempoOffset = (rng() - 0.5) * 0.024;
  const wobblePhase = rng() * Math.PI * 2;
  const corridorHoods: Hood[] = CORRIDORS.flatMap(([a, b]) => [NEIGHBORHOODS[a], NEIGHBORHOODS[b]]);
  let target = corridorHoods[Math.floor(rng() * corridorHoods.length)];
  let pos = jitter(target, rng, 1.5);
  let state: VehicleState = "with_passenger";
  let stateHold = Math.floor(rng() * 5);

  const keyframes: VehicleKeyframe[] = [];
  for (let i = 0; i < KEYFRAMES; i++) {
    const t = i / (KEYFRAMES - 1);
    const step = driftStep(pos, { x: target.cx, y: target.cy }, rng, 17, 3.5);
    pos = { x: step.x, y: step.y };

    let stateChanged = false;
    if (stateHold <= 0) {
      const roll = rng();
      if (isPeak(t)) {
        state = roll < 0.5 ? "with_passenger" : roll < 0.9 ? "dispatched" : "idle";
      } else {
        state = roll < 0.4 ? "with_passenger" : roll < 0.85 ? "dispatched" : "idle";
      }
      stateHold = 3 + Math.floor(rng() * 3);
      stateChanged = true;
    }
    stateHold--;

    if (step.arrived || stateChanged || rng() < 0.07) {
      target = corridorHoods[Math.floor(rng() * corridorHoods.length)];
    }

    keyframes.push({ t, x: pos.x, y: pos.y, state });
  }

  return { id, keyframes, tempoOffset, wobblePhase };
}

// Right-panel subscribers: corridor-locked. Mid-day they actively run short trips around destination zones,
// not idle (per Logan v2 critique — idle implies wasted supply, which is the wrong story).
function generateSubscriberPath(id: number): VehiclePath {
  const rng = seedRand(id * 17 + 1009);
  const tempoOffset = (rng() - 0.5) * 0.018;
  const wobblePhase = rng() * Math.PI * 2;
  const corridor = CORRIDORS[id % CORRIDORS.length];
  const origin = NEIGHBORHOODS[corridor[0]];
  const dest = NEIGHBORHOODS[corridor[1]];

  // Persistent state across keyframes for non-traversal segments so target / direction
  // change can couple to state changes (rather than re-randomizing every keyframe).
  let pos = jitter(origin, rng, 0.95);
  let target: { x: number; y: number } = { x: dest.cx, y: dest.cy };
  let state: VehicleState = "idle";
  let stateHold = Math.floor(rng() * 3);

  const keyframes: VehicleKeyframe[] = [];
  for (let i = 0; i < KEYFRAMES; i++) {
    const t = i / (KEYFRAMES - 1);

    if (t >= PEAK.morningStart && t < PEAK.morningEnd) {
      // Morning corridor traversal — direct interpolation, single state.
      const phase = (t - PEAK.morningStart) / (PEAK.morningEnd - PEAK.morningStart);
      pos = lerpPos(origin, dest, phase, 8, rng);
      state = "with_passenger";
      stateHold = 0;
      target = { x: dest.cx, y: dest.cy };
    } else if (t >= PEAK.eveningStart && t < PEAK.eveningEnd) {
      // Evening corridor traversal back home.
      const phase = (t - PEAK.eveningStart) / (PEAK.eveningEnd - PEAK.eveningStart);
      pos = lerpPos(dest, origin, phase, 8, rng);
      state = "with_passenger";
      stateHold = 0;
      target = { x: origin.cx, y: origin.cy };
    } else {
      // Non-traversal segments: drift-toward-target with state-coupled re-targeting.
      const anchor = t < PEAK.morningStart ? origin : t < PEAK.eveningStart ? dest : origin;
      const step = driftStep(pos, target, rng, 13, 3);
      pos = { x: step.x, y: step.y };

      let stateChanged = false;
      if (stateHold <= 0) {
        const roll = rng();
        if (t < PEAK.morningStart) {
          state = roll < 0.7 ? "idle" : "dispatched";
        } else if (t < PEAK.eveningStart) {
          state = roll < 0.5 ? "with_passenger" : roll < 0.8 ? "dispatched" : "idle";
        } else {
          state = roll < 0.55 ? "dispatched" : roll < 0.85 ? "with_passenger" : "idle";
        }
        stateHold = 2 + Math.floor(rng() * 3);
        stateChanged = true;
      }
      stateHold--;

      if (stateChanged || step.arrived || rng() < 0.06) {
        const j = jitter(anchor, rng, 1.0);
        target = { x: j.x, y: j.y };
      }
    }

    keyframes.push({ t, x: pos.x, y: pos.y, state });
  }

  return { id, keyframes, tempoOffset, wobblePhase };
}

function buildKpis(panel: "ondemand" | "commutepass"): KPICurve {
  const snapshots: KPISnapshot[] = [];
  for (let i = 0; i < KEYFRAMES; i++) {
    const t = i / (KEYFRAMES - 1);
    const morningPeak = t >= PEAK.morningStart && t < PEAK.morningEnd;
    const eveningPeak = t >= PEAK.eveningStart && t < PEAK.eveningEnd;
    const peak = morningPeak || eveningPeak;
    const peakIntensity = peak
      ? Math.sin(
          ((t - (morningPeak ? PEAK.morningStart : PEAK.eveningStart)) /
            (morningPeak ? PEAK.morningEnd - PEAK.morningStart : PEAK.eveningEnd - PEAK.eveningStart)) *
            Math.PI,
        )
      : 0;

    if (panel === "ondemand") {
      snapshots.push({
        t,
        deadheadPct: 44.3 - (peak ? 4 + peakIntensity * 3 : 0) + Math.sin(t * Math.PI * 4) * 1.2,
        avgEtaMin: 4.5 + (peak ? 1.4 + peakIntensity * 1.2 : 0) + Math.sin(t * Math.PI * 5) * 0.4,
        vehiclesActive:
          14 + (peak ? 6 + Math.floor(peakIntensity * 4) : 0) + Math.floor(Math.sin(t * Math.PI * 4) * 2),
        missedDemandPct: 6 + (peak ? 8 + peakIntensity * 6 : 0) + Math.sin(t * Math.PI * 4) * 1.2,
      });
    } else {
      snapshots.push({
        t,
        deadheadPct: 25 - (peak ? 2 + peakIntensity * 1.5 : 0) + Math.sin(t * Math.PI * 4) * 0.8,
        avgEtaMin: 3.0 + (peak ? 0.4 + peakIntensity * 0.3 : 0) + Math.sin(t * Math.PI * 5) * 0.15,
        subscriberEtaMin: 2.6 + (peak ? 0.2 + peakIntensity * 0.2 : 0) + Math.sin(t * Math.PI * 5) * 0.1,
        nonSubscriberEtaMin: 3.3 + (peak ? 0.6 + peakIntensity * 0.5 : 0) + Math.sin(t * Math.PI * 5) * 0.2,
        vehiclesActive:
          22 + (peak ? 8 + Math.floor(peakIntensity * 4) : 0) + Math.floor(Math.sin(t * Math.PI * 4) * 2),
        missedDemandPct: 1.5 + (peak ? 2 + peakIntensity * 1.2 : 0) + Math.sin(t * Math.PI * 4) * 0.4,
      });
    }
  }
  return { panel, snapshots };
}

let cached: SimulationData | null = null;

export function generateSimulation(): SimulationData {
  if (cached) return cached;
  const ondemandPaths: VehiclePath[] = [];
  const subscriberPaths: VehiclePath[] = [];
  const smartFleetPaths: VehiclePath[] = [];
  for (let i = 0; i < VEHICLES; i++) {
    ondemandPaths.push(generateOnDemandPath(i));
    subscriberPaths.push(generateSubscriberPath(i));
    smartFleetPaths.push(generateSmartFleetPath(i));
  }
  cached = {
    fleet: {
      ondemand: { panel: "ondemand", paths: ondemandPaths },
      commutepass: { panel: "commutepass", paths: subscriberPaths },
      smartFleet: { panel: "commutepass", paths: smartFleetPaths },
    },
    kpis: {
      ondemand: buildKpis("ondemand"),
      commutepass: buildKpis("commutepass"),
    },
  };
  return cached;
}

export function interpolateVehicle(
  path: VehiclePath,
  t: number,
): { x: number; y: number; state: VehicleState } {
  // Per-vehicle time offset desyncs state changes and direction pivots so the fleet
  // doesn't all "tick" on the same beat. Subscribers get a smaller offset so corridor
  // traversals still cluster around the morning/evening peak windows.
  const tEff = ((t + path.tempoOffset) % 1 + 1) % 1;

  const kf = path.keyframes;
  let baseX: number;
  let baseY: number;
  let state: VehicleState;
  if (tEff <= kf[0].t) {
    baseX = kf[0].x;
    baseY = kf[0].y;
    state = kf[0].state;
  } else {
    const last = kf[kf.length - 1];
    if (tEff >= last.t) {
      baseX = last.x;
      baseY = last.y;
      state = last.state;
    } else {
      let lo = 0;
      while (lo < kf.length - 1 && kf[lo + 1].t < tEff) lo++;
      const a = kf[lo];
      const b = kf[lo + 1];
      const phase = (tEff - a.t) / (b.t - a.t);
      baseX = a.x + (b.x - a.x) * phase;
      baseY = a.y + (b.y - a.y) * phase;
      state = a.state;
    }
  }

  // Continuous per-vehicle micro-wobble. Sub-keyframe motion that breaks the
  // "every dot moves on the same linear segment" feel without disrupting trajectory.
  const wobbleX = Math.sin(t * 28 + path.wobblePhase) * 1.4;
  const wobbleY = Math.cos(t * 31 + path.wobblePhase * 1.3) * 1.4;
  return { x: baseX + wobbleX, y: baseY + wobbleY, state };
}

export function interpolateKpi(curve: KPICurve, t: number): KPISnapshot {
  const s = curve.snapshots;
  if (t <= s[0].t) return s[0];
  const last = s[s.length - 1];
  if (t >= last.t) return last;

  let lo = 0;
  while (lo < s.length - 1 && s[lo + 1].t < t) lo++;
  const a = s[lo];
  const b = s[lo + 1];
  const phase = (t - a.t) / (b.t - a.t);

  const lerpOpt = (av?: number, bv?: number) =>
    av !== undefined && bv !== undefined ? av + (bv - av) * phase : undefined;

  return {
    t,
    deadheadPct: a.deadheadPct + (b.deadheadPct - a.deadheadPct) * phase,
    avgEtaMin: a.avgEtaMin + (b.avgEtaMin - a.avgEtaMin) * phase,
    subscriberEtaMin: lerpOpt(a.subscriberEtaMin, b.subscriberEtaMin),
    nonSubscriberEtaMin: lerpOpt(a.nonSubscriberEtaMin, b.nonSubscriberEtaMin),
    vehiclesActive: a.vehiclesActive + (b.vehiclesActive - a.vehiclesActive) * phase,
    missedDemandPct: a.missedDemandPct + (b.missedDemandPct - a.missedDemandPct) * phase,
  };
}
