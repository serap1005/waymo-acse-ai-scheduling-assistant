export type VehicleState = "idle" | "dispatched" | "with_passenger";

export type PanelKind = "ondemand" | "commutepass";

export interface VehicleKeyframe {
  t: number;
  x: number;
  y: number;
  state: VehicleState;
}

export interface VehiclePath {
  id: number;
  keyframes: VehicleKeyframe[];
  tempoOffset: number;
  wobblePhase: number;
}

export interface FleetCurve {
  panel: PanelKind;
  paths: VehiclePath[];
}

export interface KPISnapshot {
  t: number;
  deadheadPct: number;
  avgEtaMin: number;
  subscriberEtaMin?: number;
  nonSubscriberEtaMin?: number;
  vehiclesActive: number;
  missedDemandPct: number;
}

export interface KPICurve {
  panel: PanelKind;
  snapshots: KPISnapshot[];
}

export interface SimulationData {
  fleet: { ondemand: FleetCurve; commutepass: FleetCurve; smartFleet: FleetCurve };
  kpis: { ondemand: KPICurve; commutepass: KPICurve };
}

export const STATE_COLOR: Record<VehicleState, string> = {
  idle: "#6B7280",
  dispatched: "#22D3EE",
  with_passenger: "#3B82F6",
};
