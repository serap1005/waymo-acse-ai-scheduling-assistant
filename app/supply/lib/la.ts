export const PANEL_WIDTH = 600;
export const PANEL_HEIGHT = 340;

export interface Hood {
  name: string;
  cx: number;
  cy: number;
  r: number;
}

// LA neighborhood layout. West (Santa Monica/Venice) is left, east (DTLA, Pasadena)
// is right. North (Hollywood, Pasadena) is top, south (LAX) is bottom. DTLA is the
// employment hub all morning corridors converge on.
export const NEIGHBORHOODS: Hood[] = [
  { name: "Santa Monica", cx: 80, cy: 145, r: 30 },
  { name: "Venice", cx: 90, cy: 215, r: 25 },
  { name: "Culver City", cx: 170, cy: 220, r: 25 },
  { name: "LAX", cx: 140, cy: 285, r: 22 },
  { name: "Westwood", cx: 180, cy: 130, r: 27 },
  { name: "Beverly Hills", cx: 240, cy: 145, r: 27 },
  { name: "WeHo", cx: 275, cy: 155, r: 22 },
  { name: "Hollywood", cx: 310, cy: 95, r: 28 },
  { name: "Koreatown", cx: 305, cy: 210, r: 25 },
  { name: "DTLA", cx: 415, cy: 200, r: 35 },
  { name: "Pasadena", cx: 520, cy: 90, r: 27 },
];

// Morning commute corridors. All into DTLA — realistic for LA, where the financial
// district and most legacy office stock concentrate downtown. Visually creates a
// "hub-and-spokes" pattern at peak that's easy to read.
export const CORRIDORS: [number, number][] = [
  [0, 9], // Santa Monica → DTLA
  [1, 9], // Venice → DTLA
  [4, 9], // Westwood → DTLA
  [6, 9], // WeHo → DTLA
  [7, 9], // Hollywood → DTLA
  [10, 9], // Pasadena → DTLA
];

export const CITY_BOUNDS = { minX: 45, maxX: 555, minY: 55, maxY: 315 };

export const PEAK = {
  morningStart: (7 - 6) / 15,
  morningEnd: (9 - 6) / 15,
  eveningStart: (17 - 6) / 15,
  eveningEnd: (19 - 6) / 15,
};

export const GRID_MAJOR = 80;
export const GRID_MINOR = 40;
