export const PANEL_WIDTH = 600;
export const PANEL_HEIGHT = 340;

export interface Hood {
  name: string;
  cx: number;
  cy: number;
  r: number;
}

export const NEIGHBORHOODS: Hood[] = [
  { name: "Marina", cx: 266, cy: 50, r: 32 },
  { name: "Pac Hts", cx: 340, cy: 90, r: 30 },
  { name: "Nob Hill", cx: 404, cy: 116, r: 25 },
  { name: "Financial", cx: 456, cy: 134, r: 27 },
  { name: "SOMA", cx: 421, cy: 173, r: 35 },
  { name: "Mission", cx: 352, cy: 215, r: 35 },
  { name: "Castro", cx: 277, cy: 213, r: 27 },
  { name: "Hayes Vly", cx: 329, cy: 158, r: 25 },
  { name: "Richmond", cx: 150, cy: 118, r: 37 },
  { name: "Sunset", cx: 167, cy: 225, r: 40 },
  { name: "Bernal", cx: 329, cy: 280, r: 27 },
];

export const CORRIDORS: [number, number][] = [
  [5, 4], // Mission → SOMA
  [6, 3], // Castro → Financial
  [9, 4], // Sunset → SOMA
  [8, 3], // Richmond → Financial
  [0, 3], // Marina → Financial
  [10, 4], // Bernal → SOMA
];

export const CITY_BOUNDS = { minX: 70, maxX: 530, minY: 30, maxY: 315 };

export const PEAK = {
  morningStart: (7 - 6) / 15,
  morningEnd: (9 - 6) / 15,
  eveningStart: (17 - 6) / 15,
  eveningEnd: (19 - 6) / 15,
};

export const GRID_MAJOR = 80;
export const GRID_MINOR = 40;
