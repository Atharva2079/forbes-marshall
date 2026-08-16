// ============================================================
// Forbes Marshall — 3D Warehouse Layout Engine (RMS Pavilion)
// Maps real warehouse rack data into Three.js world coordinates
// Matches the "RMS Pavilion" layout plan exactly.
// ============================================================

/* ─────────────────────────────────────────────────────
   RACK TYPES
 ───────────────────────────────────────────────────── */
export const RACK_TYPES = {
  PALLET:   { label: 'Metal Pallet Rack',  color: 0xd45400 },  // orange
  BLUE_BIN: { label: 'Blue Bin Rack',      color: 0x2563eb },  // blue
  CABINET:  { label: 'Cabinet',            color: 0x7c3aed },  // purple
  CHEMICAL: { label: 'Chemical Cupboard',  color: 0xdc2626 },  // red
};

/* ─────────────────────────────────────────────────────
   PALLET RACK DEFINITIONS (A to Z)
 ───────────────────────────────────────────────────── */
export const PALLET_ROWS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'W', 'X', 'Y', 'Z'
];

/**
 * Get actual column count per row — matches real warehouse data.
 * Values derived from max col_number found in Excel locator data.
 */
const RACK_COL_COUNTS = {
  A: 16, B: 16, C: 16, D: 17, E: 16, F: 14, G: 28,
  H: 28, I: 25, J: 24, K: 26, L: 28, M: 28,
  N: 30, O: 28, P: 30, Q: 30, R: 30, S: 13, T: 28,
  U: 28, W: 28, X: 28, Y: 32, Z: 40
};
export function getRackCols(row) {
  return RACK_COL_COUNTS[row] || 20;
}

/* ─────────────────────────────────────────────────────
   BLUE BIN RACK DEFINITIONS
   Rack 'V' has 45 columns (representing sections V01 to V45).
 ───────────────────────────────────────────────────── */
export const BLUE_BIN_RACKS = [
  { id: 'V',   cols: 45 },
  { id: 'AC1', cols: 6  },
  { id: 'AC2', cols: 6  },
  { id: 'AC3', cols: 6  },
  { id: 'AC4', cols: 6  },
  { id: 'AC5', cols: 6  },
  { id: 'AC6', cols: 6  },
];
export const BLUE_BIN_IDS = BLUE_BIN_RACKS.map(r => r.id);

/* ─────────────────────────────────────────────────────
   CABINET DEFINITIONS
 ───────────────────────────────────────────────────── */
export const CABINET_IDS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, // bottom-right wall
  23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34,                                 // top-right wall
  35, 36, 37                                                                     // top curved wall
];

/* ─────────────────────────────────────────────────────
   3D SPACING CONSTANTS (metres)
 ───────────────────────────────────────────────────── */
export const PALLET_RACK_W       = 1.4;   // rack width (X)
export const PALLET_RACK_D       = 0.6;   // rack depth (Z)
export const PALLET_RACK_H       = 2.8;   // total height
export const PALLET_SHELF_LEVELS = 5;    // G+5 (Ground + 5 rows)
export const PALLET_SHELF_H      = PALLET_RACK_H / PALLET_SHELF_LEVELS;

export const BIN_RACK_W  = 1.1;   // smaller width
export const BIN_RACK_D  = 0.5;
export const BIN_RACK_H  = 1.8;   // shorter
export const BIN_LEVELS  = 10;    // many small bins

export const CABINET_W = 0.9;
export const CABINET_D = 0.5;
export const CABINET_H = 1.9;

export const WAREHOUSE_W = 82;
export const WAREHOUSE_D = 104;

// Z positioning mapping based on PDF gangways
// Pairs: A/B, D/E, F/G, H/I, J/K, M/N, O/P, Q/R, S/T, U/V, W/X
// Singles: C, L, Y
export const Z_OFFSETS = {
  'A': 5.0,  'B': 6.5,
  'C': 10.5,
  'D': 14.5, 'E': 16.0,
  'F': 20.0, 'G': 21.5,
  'H': 25.5, 'I': 27.0,
  'J': 31.0, 'K': 32.5,
  'L': 36.5,
  'M': 40.5, 'N': 42.0,
  'O': 46.0, 'P': 47.5,
  'Q': 51.5, 'R': 53.0,
  'S': 57.0, 'T': 58.5,
  'U': 62.5,
  'W': 68.0, 'X': 69.5,
  'Y': 73.5, 'Z': 77.5
};

export const GANGWAY_Z = {
  'A': 3.5,  'B': 8.5,
  'C': 8.5,
  'D': 12.5, 'E': 18.0,
  'F': 18.0, 'G': 23.5,
  'H': 23.5, 'I': 29.0,
  'J': 29.0, 'K': 34.5,
  'L': 34.5,
  'M': 38.5, 'N': 44.0,
  'O': 44.0, 'P': 49.5,
  'Q': 49.5, 'R': 55.0,
  'S': 55.0, 'T': 60.5,
  'U': 60.5,
  'W': 66.0, 'X': 71.5,
  'Y': 71.5, 'Z': 79.5
};

/* ─────────────────────────────────────────────────────
   LAYOUT POSITION COMPUTATION
 ───────────────────────────────────────────────────── */

/**
 * Get the world position of a pallet rack section.
 * Racks are contiguously spaced along X.
 */
export function getRackWorldPosition(rackLetter, col) {
  const isShort = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].includes(rackLetter);
  const startX = isShort ? 18.0 : 8.0;
  const x = startX + col * PALLET_RACK_W;
  const z = Z_OFFSETS[rackLetter] || 0;
  return { x, y: 0, z };
}

