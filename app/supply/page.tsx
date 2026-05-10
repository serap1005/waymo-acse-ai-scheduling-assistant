"use client";

import { useMemo, useRef, useState } from "react";
import { HeroBlock, type HeroRefs } from "./components/HeroBlock";
import { KPIStrip, type KpiRefs } from "./components/KPIStrip";
import { Legend } from "./components/Legend";
import { Panel, type PanelHandle } from "./components/Panel";
import { Scrubber } from "./components/Scrubber";
import { useAnimationLoop } from "./lib/animation";
import {
  generateSimulation,
  interpolateKpi,
  interpolateVehicle,
} from "./lib/simulation";
import { STATE_COLOR } from "./lib/types";

const LOOP_MS = 30_000;
const VEHICLE_COUNT = 40;
const ADOPTION = 0.5;
const SUBSCRIBER_COUNT = Math.floor(VEHICLE_COUNT * ADOPTION);

function useSpanRef() {
  return useRef<HTMLSpanElement | null>(null);
}
function useDivRef() {
  return useRef<HTMLDivElement | null>(null);
}

function fmt1(n: number, sign = false): string {
  const v = Math.round(n * 10) / 10;
  return `${sign && v > 0 ? "+" : ""}${v.toFixed(1)}`;
}
function fmtCount(n: number): string {
  return Math.round(n).toString();
}
function fmtHour(t: number): string {
  const hour = 6 + t * 15;
  const h = Math.floor(hour);
  const m = Math.floor((hour - h) * 60);
  const ampm = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

export default function SupplyPage() {
  const sim = useMemo(() => generateSimulation(), []);

  const simTimeRef = useRef(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const isPlayingRef = useRef(true);
  isPlayingRef.current = isPlaying;

  const leftPanelRef = useRef<PanelHandle | null>(null);
  const rightPanelRef = useRef<PanelHandle | null>(null);

  const heroRefs: HeroRefs = {
    deadheadValue: useSpanRef(),
    peakEtaDelta: useSpanRef(),
    extraRides: useSpanRef(),
  };

  const kpiRefs: KpiRefs = {
    ondemandDeadhead: useSpanRef(),
    ondemandEta: useSpanRef(),
    ondemandActive: useSpanRef(),
    commutepassDeadhead: useSpanRef(),
    commutepassSubEta: useSpanRef(),
    commutepassNonSubEta: useSpanRef(),
    commutepassActive: useSpanRef(),
    deadheadDelta: useSpanRef(),
    etaDelta: useSpanRef(),
    activeDelta: useSpanRef(),
  };

  const scrubberFillRef = useDivRef();
  const scrubberPlayheadRef = useDivRef();
  const scrubberHourRef = useSpanRef();

  useAnimationLoop((dt) => {
    if (isPlayingRef.current) {
      simTimeRef.current = (simTimeRef.current + dt / LOOP_MS) % 1;
    }
    const t = simTimeRef.current;

    // Vehicles
    const leftNodes = leftPanelRef.current?.getVehicleNodes();
    const rightNodes = rightPanelRef.current?.getVehicleNodes();

    if (leftNodes) {
      for (let i = 0; i < VEHICLE_COUNT; i++) {
        const node = leftNodes[i];
        if (!node) continue;
        const path = sim.fleet.ondemand.paths[i];
        const { x, y, state } = interpolateVehicle(path, t);
        node.setAttribute("transform", `translate(${x.toFixed(2)}, ${y.toFixed(2)})`);
        const color = STATE_COLOR[state];
        const c = node.children;
        if (c[0]) (c[0] as SVGCircleElement).setAttribute("fill", color);
        if (c[1]) (c[1] as SVGCircleElement).setAttribute("fill", color);
      }
    }
    if (rightNodes) {
      for (let i = 0; i < VEHICLE_COUNT; i++) {
        const node = rightNodes[i];
        if (!node) continue;
        const path =
          i < SUBSCRIBER_COUNT
            ? sim.fleet.commutepass.paths[i]
            : sim.fleet.smartFleet.paths[i];
        const { x, y, state } = interpolateVehicle(path, t);
        node.setAttribute("transform", `translate(${x.toFixed(2)}, ${y.toFixed(2)})`);
        const color = STATE_COLOR[state];
        const c = node.children;
        if (c[0]) (c[0] as SVGCircleElement).setAttribute("fill", color);
        if (c[1]) (c[1] as SVGCircleElement).setAttribute("fill", color);
      }
    }

    // KPIs
    const od = interpolateKpi(sim.kpis.ondemand, t);
    const cp = interpolateKpi(sim.kpis.commutepass, t);
    const blend = (l: number, r: number) => l + (r - l) * ADOPTION;
    const cpDeadhead = blend(od.deadheadPct, cp.deadheadPct);
    const cpActive = blend(od.vehiclesActive, cp.vehiclesActive);
    const cpSubEta = cp.subscriberEtaMin ?? cp.avgEtaMin;
    const cpNonSubEta = blend(od.avgEtaMin, cp.nonSubscriberEtaMin ?? cp.avgEtaMin);
    const cpAvgEta = ADOPTION * cpSubEta + (1 - ADOPTION) * cpNonSubEta;

    const setText = (ref: { current: HTMLSpanElement | null }, text: string) => {
      if (ref.current) ref.current.textContent = text;
    };

    setText(kpiRefs.ondemandDeadhead, fmt1(od.deadheadPct));
    setText(kpiRefs.ondemandEta, fmt1(od.avgEtaMin));
    setText(kpiRefs.ondemandActive, fmtCount(od.vehiclesActive));

    setText(kpiRefs.commutepassDeadhead, fmt1(cpDeadhead));
    setText(kpiRefs.commutepassSubEta, fmt1(cpSubEta));
    setText(kpiRefs.commutepassNonSubEta, fmt1(cpNonSubEta));
    setText(kpiRefs.commutepassActive, fmtCount(cpActive));

    setText(kpiRefs.deadheadDelta, `${fmt1(cpDeadhead - od.deadheadPct, true)} pp vs. on-demand`);
    setText(kpiRefs.etaDelta, `${fmt1(cpAvgEta - od.avgEtaMin, true)} min avg vs. on-demand`);
    setText(
      kpiRefs.activeDelta,
      `${fmt1(((cpActive - od.vehiclesActive) / Math.max(od.vehiclesActive, 1)) * 100, true)}% vs. on-demand`,
    );

    // Hero
    const deadheadReduction = ((od.deadheadPct - cpDeadhead) / Math.max(od.deadheadPct, 1)) * 100;
    setText(heroRefs.deadheadValue, `−${Math.round(deadheadReduction)}%`);
    setText(heroRefs.peakEtaDelta, `−${fmt1(od.avgEtaMin - cpAvgEta)}`);
    const extraRidesPct = ((cpActive - od.vehiclesActive) / Math.max(od.vehiclesActive, 1)) * 100;
    setText(heroRefs.extraRides, `+${Math.round(extraRidesPct)}%`);

    // Scrubber
    if (scrubberFillRef.current) scrubberFillRef.current.style.width = `${t * 100}%`;
    if (scrubberPlayheadRef.current) scrubberPlayheadRef.current.style.left = `${t * 100}%`;
    setText(scrubberHourRef, fmtHour(t));
  });

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#050813",
        color: "#E2E8F0",
        padding: "14px 20px 16px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <header
        style={{
          marginBottom: 10,
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
            Waymo · Fleet Allocation Sandbox
          </span>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#F1F5F9" }}>
            Los Angeles · Supply view
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
          Simulated · 50% adoption
        </div>
      </header>

      <HeroBlock refs={heroRefs} />
      <KPIStrip refs={kpiRefs} />
      <Legend />
      <Scrubber
        simTimeRef={simTimeRef}
        fillRef={scrubberFillRef}
        playheadRef={scrubberPlayheadRef}
        hourLabelRef={scrubberHourRef}
        onPause={() => setIsPlaying(false)}
        onResume={() => setIsPlaying(true)}
      />

      <div style={{ display: "flex", gap: 12 }}>
        <Panel
          ref={leftPanelRef}
          panelKind="ondemand"
          eyebrow="Today's fleet"
          title="On-Demand Only"
          caption="Unpredictable demand · scattered allocation"
          showCorridorPulses={false}
          vehicleCount={VEHICLE_COUNT}
        />
        <Panel
          ref={rightPanelRef}
          panelKind="commutepass"
          eyebrow="Today's fleet"
          title="With Commute Pass"
          caption="Predictable demand · pre-positioned fleet"
          showCorridorPulses={true}
          vehicleCount={VEHICLE_COUNT}
        />
      </div>

      <footer
        style={{
          marginTop: 8,
          fontSize: 9,
          color: "#475569",
          letterSpacing: "0.05em",
          lineHeight: 1.5,
        }}
      >
        All values simulated. Baselines (deadhead 44.3%, peak ETA 5.7 min) from the Waymo Commute Pass brief;
        &quot;With Commute Pass&quot; values are aspirational projections at 50% subscriber adoption.
      </footer>
    </main>
  );
}
