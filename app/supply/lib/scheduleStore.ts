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