export function getBinRackWorldPosition(rackId, col) {
  // AC racks are in the mezzanine top-right area
  if (rackId.startsWith('AC')) {
    const rackIdx = ['AC1', 'AC2', 'AC3', 'AC4', 'AC5', 'AC6'].indexOf(rackId);
    const x = 52.0 + rackIdx * 3.2 + col * 0.4;
    const z = Z_OFFSETS['A'] - 3.5;
    return { x, y: 0, z };
  }
  
  // V racks are distributed vertically along the left wall (X = 4.0)
  // V01-V45 run from Z = 2 to Z = 70
  // Each section (col) is just part of that long wall.
  // Instead of a grid, it's one long line of 45 racks.
  const sectionIdx = parseInt(col, 10); // col is actually the section 0-44
  
  // They are placed against the left wall, facing right.
  const x = 4.0;
  const z = 4.0 + sectionIdx * 1.6; // Spread out along the Z axis
  return { x, y: 0, z, rotation: Math.PI / 2 }; // Rotated to face the aisle
}

/**
 * Get the world position of a cabinet along the right wall.
 */
export function getCabinetWorldPosition(cabinetNum) {
  if (cabinetNum >= 35 && cabinetNum <= 37) {
    // Top curve cabinets
    const idx = cabinetNum - 35;
    const x = 42.0 + idx * 2.8;
    const z = 2.0;
    return { x, y: 0, z };
  } else if (cabinetNum >= 23 && cabinetNum <= 34) {
    // Top-right cabinets
    const idx = cabinetNum - 23;
    const z = 5.0 + idx * 3.2;
    return { x: 77.0, y: 0, z };
  } else {
    // Bottom-right cabinets (C01 - C22)
    const idx = Math.min(22, cabinetNum) - 1;
    const z = Z_OFFSETS['L'] + 4.0 + idx * 2.1;
    return { x: 77.0, y: 0, z };
  }
}

/**
 * Get the world position of the chemical cupboard on the left wall.
 */
export function getChemicalWorldPosition() {
  return { x: 2.0, y: 0, z: Z_OFFSETS['P'] };
}

/* ─────────────────────────────────────────────────────
   ENTRY POINTS
 ───────────────────────────────────────────────────── */
export const ENTRY_POINTS = [
  { id: 'ENTRY_1', name: 'Middle-Right Entry Gate', x: 77.0, y: 0, z: Z_OFFSETS['L'] },
  { id: 'ENTRY_2', name: 'Bottom-Right Entry Gate', x: 77.0, y: 0, z: Z_OFFSETS['W'] }
];

export function getClosestEntryPoint(targetZ) {
  const dist1 = Math.abs(ENTRY_POINTS[0].z - targetZ);
  const dist2 = Math.abs(ENTRY_POINTS[1].z - targetZ);
  return dist1 < dist2 ? ENTRY_POINTS[0] : ENTRY_POINTS[1];
}

/* ─────────────────────────────────────────────────────
   UTILITY — rack type resolver
 ───────────────────────────────────────────────────── */
export function getRackType(rack) {
  if (!rack) return 'PALLET';
  const r = rack.toString().trim();

  if (/^cabinet/i.test(r))  return 'CABINET';
  if (/^chem/i.test(r))     return 'CHEMICAL';
  if (BLUE_BIN_IDS.includes(r)) return 'BLUE_BIN';
  if (PALLET_ROWS.includes(r))  return 'PALLET';

  return 'PALLET';
}

/* ─────────────────────────────────────────────────────
   getAllRackPositions — flat map of every rack → position
 ───────────────────────────────────────────────────── */
export function getAllRackPositions() {
  const map = {};

  // Pallet racks
  PALLET_ROWS.forEach(row => {
    const cols = getRackCols(row);
    for (let c = 0; c < cols; c++) {
      const id  = `RACK-${row}${String(c + 1).padStart(2, '0')}`;
      map[id] = { ...getRackWorldPosition(row, c), type: 'PALLET', row, col: c };
    }
  });

  // Blue bin racks
  BLUE_BIN_RACKS.forEach(rack => {
    for (let c = 0; c < rack.cols; c++) {
      const id = `BIN-${rack.id}${String(c + 1).padStart(2, '0')}`;
      map[id] = { ...getBinRackWorldPosition(rack.id, c), type: 'BLUE_BIN', rackId: rack.id, col: c };
    }
  });

  // Cabinets
  CABINET_IDS.forEach(num => {
    const id = `CAB-${num}`;
    map[id] = { ...getCabinetWorldPosition(num), type: 'CABINET', cabinetNum: num };
  });

  // Chemical
  map['CHEMICAL'] = { ...getChemicalWorldPosition(), type: 'CHEMICAL' };

  return map;
}

export const RACK_POSITIONS = getAllRackPositions();

export const ZONES = {
  Pallet: {
    racks: [...PALLET_ROWS],
    color: 0xd45400,
    label: 'Metal Pallet Racks',
  },
  'Blue Bin': {
    racks: BLUE_BIN_IDS,
    color: 0x2563eb,
    label: 'Blue Bin Racks',
  },
  Cabinet: {
    racks: CABINET_IDS.map(n => `cabinet ${n}`),
    color: 0x7c3aed,
    label: 'Cabinets',
  },
  Chemical: {
    racks: [],
    color: 0xdc2626,
    label: 'Chemical Storage',
  },
};
