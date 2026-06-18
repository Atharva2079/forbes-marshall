import React, { useRef, useMemo, useEffect, useState, Component } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import {
  RACK_TYPES,
  PALLET_ROWS,
  PALLET_RACK_W, PALLET_RACK_D, PALLET_RACK_H, PALLET_SHELF_LEVELS, PALLET_SHELF_H,
  BIN_RACK_W, BIN_RACK_D, BIN_RACK_H, BIN_LEVELS,
  CABINET_W, CABINET_D, CABINET_H, CABINET_IDS,
  BLUE_BIN_RACKS, BLUE_BIN_IDS,
  RACK_POSITIONS,
  getRackCols, getRackWorldPosition, getBinRackWorldPosition, getCabinetWorldPosition, getChemicalWorldPosition,
  getRackType,
  WAREHOUSE_W, WAREHOUSE_D,
  ENTRY_POINTS, getClosestEntryPoint, Z_OFFSETS
} from '../lib/warehouseLayout';

/* ─────────────────────────────────────────────────────
   COLOURS  (industrial warehouse palette)
───────────────────────────────────────────────────── */
const C = {
  /* Pallet rack frame */
  postOrange:  0xd45400,
  postTarget:  0x0066cc,
  beam:        0x7a8a9a,
  beamTarget:  0x00aaee,
  deckboard:   0x506070,
  deckTarget:  0x0088bb,
  backPanel:   0x2c3a48,
  backTarget:  0x003d5c,
  load:        0x3d5268,
  loadTarget:  0x004466,
  /* Blue bin */
  binBlue:     0x2563eb,
  binFrame:    0x94a3b8,
  binTargetGlow: 0x60a5fa,
  /* Cabinet */
  cabBody:     0x7c3aed,
  cabDoor:     0x9d6eff,
  cabHandle:   0xc0c0c0,
  cabTargetGlow: 0xa78bfa,
  /* Chemical */
  chemBody:    0xdc2626,
  chemStripe:  0xfbbf24,
  chemTargetGlow: 0xf87171,
  /* Floor */
  concrete:    0xbbc8d4,
  aisleLine:   0xf7c900,
  /* Accents */
  target:      0x0066cc,
  entryGreen:  0x00cc77,
  path:        0x0099dd,
  /* Structural */
  steel:       0x5a6e80,
  stripLight:  0xfff5d6,
};

/* Glow color per rack type */
const GLOW_COLORS = {
  PALLET:   new THREE.Color(0x0066cc),
  BLUE_BIN: new THREE.Color(0x60a5fa),
  CABINET:  new THREE.Color(0xa78bfa),
  CHEMICAL: new THREE.Color(0xf87171),
};

/* ─────────────────────────────────────────────────────
   ERROR BOUNDARY
───────────────────────────────────────────────────── */
class CanvasErrorBoundary extends Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(e) { return { err: e }; }
  render() {
    if (this.state.err) return (
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center', gap:12, background:'#eef2f7', padding:32 }}>
        <div style={{ fontSize:32 }}>⚠</div>
        <div style={{ fontSize:13, color:'#4a6280', fontFamily:'monospace' }}>3D Error — {this.state.err?.message}</div>
        <button onClick={() => this.setState({ err:null })}
          style={{ padding:'6px 16px', background:'#0060b0', border:'none', color:'#fff',
            borderRadius:6, cursor:'pointer', fontSize:12 }}>
          Retry
        </button>
      </div>
    );
    return this.props.children;
  }
}

