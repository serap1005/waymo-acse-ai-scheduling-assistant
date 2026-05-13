"use client";

import { useEffect, useState } from "react";
import { NEIGHBORHOODS, type Hood } from "./la";

export interface ScheduledRide {
  id: string;
  createdAt: number;
  origin: string;
  destination: string;
  days: string[];
  departureTime: string;
  returnTrip: boolean;
  returnTime?: string;
  lockedPrice: string;
}

const STORAGE_KEY = "commute-pass:scheduled-rides";
const EVENT_NAME = "commute-pass:schedules-updated";

// Alias table: maps each LA neighborhood to the substrings users (or ACSE) might
// say. Match is case-insensitive substring containment. First hit wins.
const HOOD_ALIASES: Record<string, string[]> = {
  "Santa Monica": ["santa monica", "sm"],
  "Venice": ["venice"],
  "Culver City": ["culver"],
  "LAX": ["lax", "los angeles international", "airport"],
  "Westwood": ["westwood", "ucla"],
  "Beverly Hills": ["beverly hills", "bev hills"],
  "WeHo": ["weho", "west hollywood"],
  "Hollywood": ["hollywood"],
  "Koreatown": ["koreatown", "ktown", "k-town"],
  "DTLA": ["dtla", "downtown la", "downtown los angeles", "downtown", "financial district la"],
  "Pasadena": ["pasadena"],
};

export function matchNeighborhood(input: string): Hood | null {
  const lower = input.toLowerCase();
  for (const hood of NEIGHBORHOODS) {
    const aliases = HOOD_ALIASES[hood.name] ?? [hood.name.toLowerCase()];
    if (aliases.some((alias) => lower.includes(alias))) return hood;
  }
  return null;
}

