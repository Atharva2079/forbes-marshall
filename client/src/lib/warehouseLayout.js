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
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'
];

/**
 * Get dynamic column count per row based on layout.
 * Rows A-G are shorter (around 20 columns) due to left V-racks.
 * Rows H-Z are longer (around 40 columns) extending across the floor.
 */
export function getRackCols(row) {
  return ['A', 'B', 'C', 'D', 'E', 'F', 'G'].includes(row) ? 20 : 40;
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
export const WAREHOUSE_D = 98;

// Z positioning mapping for rows A-Z based on double-row aisles
export const Z_OFFSETS = {
  'A': 8.0,  'B': 9.5,
  'C': 15.0,
  'D': 20.5, 'E': 22.0,
  'F': 27.5, 'G': 29.0,
  'H': 34.5, 'I': 36.0,
  'J': 41.5, 'K': 43.0,
  'L': 48.5,
  'M': 54.0, 'N': 55.5,
  'O': 61.0, 'P': 62.5,
  'Q': 68.0, 'R': 69.5,
  'S': 75.0, 'T': 76.5,
  'U': 82.0, 'V': 83.5,
  'W': 89.0, 'X': 90.5,
  'Y': 94.5, 'Z': 96.0
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

/**
 * Get the world position of a blue bin rack section.
 * Matches V29-V42 left wall locations, V01-V28/V43-V45 Mezzanine grid, and AC1-AC6 northeast grid.
 */
export function getBinRackWorldPosition(rackId, col) {
  if (rackId === 'V') {
    const sectionNum = col + 1; // 1-indexed section V01 to V45
    
    // Physical mapping for V29 to V42 (placed vertically along the left wall)
    if (sectionNum >= 29 && sectionNum <= 42) {
      let z;
      let x = 2.0;
      if (sectionNum === 40) z = Z_OFFSETS['A'];
      else if (sectionNum === 39) z = Z_OFFSETS['B'];
      else if (sectionNum === 38) z = Z_OFFSETS['C'];
      else if (sectionNum === 37) z = Z_OFFSETS['D'];
      else if (sectionNum === 36) z = Z_OFFSETS['F'];
      else if (sectionNum === 41) { x = 4.5; z = Z_OFFSETS['B']; }
      else if (sectionNum === 42) { x = 4.5; z = Z_OFFSETS['C']; }
      else if (sectionNum === 35) z = Z_OFFSETS['H'];
      else if (sectionNum === 34) z = Z_OFFSETS['L'];
      else if (sectionNum === 33) z = Z_OFFSETS['O'];
      else if (sectionNum === 32) z = Z_OFFSETS['Q'];
      else if (sectionNum === 31) z = Z_OFFSETS['S'];
      else if (sectionNum === 30) z = Z_OFFSETS['U'];
      else if (sectionNum === 29) z = Z_OFFSETS['V'];
      else z = Z_OFFSETS['Y'];
      
      return { x, y: 0, z };
    }
    
    // Mezzanine grid mapping for V01-V28 and V43-V45
    const listIndex = sectionNum > 42 ? (sectionNum - 43 + 28) : (sectionNum - 1);
    const r = Math.floor(listIndex / 4);
    const c = listIndex % 4;
    const x = 4.5 + c * 3.0;
    const z = 2.5 + r * 1.8;
    return { x, y: 3.2, z }; // Raised mezzanine height = 3.2m
  }
  
  // Northeast Blue Bin racks (AC1 - AC6)
  const rackIdx = ['AC1', 'AC2', 'AC3', 'AC4', 'AC5', 'AC6'].indexOf(rackId);
  const x = 52.0 + rackIdx * 3.2 + col * 0.4;
  const z = Z_OFFSETS['A'] - 3.5;
  return { x, y: 0, z };
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
