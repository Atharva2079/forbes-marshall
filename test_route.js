import { RACK_POSITIONS, ENTRY_POINT, ROWS, RACK_W, RACK_D, SHELF_H, COLS, AISLE_GAP } from './client/src/lib/warehouseLayout.js';

const RIGHT_AISLE_X  = COLS * (RACK_W + AISLE_GAP) + 1.8;
const LEFT_AISLE_X   = -1.8;
const BACK_AISLE_Z   = -1.5;
const FLOOR_Y        = 0.1;
const SHELF_APPROACH = 0.8;

function getCrossAisleZ(rowIndex) {
  if (rowIndex === 0) return BACK_AISLE_Z;
  const z0 = RACK_POSITIONS[`RACK-${ROWS[rowIndex - 1]}01`].z;
  const z1 = RACK_POSITIONS[`RACK-${ROWS[rowIndex]}01`].z;
  return (z0 + z1) / 2;
}

function computeRoute(targetRackId, targetShelf) {
  const rackPos  = RACK_POSITIONS[targetRackId];
  if (!rackPos) return [];

  const rowLetter = targetRackId.replace('RACK-', '')[0];
  const rowIndex  = ROWS.indexOf(rowLetter);
  const rack_x    = rackPos.x + RACK_W / 2;
  const rack_z    = rackPos.z;

  const shelf_y   = ((targetShelf ?? 1) - 1) * SHELF_H + SHELF_H * 0.4;
  const face_z    = rack_z - RACK_D / 2 - SHELF_APPROACH;
  const cross_z   = getCrossAisleZ(rowIndex);

  const ex = ENTRY_POINT.x;
  const ez = ENTRY_POINT.z;
  const side_x = RIGHT_AISLE_X;

  return [
    {x: ex, y: FLOOR_Y, z: ez},
    {x: side_x, y: FLOOR_Y, z: ez},
    {x: side_x, y: FLOOR_Y, z: cross_z},
    {x: rack_x, y: FLOOR_Y, z: cross_z},
    {x: rack_x, y: FLOOR_Y, z: face_z},
    {x: rack_x, y: shelf_y, z: face_z},
  ];
}

console.log("ROUTE A05-2:");
console.dir(computeRoute("RACK-A05", 2));

console.log("\nROUTE B04-4:");
console.dir(computeRoute("RACK-B04", 4));