function readStorage(): ScheduledRide[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStorage(rides: ScheduledRide[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rides));
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export function useScheduledRides() {
  const [rides, setRides] = useState<ScheduledRide[]>([]);

  useEffect(() => {
    setRides(readStorage());
    const handler = () => setRides(readStorage());
    // Cross-tab updates (e.g. user submits in / and toggles to /supply in another tab).
    window.addEventListener("storage", handler);
    // Same-tab updates (e.g. user navigates via View Switcher within the same tab).
    window.addEventListener(EVENT_NAME, handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener(EVENT_NAME, handler);
    };
  }, []);

  const addRide = (ride: Omit<ScheduledRide, "id" | "createdAt">) => {
    const next = [
      ...readStorage(),
      { ...ride, id: crypto.randomUUID(), createdAt: Date.now() },
    ];
    writeStorage(next);
    setRides(next);
  };

  const removeRide = (id: string) => {
    const next = readStorage().filter((r) => r.id !== id);
    writeStorage(next);
    setRides(next);
  };

  const clearAll = () => {
    writeStorage([]);
    setRides([]);
  };

  return { rides, addRide, removeRide, clearAll };
}

export interface UserCorridor {
  id: string;
  from: Hood;
  to: Hood;
  ride: ScheduledRide;
}

export function rideToCorridor(ride: ScheduledRide): UserCorridor | null {
  const from = matchNeighborhood(ride.origin);
  const to = matchNeighborhood(ride.destination);
  if (!from || !to || from.name === to.name) return null;
  return { id: ride.id, from, to, ride };
}

// Convert a "8:30 AM" style timestamp into a normalized 0..1 simulation time
// where 6 AM = 0 and 9 PM = 1. Out-of-window times clamp to the endpoints.
export function parseTimeToSimT(timeStr: string): number {
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return 0.5;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  const decimalHour = h + m / 60;
  return Math.max(0, Math.min(1, (decimalHour - 6) / 15));
}

// Position + state for a user-scheduled vehicle at sim time t.
// The vehicle is never idle — Commute Pass means your car is *always* working,
// it just knows when to be where for you. Phases across the day:
//   1. Early morning: doing other rides near origin
//   2. Pre-position window (~15 sim-min before departure): drift to origin center
//   3. Pickup traversal: along corridor with_passenger (the user's actual ride)
//   4. Mid-day: doing other rides near destination
//   5. Return reposition (late evening): heading back toward origin for tomorrow
const RIDE_DURATION_T = 30 / (15 * 60);          // 30 sim-min
const PREPOSITION_DURATION_T = 15 / (15 * 60);   // 15 sim-min
const RETURN_REPOS_START = (18.5 - 6) / 15;      // 6:30 PM normalized

function workAroundHood(
  hood: { cx: number; cy: number; r: number },
  t: number,
  seed: number,
): { x: number; y: number; state: "dispatched" | "with_passenger" } {
  const angle = t * 4.5 + seed * 0.05;
  const radius = hood.r * (0.8 + 0.5 * Math.sin(t * 6 + seed * 0.11));
  const x = hood.cx + Math.cos(angle) * radius + Math.sin(t * 8 + seed) * 4;
  const y = hood.cy + Math.sin(angle) * radius + Math.cos(t * 7 + seed * 1.2) * 4;
  const state = Math.sin(t * 9 + seed * 0.3) > -0.4 ? "with_passenger" : "dispatched";
  return { x, y, state };
}

export function computeUserVehiclePosition(
  uc: UserCorridor,
  t: number,
): { x: number; y: number; state: "idle" | "dispatched" | "with_passenger" } {
  const departureT = parseTimeToSimT(uc.ride.departureTime);
  const arrivalT = departureT + RIDE_DURATION_T;
  const prePositionStart = Math.max(0, departureT - PREPOSITION_DURATION_T);
  const seed = uc.from.cx + uc.to.cy;

  let baseX: number;
  let baseY: number;
  let state: "idle" | "dispatched" | "with_passenger";

  if (t >= departureT && t < arrivalT) {
    // 3. Pickup traversal — the user's actual ride.
    const phase = (t - departureT) / RIDE_DURATION_T;
    baseX = uc.from.cx + (uc.to.cx - uc.from.cx) * phase;
    baseY = uc.from.cy + (uc.to.cy - uc.from.cy) * phase;
    state = "with_passenger";
  } else if (t >= prePositionStart && t < departureT) {
    // 2. Pre-position to origin: drift in from edge of the neighborhood.
    const phase = (t - prePositionStart) / Math.max(PREPOSITION_DURATION_T, 0.001);
    const ang = seed * 0.05;
    const startX = uc.from.cx + Math.cos(ang) * uc.from.r * 1.4;
    const startY = uc.from.cy + Math.sin(ang) * uc.from.r * 1.4;
    baseX = startX + (uc.from.cx - startX) * phase;
    baseY = startY + (uc.from.cy - startY) * phase;
    state = "dispatched";
  } else if (t >= arrivalT && t < RETURN_REPOS_START) {
    // 4. Mid-day work near destination.
    const w = workAroundHood(uc.to, t, seed);
    baseX = w.x;
    baseY = w.y;
    state = w.state;
  } else if (t >= RETURN_REPOS_START) {
    // 5. Return reposition: head back toward origin area for tomorrow's pickup,
    // still doing rides along the way.
    const phase = (t - RETURN_REPOS_START) / (1 - RETURN_REPOS_START);
    baseX = uc.to.cx + (uc.from.cx - uc.to.cx) * phase;
    baseY = uc.to.cy + (uc.from.cy - uc.to.cy) * phase;
    state = phase < 0.7 ? "with_passenger" : "dispatched";
  } else {
    // 1. Early morning work near origin.
    const w = workAroundHood(uc.from, t, seed);
    baseX = w.x;
    baseY = w.y;
    state = w.state;
  }

  // Wobble matching the baseline fleet so this vehicle reads as part of the fleet.
  const wobbleX = Math.sin(t * 28 + uc.from.cx * 0.5) * 1.4;
  const wobbleY = Math.cos(t * 31 + uc.to.cy * 0.5) * 1.4;
  return { x: baseX + wobbleX, y: baseY + wobbleY, state };
}