/* ─────────────────────────────────────────────────────
   CANVAS TEXTURE HELPERS
───────────────────────────────────────────────────── */
function makeLabel(text, bg, fg, w = 128, h = 48) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = fg;
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, w - 2, h - 2);
  ctx.fillStyle = fg;
  ctx.font = `bold ${h * 0.52}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2);
  return new THREE.CanvasTexture(c);
}

function makeConcreteTexture() {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#bbc8d4';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * size, y = Math.random() * size;
    const g = Math.random() * 20 - 10;
    ctx.fillStyle = `rgba(${g > 0 ? '255,255,255' : '0,0,0'},${Math.abs(g) / 80})`;
    ctx.fillRect(x, y, 2, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(12, 14);
  return t;
}

/* ─────────────────────────────────────────────────────
   FLOOR  (concrete + aisle stripes + zone markers)
───────────────────────────────────────────────────── */
function Floor() {
  const cx = WAREHOUSE_W / 2;
  const cz = WAREHOUSE_D / 2;
  const concrete = useMemo(makeConcreteTexture, []);

  // Pallet aisle safety stripes centered along the walking corridors
  const stripes = useMemo(() => {
    const out = [];
    const rows = ['B', 'C', 'E', 'G', 'I', 'K', 'L', 'N', 'P', 'R', 'T', 'V', 'X'];
    rows.forEach(r => {
      const z = Z_OFFSETS[r];
      if (z) out.push(z + 1.25);
    });
    return out;
  }, []);

  return (
    <group>
      {/* Main concrete floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, -0.02, cz]} receiveShadow>
        <planeGeometry args={[WAREHOUSE_W + 16, WAREHOUSE_D + 16]} />
        <meshStandardMaterial map={concrete} roughness={0.92} metalness={0.02} />
      </mesh>

      {/* Yellow aisle safety stripes */}
      {stripes.map((z, i) => (
        <group key={i}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, -0.015, z]}>
            <planeGeometry args={[WAREHOUSE_W * 0.82, 0.9]} />
            <meshStandardMaterial color={0xcdd8e2} roughness={0.95} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, -0.01, z - 0.4]}>
            <planeGeometry args={[WAREHOUSE_W * 0.82, 0.12]} />
            <meshStandardMaterial color={C.aisleLine} roughness={0.8} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, -0.01, z + 0.4]}>
            <planeGeometry args={[WAREHOUSE_W * 0.82, 0.12]} />
            <meshStandardMaterial color={C.aisleLine} roughness={0.8} />
          </mesh>
        </group>
      ))}

      {/* Entry zone floor markings */}
      {ENTRY_POINTS.map(ep => (
        <group key={ep.id}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[ep.x, -0.005, ep.z]}>
            <circleGeometry args={[1.8, 32]} />
            <meshStandardMaterial color={0xd4f0e4} transparent opacity={0.7} roughness={0.9} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[ep.x, -0.003, ep.z]}>
            <ringGeometry args={[1.6, 1.8, 32]} />
            <meshStandardMaterial color={C.entryGreen} roughness={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ─────────────────────────────────────────────────────
   SHARED GEOMETRIES (performance: share across instances)
───────────────────────────────────────────────────── */
const POST_W = 0.08;
const POST_D = 0.06;
const BEAM_H = 0.055;
const DECK_H = 0.025;
const ROW_GAP = 5.0;

/* ─────────────────────────────────────────────────────
   PALLET RACK UNIT  (industrial orange rack)
───────────────────────────────────────────────────── */
function PalletRackUnit({ row, col, isTarget, onClick }) {
  const glowRef = useRef();
  const pos = getRackWorldPosition(row, col);
  const cx  = pos.x + PALLET_RACK_W / 2;
  const rackId = `RACK-${row}${String(col + 1).padStart(2, '0')}`;

  const rowLabel = useMemo(() => makeLabel(row, '#d45400', '#fff', 64, 32), [row]);
  const colLabel = useMemo(() => makeLabel(String(col + 1).padStart(2, '0'), '#1e2c3a', '#f7c900', 64, 32), [col]);

  useFrame(({ clock }) => {
    if (!glowRef.current) return;
    const pulse = Math.sin(clock.getElapsedTime() * 3.5) * 0.5 + 0.5;
    glowRef.current.material.opacity = 0.05 + pulse * 0.2;
    const s = 1 + pulse * 0.03;
    glowRef.current.scale.set(s, s, s);
  });

  const pCol  = isTarget ? C.postTarget  : C.postOrange;
  const bCol  = isTarget ? C.beamTarget  : C.beam;
  const dkCol = isTarget ? C.deckTarget  : C.deckboard;
  const bpCol = isTarget ? C.backTarget  : C.backPanel;
  const ldCol = isTarget ? C.loadTarget  : C.load;

  const px = PALLET_RACK_W / 2 - POST_W / 2;
  const pz = PALLET_RACK_D / 2 - POST_D / 2;
  const shelfY = Array.from({ length: PALLET_SHELF_LEVELS + 1 }, (_, i) => i * PALLET_SHELF_H);

  return (
    <group position={[cx, 0, pos.z]}
      onClick={e => { e.stopPropagation(); onClick?.(rackId, row, col, 'PALLET'); }}
    >
      {/* 4 corner upright posts */}
      {[[-px, -pz], [px, -pz], [-px, pz], [px, pz]].map(([x, z], i) => (
        <mesh key={i} position={[x, PALLET_RACK_H / 2, z]} castShadow>
          <boxGeometry args={[POST_W, PALLET_RACK_H, POST_D]} />
          <meshStandardMaterial color={pCol} roughness={0.4} metalness={0.75}
            emissive={isTarget ? new THREE.Color(C.postTarget) : new THREE.Color(0)}
            emissiveIntensity={isTarget ? 0.2 : 0}
          />
        </mesh>
      ))}

      {/* Cross diagonal bracing on back face */}
      <mesh position={[0, PALLET_RACK_H / 2, -PALLET_RACK_D / 2 + 0.01]}>
        <boxGeometry args={[PALLET_RACK_W - POST_W * 2, PALLET_RACK_H, 0.015]} />
        <meshStandardMaterial color={bpCol} roughness={0.9} metalness={0.1} />
      </mesh>

      {/* Horizontal load beams + shelf decks + product loads */}
      {shelfY.map((y, i) => (
        <group key={i}>
          <mesh position={[0, y + BEAM_H / 2, PALLET_RACK_D / 2 - POST_D]}>
            <boxGeometry args={[PALLET_RACK_W - POST_W * 2, BEAM_H, 0.04]} />
            <meshStandardMaterial color={bCol} roughness={0.5} metalness={0.65}
              emissive={isTarget ? new THREE.Color(C.beamTarget) : new THREE.Color(0)}
              emissiveIntensity={isTarget ? 0.15 : 0}
            />
          </mesh>
          <mesh position={[0, y + BEAM_H / 2, -PALLET_RACK_D / 2 + POST_D]}>
            <boxGeometry args={[PALLET_RACK_W - POST_W * 2, BEAM_H, 0.04]} />
            <meshStandardMaterial color={bCol} roughness={0.5} metalness={0.65} />
          </mesh>

          {i < PALLET_SHELF_LEVELS && (
            <mesh position={[0, y + BEAM_H + DECK_H / 2, 0]}>
              <boxGeometry args={[PALLET_RACK_W - POST_W * 2 - 0.02, DECK_H, PALLET_RACK_D - POST_D * 2]} />
              <meshStandardMaterial color={dkCol} roughness={0.75} metalness={0.3} />
            </mesh>
          )}
          {i < PALLET_SHELF_LEVELS && (
            <mesh position={[0, y + BEAM_H + DECK_H + PALLET_SHELF_H * 0.28, 0]} castShadow>
              <boxGeometry args={[PALLET_RACK_W * 0.78, PALLET_SHELF_H * 0.5, PALLET_RACK_D * 0.65]} />
              <meshStandardMaterial color={ldCol} roughness={0.85} metalness={0.05}
                emissive={isTarget ? new THREE.Color(0x002244) : new THREE.Color(0)}
                emissiveIntensity={isTarget ? 0.4 : 0}
              />
            </mesh>
          )}
        </group>
      ))}

      {/* Top header beam */}
      <mesh position={[0, PALLET_RACK_H + 0.06, 0]}>
        <boxGeometry args={[PALLET_RACK_W, 0.06, PALLET_RACK_D * 0.4]} />
        <meshStandardMaterial color={bCol} roughness={0.5} metalness={0.6} />
      </mesh>

      {/* Row label on first column */}
      {col === 0 && (
        <mesh position={[-PALLET_RACK_W / 2 - 0.22, PALLET_RACK_H * 0.5, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[0.5, 0.25]} />
          <meshStandardMaterial map={rowLabel} transparent roughness={1} metalness={0} />
        </mesh>
      )}

      {/* Column label on floor (first row only) */}
      {row === PALLET_ROWS[0] && (
        <mesh position={[0, 0.005, PALLET_RACK_D / 2 + 0.22]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.45, 0.22]} />
          <meshStandardMaterial map={colLabel} transparent roughness={1} metalness={0} />
        </mesh>
      )}

      {/* Glowing aura for target rack */}
      {isTarget && (
        <mesh ref={glowRef} position={[0, PALLET_RACK_H / 2, 0]}>
          <boxGeometry args={[PALLET_RACK_W + 0.55, PALLET_RACK_H + 0.55, PALLET_RACK_D + 0.55]} />
          <meshStandardMaterial color={GLOW_COLORS.PALLET} transparent opacity={0.1} side={THREE.BackSide} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

/* ─────────────────────────────────────────────────────
   BLUE BIN RACK UNIT  (shorter rack with small blue bins)
───────────────────────────────────────────────────── */
function BinRackUnit({ rackId, col, isTarget, onClick }) {
  const glowRef = useRef();
  const pos = getBinRackWorldPosition(rackId, col);
  const cx  = pos.x + BIN_RACK_W / 2;
  const unitId = `BIN-${rackId}${String(col + 1).padStart(2, '0')}`;

  const label = useMemo(() => makeLabel(`${rackId}`, '#2563eb', '#fff', 64, 32), [rackId]);

  useFrame(({ clock }) => {
    if (!glowRef.current) return;
    const pulse = Math.sin(clock.getElapsedTime() * 3.5) * 0.5 + 0.5;
    glowRef.current.material.opacity = 0.05 + pulse * 0.22;
    const s = 1 + pulse * 0.03;
    glowRef.current.scale.set(s, s, s);
  });

  const frameCol = isTarget ? 0x60a5fa : C.binFrame;
  const binCol   = isTarget ? 0x93c5fd : C.binBlue;

  // Bin grid: 5 cols × BIN_LEVELS rows of small compartments
  const binCols = 5;
  const binH = BIN_RACK_H / BIN_LEVELS;
  const binW = (BIN_RACK_W - 0.1) / binCols;

  return (
    <group position={[cx, 0, pos.z]}
      onClick={e => { e.stopPropagation(); onClick?.(unitId, rackId, col, 'BLUE_BIN'); }}
    >
      {/* Main frame: 4 posts */}
      {[[-1,  -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <mesh key={i} position={[sx * (BIN_RACK_W / 2 - 0.025), BIN_RACK_H / 2, sz * (BIN_RACK_D / 2 - 0.025)]} castShadow>
          <boxGeometry args={[0.05, BIN_RACK_H, 0.05]} />
          <meshStandardMaterial color={frameCol} roughness={0.4} metalness={0.6} />
        </mesh>
      ))}

      {/* Back panel */}
      <mesh position={[0, BIN_RACK_H / 2, -BIN_RACK_D / 2 + 0.01]}>
        <boxGeometry args={[BIN_RACK_W - 0.05, BIN_RACK_H, 0.02]} />
        <meshStandardMaterial color={0x334155} roughness={0.9} metalness={0.1} />
      </mesh>

      {/* Grid of blue bins */}
      {Array.from({ length: BIN_LEVELS }, (_, row) =>
        Array.from({ length: binCols }, (_, bc) => {
          const bx = -BIN_RACK_W / 2 + 0.05 + bc * binW + binW / 2;
          const by = row * binH + binH / 2 + 0.02;
          return (
            <mesh key={`${row}-${bc}`} position={[bx, by, 0.02]}>
              <boxGeometry args={[binW * 0.88, binH * 0.82, BIN_RACK_D * 0.7]} />
              <meshStandardMaterial color={binCol} roughness={0.6} metalness={0.15}
                emissive={isTarget ? new THREE.Color(0x3b82f6) : new THREE.Color(0)}
                emissiveIntensity={isTarget ? 0.35 : 0}
              />
            </mesh>
          );
        })
      )}

      {/* Label on first column */}
      {col === 0 && (
        <mesh position={[-BIN_RACK_W / 2 - 0.18, BIN_RACK_H * 0.5, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[0.45, 0.22]} />
          <meshStandardMaterial map={label} transparent roughness={1} metalness={0} />
        </mesh>
      )}

      {/* Glowing aura */}
      {isTarget && (
        <mesh ref={glowRef} position={[0, BIN_RACK_H / 2, 0]}>
          <boxGeometry args={[BIN_RACK_W + 0.4, BIN_RACK_H + 0.4, BIN_RACK_D + 0.4]} />
          <meshStandardMaterial color={GLOW_COLORS.BLUE_BIN} transparent opacity={0.1} side={THREE.BackSide} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

/* ─────────────────────────────────────────────────────
   CABINET UNIT  (enclosed box with door face)
───────────────────────────────────────────────────── */
function CabinetUnit({ cabinetNum, isTarget, onClick }) {
  const glowRef = useRef();
  const pos = getCabinetWorldPosition(cabinetNum);
  const cx  = pos.x + CABINET_W / 2;
  const unitId = `CAB-${cabinetNum}`;

  const doorLabel = useMemo(() => makeLabel(`C${cabinetNum}`, '#7c3aed', '#fff', 64, 32), [cabinetNum]);

  useFrame(({ clock }) => {
    if (!glowRef.current) return;
    const pulse = Math.sin(clock.getElapsedTime() * 3.5) * 0.5 + 0.5;
    glowRef.current.material.opacity = 0.05 + pulse * 0.22;
    const s = 1 + pulse * 0.03;
    glowRef.current.scale.set(s, s, s);
  });

  const bodyCol = isTarget ? 0x9d6eff : C.cabBody;
  const doorCol = isTarget ? 0xc4b5fd : C.cabDoor;

  return (
    <group position={[cx, 0, pos.z]}
      onClick={e => { e.stopPropagation(); onClick?.(unitId, `cabinet ${cabinetNum}`, cabinetNum, 'CABINET'); }}
    >
      {/* Main body */}
      <mesh position={[0, CABINET_H / 2, 0]} castShadow>
        <boxGeometry args={[CABINET_W, CABINET_H, CABINET_D]} />
        <meshStandardMaterial color={bodyCol} roughness={0.5} metalness={0.3}
          emissive={isTarget ? new THREE.Color(0x7c3aed) : new THREE.Color(0)}
          emissiveIntensity={isTarget ? 0.25 : 0}
        />
      </mesh>

      {/* Door face (front panel, slightly lighter) */}
      <mesh position={[0, CABINET_H / 2, CABINET_D / 2 + 0.005]}>
        <boxGeometry args={[CABINET_W * 0.92, CABINET_H * 0.94, 0.02]} />
        <meshStandardMaterial color={doorCol} roughness={0.45} metalness={0.35} />
      </mesh>

      {/* Door handle */}
      <mesh position={[CABINET_W * 0.3, CABINET_H * 0.5, CABINET_D / 2 + 0.03]}>
        <boxGeometry args={[0.04, 0.18, 0.04]} />
        <meshStandardMaterial color={C.cabHandle} roughness={0.3} metalness={0.85} />
      </mesh>

      {/* Door label */}
      <mesh position={[0, CABINET_H * 0.82, CABINET_D / 2 + 0.02]}>
        <planeGeometry args={[0.4, 0.2]} />
        <meshStandardMaterial map={doorLabel} transparent roughness={1} metalness={0} />
      </mesh>

      {/* Glowing aura */}
      {isTarget && (
        <mesh ref={glowRef} position={[0, CABINET_H / 2, 0]}>
          <boxGeometry args={[CABINET_W + 0.35, CABINET_H + 0.35, CABINET_D + 0.35]} />
          <meshStandardMaterial color={GLOW_COLORS.CABINET} transparent opacity={0.1} side={THREE.BackSide} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

/* ─────────────────────────────────────────────────────
   CHEMICAL CUPBOARD  (enclosed area with warning stripes)
───────────────────────────────────────────────────── */
function ChemicalCupboard({ isTarget }) {
  const glowRef = useRef();
  const pos = getChemicalWorldPosition();

  useFrame(({ clock }) => {
    if (!glowRef.current) return;
    const pulse = Math.sin(clock.getElapsedTime() * 3.5) * 0.5 + 0.5;
    glowRef.current.material.opacity = 0.05 + pulse * 0.22;
    const s = 1 + pulse * 0.03;
    glowRef.current.scale.set(s, s, s);
  });

  const chemW = 3.0;
  const chemD = 2.0;
  const chemH = 2.2;

  const warningTexture = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 128;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(0, 0, 256, 128);
    // Diagonal warning stripes
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 18;
    for (let i = -128; i < 400; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 128, 128);
      ctx.stroke();
    }
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚠ CHEMICAL', 128, 48);
    ctx.fillText('STORAGE', 128, 84);
    return new THREE.CanvasTexture(c);
  }, []);

  return (
    <group position={[pos.x + chemW / 2, 0, pos.z + chemD / 2]}>
      {/* Walls — 3 sides (open front) */}
      {/* Back */}
      <mesh position={[0, chemH / 2, -chemD / 2]}>
        <boxGeometry args={[chemW, chemH, 0.08]} />
        <meshStandardMaterial color={C.chemBody} roughness={0.5} metalness={0.2} />
      </mesh>
      {/* Left */}
      <mesh position={[-chemW / 2, chemH / 2, 0]}>
        <boxGeometry args={[0.08, chemH, chemD]} />
        <meshStandardMaterial color={C.chemBody} roughness={0.5} metalness={0.2} />
      </mesh>
      {/* Right */}
      <mesh position={[chemW / 2, chemH / 2, 0]}>
        <boxGeometry args={[0.08, chemH, chemD]} />
        <meshStandardMaterial color={C.chemBody} roughness={0.5} metalness={0.2} />
      </mesh>

      {/* Warning stripe panel on back wall */}
      <mesh position={[0, chemH / 2, -chemD / 2 + 0.05]}>
        <planeGeometry args={[chemW * 0.9, chemH * 0.7]} />
        <meshStandardMaterial map={warningTexture} roughness={0.8} />
      </mesh>

      {/* Floor marking */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[chemW, chemD]} />
        <meshStandardMaterial color={0xfca5a5} transparent opacity={0.4} />
      </mesh>

      {/* Glowing aura */}
      {isTarget && (
        <mesh ref={glowRef} position={[0, chemH / 2, 0]}>
          <boxGeometry args={[chemW + 0.5, chemH + 0.5, chemD + 0.5]} />
          <meshStandardMaterial color={GLOW_COLORS.CHEMICAL} transparent opacity={0.1} side={THREE.BackSide} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

/* ─────────────────────────────────────────────────────
   CEILING STRUCTURE (overhead steel beams + light strips)
───────────────────────────────────────────────────── */
function CeilingStructure() {
  const ceilH = PALLET_RACK_H + 2.2;

  // Cross-beams at aisle midpoints for the pallet rows
  const beamPositions = useMemo(() => {
    const out = [];
    const allRows = PALLET_ROWS;
    for (let r = 0; r < allRows.length - 1; r++) {
      const z1 = getRackWorldPosition(allRows[r], 0).z;
      const z2 = getRackWorldPosition(allRows[r + 1], 0).z;
      if (z2 - z1 > ROW_GAP + 1) continue;
      out.push((z1 + z2) / 2);
    }
    return out;
  }, []);

  return (
    <group>
      {/* Ceiling crossbeams spanning along Z axis above each aisle */}
      {beamPositions.map((z, i) => (
        <group key={i}>
          <mesh position={[WAREHOUSE_W * 0.3, ceilH, z]}>
            <boxGeometry args={[WAREHOUSE_W * 0.6, 0.12, 0.12]} />
            <meshStandardMaterial color={C.steel} roughness={0.6} metalness={0.75} />
          </mesh>
          <mesh position={[WAREHOUSE_W * 0.3, ceilH - 0.12, z]}>
            <boxGeometry args={[WAREHOUSE_W * 0.6, 0.06, 0.18]} />
            <meshStandardMaterial color={C.stripLight} emissive={new THREE.Color(0xfff8e0)} emissiveIntensity={1.2} />
          </mesh>
          <pointLight position={[WAREHOUSE_W * 0.3, ceilH - 0.2, z]} intensity={0.5} distance={18} color={0xfff5d0} />
        </group>
      ))}
    </group>
  );
}

/* ─────────────────────────────────────────────────────
   ZONE SEPARATORS  (visual dividers between zone groups)
───────────────────────────────────────────────────── */
function PerimeterWalls() {
  // Translucent premium glass walls bounding the pavilion layout
  return (
    <group>
      {/* Back Wall (Z = 0) */}
      <mesh position={[WAREHOUSE_W / 2, 1.8, 0]}>
        <boxGeometry args={[WAREHOUSE_W, 3.6, 0.1]} />
        <meshStandardMaterial color={0xa0b0c0} roughness={0.2} metalness={0.9} transparent opacity={0.22} />
      </mesh>
      {/* Left Wall (X = 0) */}
      <mesh position={[0, 1.8, WAREHOUSE_D / 2]}>
        <boxGeometry args={[0.1, 3.6, WAREHOUSE_D]} />
        <meshStandardMaterial color={0xa0b0c0} roughness={0.2} metalness={0.9} transparent opacity={0.22} />
      </mesh>
      {/* Right Wall (X = WAREHOUSE_W) */}
      <mesh position={[WAREHOUSE_W, 1.8, WAREHOUSE_D / 2]}>
        <boxGeometry args={[0.1, 3.6, WAREHOUSE_D]} />
        <meshStandardMaterial color={0xa0b0c0} roughness={0.2} metalness={0.9} transparent opacity={0.22} />
      </mesh>
    </group>
  );
}

function MezzaninePlatform() {
  // Raised mezzanine deck at the top-left area for blue bin racks V01-V28
  return (
    <group position={[10.5, 1.6, 8.8]}>
      {/* Main Floor Slab */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[19.0, 0.15, 16.5]} />
        <meshStandardMaterial color={0x7f8c9d} roughness={0.7} metalness={0.3} />
      </mesh>
      {/* Steel support columns */}
      {[[ -8.5, -7.5 ], [ 8.5, -7.5 ], [ -8.5, 7.5 ], [ 8.5, 7.5 ], [ 0, -7.5 ], [ 0, 7.5 ]].map(([px, pz], i) => (
        <mesh key={i} position={[px, -1.6, pz]} castShadow>
          <cylinderGeometry args={[0.14, 0.14, 3.2, 8]} />
          <meshStandardMaterial color={C.steel} roughness={0.4} metalness={0.8} />
        </mesh>
      ))}
      {/* Safety Railings (yellow highlight) */}
      <mesh position={[0, 0.5, 8.2]}>
        <boxGeometry args={[19.0, 0.8, 0.05]} />
        <meshStandardMaterial color={0xffc000} transparent opacity={0.5} roughness={0.3} />
      </mesh>
      <mesh position={[9.4, 0.5, 0]}>
        <boxGeometry args={[0.05, 0.8, 16.5]} />
        <meshStandardMaterial color={0xffc000} transparent opacity={0.5} roughness={0.3} />
      </mesh>
    </group>
  );
}

function EntryBeacon({ position, isActive }) {
  const ringRef = useRef();
  const coneRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ringRef.current) {
      const s = 1 + Math.sin(t * 2.5) * 0.3;
      ringRef.current.scale.set(s, 1, s);
      ringRef.current.material.opacity = (isActive ? 0.75 : 0.25) - Math.sin(t * 2.5) * 0.15;
    }
    if (coneRef.current) coneRef.current.position.y = 0.6 + Math.sin(t * 2.5) * 0.15;
  });

  const beaconCol = isActive ? C.entryGreen : 0x64748b;
  return (
    <group position={position}>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.4, 0.65, 32]} />
        <meshStandardMaterial color={beaconCol} transparent opacity={0.45} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={coneRef} position={[0, 0.6, 0]}>
        <coneGeometry args={[0.22, 0.6, 8]} />
        <meshStandardMaterial color={beaconCol} emissive={new THREE.Color(beaconCol)} emissiveIntensity={isActive ? 2.2 : 0.4} />
      </mesh>
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.8, 8]} />
        <meshStandardMaterial color={0x2a3a2a} roughness={0.6} metalness={0.5} />
      </mesh>
    </group>
  );
}

/* ─────────────────────────────────────────────────────
   AISLE ROUTE COMPUTATION — handles all rack types
───────────────────────────────────────────────────── */
const RIGHT_AISLE_X  = 72.0;
const LEFT_AISLE_X   = 6.0;
const FLOOR_Y        = 0.1;
const SHELF_APPROACH = 0.8;

function getAisleZ(rackLetter) {
  const z = Z_OFFSETS[rackLetter] || 0;
  const isBottom = ['B','E','G','I','K','N','P','R','T','V','X','Z'].includes(rackLetter);
  return isBottom ? z + 1.25 : z - 1.25;
}

function computeRoute(targetProduct) {
  if (!targetProduct) return [];

  const loc = targetProduct.locations?.[0];
  if (!loc) return [];

  const rackType = getRackType(targetProduct.primary_rack);
  const pts = [];

  if (rackType === 'PALLET') {
    const rackLetter = loc.rack || targetProduct.primary_rack;
    const colNum = (loc.col_number || 1) - 1;
    const rp = getRackWorldPosition(rackLetter, colNum);
    const rack_x = rp.x;
    const rack_z = rp.z;
    const aisle_z = getAisleZ(rackLetter);
    const isBottom = ['B','E','G','I','K','N','P','R','T','V','X','Z'].includes(rackLetter);
    const face_z = isBottom ? rack_z + SHELF_APPROACH : rack_z - SHELF_APPROACH;

    const closestEntry = getClosestEntryPoint(rack_z);

    pts.push(new THREE.Vector3(closestEntry.x, FLOOR_Y, closestEntry.z));
    pts.push(new THREE.Vector3(RIGHT_AISLE_X, FLOOR_Y, closestEntry.z));
    pts.push(new THREE.Vector3(RIGHT_AISLE_X, FLOOR_Y, aisle_z));
    pts.push(new THREE.Vector3(rack_x, FLOOR_Y, aisle_z));
    pts.push(new THREE.Vector3(rack_x, FLOOR_Y, face_z));

    const binMatch = loc.bin?.match(/B(\d+)/i);
    const shelfLevel = binMatch ? parseInt(binMatch[1], 10) : 1;
    const shelf_y = (shelfLevel - 1) * PALLET_SHELF_H + PALLET_SHELF_H * 0.4;
    pts.push(new THREE.Vector3(rack_x, shelf_y, face_z));

  } else if (rackType === 'BLUE_BIN') {
    const rackId = loc.rack || targetProduct.primary_rack;
    const sectionIndex = parseInt(loc.rack_section || '01', 10) - 1;
    const rp = getBinRackWorldPosition(rackId, sectionIndex);
    const rack_x = rp.x;
    const rack_z = rp.z;

    const closestEntry = getClosestEntryPoint(rack_z);
    const isMezzanine = rp.y > 1.0;

    pts.push(new THREE.Vector3(closestEntry.x, FLOOR_Y, closestEntry.z));
    pts.push(new THREE.Vector3(RIGHT_AISLE_X, FLOOR_Y, closestEntry.z));

    if (isMezzanine) {
      // Route up mezzanine ramp
      pts.push(new THREE.Vector3(RIGHT_AISLE_X, FLOOR_Y, 15.0));
      pts.push(new THREE.Vector3(18.0, FLOOR_Y, 15.0));
      pts.push(new THREE.Vector3(10.0, 3.2, 8.8));
      pts.push(new THREE.Vector3(rack_x, 3.2, rack_z + BIN_RACK_D + SHELF_APPROACH));

      const binMatch = loc.bin?.match(/B(\d+)/i);
      const binLevel = binMatch ? parseInt(binMatch[1], 10) : 1;
      const bin_y = 3.2 + (binLevel - 1) * (BIN_RACK_H / BIN_LEVELS) + (BIN_RACK_H / BIN_LEVELS) * 0.5;
      pts.push(new THREE.Vector3(rack_x, bin_y, rack_z + BIN_RACK_D + SHELF_APPROACH));
    } else {
      // Left vertical V-racks
      pts.push(new THREE.Vector3(RIGHT_AISLE_X, FLOOR_Y, rack_z));
      pts.push(new THREE.Vector3(LEFT_AISLE_X, FLOOR_Y, rack_z));
      pts.push(new THREE.Vector3(rack_x, FLOOR_Y, rack_z));
      pts.push(new THREE.Vector3(rack_x, FLOOR_Y, rack_z + BIN_RACK_D + SHELF_APPROACH));

      const binMatch = loc.bin?.match(/B(\d+)/i);
      const binLevel = binMatch ? parseInt(binMatch[1], 10) : 1;
      const bin_y = (binLevel - 1) * (BIN_RACK_H / BIN_LEVELS) + (BIN_RACK_H / BIN_LEVELS) * 0.5;
      pts.push(new THREE.Vector3(rack_x, bin_y, rack_z + BIN_RACK_D + SHELF_APPROACH));
    }

  } else if (rackType === 'CABINET') {
    const numMatch = targetProduct.primary_rack?.match(/(\d+)/);
    const cabNum = numMatch ? parseInt(numMatch[1], 10) : 1;
    const rp = getCabinetWorldPosition(cabNum);
    const cab_x = rp.x;
    const cab_z = rp.z;

    const closestEntry = getClosestEntryPoint(cab_z);

    pts.push(new THREE.Vector3(closestEntry.x, FLOOR_Y, closestEntry.z));
    pts.push(new THREE.Vector3(RIGHT_AISLE_X, FLOOR_Y, closestEntry.z));
    pts.push(new THREE.Vector3(RIGHT_AISLE_X, FLOOR_Y, cab_z));
    pts.push(new THREE.Vector3(cab_x - CABINET_W - SHELF_APPROACH, FLOOR_Y, cab_z));
    pts.push(new THREE.Vector3(cab_x - CABINET_W - SHELF_APPROACH, CABINET_H * 0.5, cab_z));

  } else if (rackType === 'CHEMICAL') {
    const rp = getChemicalWorldPosition();
    const closestEntry = getClosestEntryPoint(rp.z);
    pts.push(new THREE.Vector3(closestEntry.x, FLOOR_Y, closestEntry.z));
    pts.push(new THREE.Vector3(RIGHT_AISLE_X, FLOOR_Y, closestEntry.z));
    pts.push(new THREE.Vector3(RIGHT_AISLE_X, FLOOR_Y, rp.z));
    pts.push(new THREE.Vector3(LEFT_AISLE_X, FLOOR_Y, rp.z));
    pts.push(new THREE.Vector3(rp.x + 1.5, FLOOR_Y, rp.z));
    pts.push(new THREE.Vector3(rp.x + 1.5, FLOOR_Y, rp.z + 1.0));
  }

  return pts;
}

/* ─────────────────────────────────────────────────────
   NAVIGATION PATH  (animated RED route)
───────────────────────────────────────────────────── */
const RED_PATH   = new THREE.Color(0xee1111);
const RED_BRIGHT = new THREE.Color(0xff4444);
const RED_DARK   = new THREE.Color(0xcc0000);

function NavPath({ targetProduct }) {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef(null);

  const waypoints = useMemo(
    () => computeRoute(targetProduct),
    [targetProduct]
  );

  const drawn = useMemo(() => {
    if (waypoints.length < 2 || progress === 0) return null;
    const total = waypoints.length - 1;
    const cur   = progress * total;
    const idx   = Math.floor(cur);
    const frac  = cur - idx;
    const pts   = waypoints.slice(0, idx + 1);
    if (idx < total) pts.push(waypoints[idx].clone().lerp(waypoints[idx + 1], frac));
    return pts;
  }, [waypoints, progress]);

  const { lineGeo, tubeGeo, head, arrowSegs } = useMemo(() => {
    if (!drawn || drawn.length < 2) return { lineGeo: null, tubeGeo: null, head: null, arrowSegs: [] };
    const curve    = new THREE.CatmullRomCurve3(drawn, false, 'catmullrom', 0.05);
    const pts      = curve.getPoints(120);
    const lineGeo  = new THREE.BufferGeometry().setFromPoints(pts);
    const tubeGeo  = new THREE.TubeGeometry(curve, 120, 0.07, 12, false);
    const head     = drawn[drawn.length - 1];

    const arrowSegs = [];
    for (let i = 0; i < drawn.length - 1; i++) {
      const mid = drawn[i].clone().lerp(drawn[i + 1], 0.55);
      const dir = drawn[i + 1].clone().sub(drawn[i]).normalize();
      arrowSegs.push({ pos: mid, dir });
    }
    return { lineGeo, tubeGeo, head, arrowSegs };
  }, [drawn]);

  useEffect(() => {
    if (!waypoints.length) { setProgress(0); return; }
    setProgress(0);
    let start;
    const duration = 1800;
    const tick = ts => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setProgress(p);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [waypoints]);

  if (!lineGeo || !tubeGeo || !head) return null;

  return (
    <group>
      {/* Floor shadow line */}
      <primitive object={new THREE.Line(
        lineGeo,
        new THREE.LineBasicMaterial({ color: RED_DARK, opacity: 0.4, transparent: true, linewidth: 2 })
      )} />

      {/* Main glowing RED tube */}
      <mesh geometry={tubeGeo}>
        <meshStandardMaterial
          color={RED_PATH}
          emissive={RED_BRIGHT}
          emissiveIntensity={1.8}
          transparent opacity={0.88}
        />
      </mesh>

      {/* Directional arrow markers */}
      {arrowSegs.map(({ pos, dir }, i) => {
        const up   = new THREE.Vector3(0, 1, 0);
        const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
        return (
          <mesh key={i} position={pos} quaternion={quat}>
            <coneGeometry args={[0.11, 0.28, 8]} />
            <meshStandardMaterial color={RED_PATH} emissive={RED_BRIGHT} emissiveIntensity={2.5} />
          </mesh>
        );
      })}

      {/* Travelling dot at head */}
      {progress < 0.97 && <BounceDot position={head} />}

      {/* Arrival marker at target */}
      {progress >= 0.97 && <ArrivalMarker targetProduct={targetProduct} />}
    </group>
  );
}

function BounceDot({ position }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.y = position.y + Math.abs(Math.sin(clock.getElapsedTime() * 8)) * 0.18;
  });
  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.18, 14, 14]} />
      <meshStandardMaterial color={0xff2222} emissive={new THREE.Color(0xff4444)} emissiveIntensity={5} />
    </mesh>
  );
}

function ArrivalMarker({ targetProduct }) {
  const ref = useRef();
  const arrivalPos = useMemo(() => {
    if (!targetProduct) return null;
    const loc = targetProduct.locations?.[0];
    const rackType = getRackType(targetProduct.primary_rack);

    if (rackType === 'PALLET') {
      const col = (loc?.col_number || 1) - 1;
      const rp = getRackWorldPosition(loc?.rack || targetProduct.primary_rack, col);
      return { x: rp.x + PALLET_RACK_W / 2, z: rp.z };
    } else if (rackType === 'BLUE_BIN') {
      const section = parseInt(loc?.rack_section || '01', 10) - 1;
      const rp = getBinRackWorldPosition(loc?.rack || targetProduct.primary_rack, section);
      return { x: rp.x + BIN_RACK_W / 2, z: rp.z };
    } else if (rackType === 'CABINET') {
      const numMatch = targetProduct.primary_rack?.match(/(\d+)/);
      const cabNum = numMatch ? parseInt(numMatch[1], 10) : 1;
      const rp = getCabinetWorldPosition(cabNum);
      return { x: rp.x + CABINET_W / 2, z: rp.z };
    } else {
      const rp = getChemicalWorldPosition();
      return { x: rp.x + 1.5, z: rp.z + 1.0 };
    }
  }, [targetProduct]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    const s = 1 + Math.sin(t * 4) * 0.22;
    ref.current.scale.set(s, 1, s);
    ref.current.material.opacity = 0.55 + Math.sin(t * 4) * 0.2;
  });

  if (!arrivalPos) return null;

  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[arrivalPos.x, 0.05, arrivalPos.z]}>
      <ringGeometry args={[0.55, 0.85, 40]} />
      <meshStandardMaterial color={RED_PATH} emissive={RED_BRIGHT} emissiveIntensity={2}
        transparent opacity={0.65} side={THREE.DoubleSide} />
    </mesh>
  );
}

/* ─────────────────────────────────────────────────────
   CAMERA FLY-TO  — works with any rack type
───────────────────────────────────────────────────── */
function CameraFlyTo({ targetProduct }) {
  const { camera } = useThree();
  const a = useRef({ active: false, elapsed: 0, dur: 2.0,
    sp: new THREE.Vector3(), ep: new THREE.Vector3(),
    sl: new THREE.Vector3(), el: new THREE.Vector3() });
  const prevKey = useRef(null);

  useEffect(() => {
    if (!targetProduct) return;

    // Build a stable key to detect changes
    const loc = targetProduct.locations?.[0];
    const key = `${targetProduct.primary_rack}-${loc?.rack_section || ''}-${loc?.col_number || ''}`;
    if (key === prevKey.current) return;
    prevKey.current = key;

    const rackType = getRackType(targetProduct.primary_rack);
    let tx, ty, tz;

    if (rackType === 'PALLET') {
      const col = (loc?.col_number || 1) - 1;
      const rp = getRackWorldPosition(loc?.rack || targetProduct.primary_rack, col);
      tx = rp.x;
      ty = PALLET_RACK_H / 2;
      tz = rp.z;
    } else if (rackType === 'BLUE_BIN') {
      const section = parseInt(loc?.rack_section || '01', 10) - 1;
      const rp = getBinRackWorldPosition(loc?.rack || targetProduct.primary_rack, section);
      tx = rp.x;
      ty = rp.y + BIN_RACK_H / 2;
      tz = rp.z;
    } else if (rackType === 'CABINET') {
      const numMatch = targetProduct.primary_rack?.match(/(\d+)/);
      const cabNum = numMatch ? parseInt(numMatch[1], 10) : 1;
      const rp = getCabinetWorldPosition(cabNum);
      tx = rp.x;
      ty = CABINET_H / 2;
      tz = rp.z;
    } else {
      const rp = getChemicalWorldPosition();
      tx = rp.x + 1.5;
      ty = 1.0;
      tz = rp.z + 1.0;
    }

    const r = a.current;
    r.sp.copy(camera.position);

    const offset_x = (tx < WAREHOUSE_W / 2) ? 22 : -22;
    r.ep.set(tx + offset_x, 32, Math.max(tz + 24, WAREHOUSE_D * 0.7));

    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    r.sl.copy(camera.position).add(dir.multiplyScalar(20));
    r.el.set(tx, ty, tz);

    r.elapsed = 0; r.active = true;
  }, [targetProduct, camera]);

  useFrame((_, dt) => {
    const r = a.current;
    if (!r.active) return;
    r.elapsed = Math.min(r.elapsed + dt, r.dur);
    const t = smoothstep(r.elapsed / r.dur);

    camera.position.lerpVectors(r.sp, r.ep, t);
    const currentLookTarget = new THREE.Vector3().lerpVectors(r.sl, r.el, t);
    camera.lookAt(currentLookTarget);

    if (r.elapsed >= r.dur) r.active = false;
  });

  return null;
}

function smoothstep(t) { return t * t * (3 - 2 * t); }

/* ─────────────────────────────────────────────────────
   RESOLVE TARGET — determine which rack is the target
───────────────────────────────────────────────────── */
function resolveTargetInfo(targetProduct) {
  if (!targetProduct) return { type: null, rackId: null };

  const rackType = getRackType(targetProduct.primary_rack);
  const loc = targetProduct.locations?.[0];

  if (rackType === 'PALLET') {
    const rackLetter = loc?.rack || targetProduct.primary_rack;
    const col = (loc?.col_number || 1) - 1;
    return { type: 'PALLET', rackLetter, col };
  } else if (rackType === 'BLUE_BIN') {
    const rackId = loc?.rack || targetProduct.primary_rack;
    const section = parseInt(loc?.rack_section || '01', 10) - 1;
    return { type: 'BLUE_BIN', rackId, col: section };
  } else if (rackType === 'CABINET') {
    const numMatch = targetProduct.primary_rack?.match(/(\d+)/);
    const cabinetNum = numMatch ? parseInt(numMatch[1], 10) : 1;
    return { type: 'CABINET', cabinetNum };
  } else if (rackType === 'CHEMICAL') {
    return { type: 'CHEMICAL' };
  }

  return { type: null };
}

/* ─────────────────────────────────────────────────────
   FULL SCENE
───────────────────────────────────────────────────── */
function Scene({ targetProduct, onRackClick }) {
  const target = useMemo(() => resolveTargetInfo(targetProduct), [targetProduct]);
  
  // Find which entry beacon is active for the current target product route
  const activeEntryId = useMemo(() => {
    if (!targetProduct) return 'ENTRY_1';
    const loc = targetProduct.locations?.[0];
    const rackType = getRackType(targetProduct.primary_rack);
    let tz = 0;
    if (rackType === 'PALLET') {
      tz = Z_OFFSETS[loc?.rack || targetProduct.primary_rack] || 0;
    } else if (rackType === 'BLUE_BIN') {
      const section = parseInt(loc?.rack_section || '01', 10) - 1;
      tz = getBinRackWorldPosition(loc?.rack || targetProduct.primary_rack, section).z;
    } else if (rackType === 'CABINET') {
      const numMatch = targetProduct.primary_rack?.match(/(\d+)/);
      tz = getCabinetWorldPosition(numMatch ? parseInt(numMatch[1], 10) : 1).z;
    } else {
      tz = getChemicalWorldPosition().z;
    }
    return getClosestEntryPoint(tz).id;
  }, [targetProduct]);

  return (
    <>
      {/* Lighting rig */}
      <ambientLight intensity={0.55} color={0xd0dce8} />
      <directionalLight
        position={[30, 40, 30]} intensity={1.1} castShadow
        shadow-mapSize-width={2048} shadow-mapSize-height={2048}
        shadow-camera-far={200} shadow-camera-left={-60}
        shadow-camera-right={80} shadow-camera-top={60} shadow-camera-bottom={-60}
      />
      <hemisphereLight skyColor={0xd5e8f5} groundColor={0xa8b8c8} intensity={0.6} />
      {/* Overhead fill lights */}
      <pointLight position={[WAREHOUSE_W * 0.25, 10, WAREHOUSE_D * 0.3]} intensity={0.35} color={0xfff5e0} distance={45} />
      <pointLight position={[WAREHOUSE_W * 0.5, 10, WAREHOUSE_D * 0.5]} intensity={0.35} color={0xfff5e0} distance={45} />
      <pointLight position={[WAREHOUSE_W * 0.25, 10, WAREHOUSE_D * 0.7]} intensity={0.35} color={0xfff5e0} distance={45} />

      <Floor />
      <CeilingStructure />
      <PerimeterWalls />
      <MezzaninePlatform />
      
      {ENTRY_POINTS.map(ep => (
        <EntryBeacon
          key={ep.id}
          position={[ep.x, ep.y, ep.z]}
          isActive={!targetProduct ? ep.id === 'ENTRY_1' : activeEntryId === ep.id}
        />
      ))}

      {/* ── PALLET RACKS (Dynamic columns per row matching layout) ── */}
      {PALLET_ROWS.map(row => {
        const cols = getRackCols(row);
        return Array.from({ length: cols }, (_, c) => (
          <PalletRackUnit
            key={`P-${row}-${c}`}
            row={row} col={c}
            isTarget={target.type === 'PALLET' && target.rackLetter === row && target.col === c}
            onClick={onRackClick}
          />
        ));
      })}

      {/* ── BLUE BIN RACKS (V01-V45 + AC1-AC6) ── */}
      {BLUE_BIN_RACKS.map(rack =>
        Array.from({ length: rack.cols }, (_, c) => (
          <BinRackUnit
            key={`B-${rack.id}-${c}`}
            rackId={rack.id} col={c}
            isTarget={target.type === 'BLUE_BIN' && target.rackId === rack.id && target.col === c}
            onClick={onRackClick}
          />
        ))
      )}

      {/* ── CABINETS ── */}
      {CABINET_IDS.map(num => (
        <CabinetUnit
          key={`C-${num}`}
          cabinetNum={num}
          isTarget={target.type === 'CABINET' && target.cabinetNum === num}
          onClick={onRackClick}
        />
      ))}

      {/* ── CHEMICAL CUPBOARD ── */}
      <ChemicalCupboard isTarget={target.type === 'CHEMICAL'} />

      {/* Navigation path */}
      {targetProduct && <NavPath key={JSON.stringify(targetProduct?.locations?.[0])} targetProduct={targetProduct} />}
      <CameraFlyTo targetProduct={targetProduct} />

      <OrbitControls
        makeDefault enablePan enableZoom enableRotate
        minDistance={4} maxDistance={120}
        maxPolarAngle={Math.PI / 2.02}
        dampingFactor={0.08} enableDamping
      />
    </>
  );
}

/* ─────────────────────────────────────────────────────
   EXPORT
───────────────────────────────────────────────────── */
export default function Warehouse3D({ targetProduct, onRackClick, onLoaded }) {
  return (
    <CanvasErrorBoundary>
      <Canvas
        shadows
        camera={{ position: [WAREHOUSE_W * 0.5, 28, WAREHOUSE_D * 0.8], fov: 48, near: 0.1, far: 350 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
        style={{ background: '#c8d8e8', width: '100%', height: '100%' }}
        onCreated={() => onLoaded?.()}
      >
        <Scene targetProduct={targetProduct} onRackClick={onRackClick} />
      </Canvas>
    </CanvasErrorBoundary>
  );
}
