"use client";

import * as THREE from "three";
import { useLayoutEffect, useMemo, useRef } from "react";
import type { ThreeElements } from "@react-three/fiber";

type G = ThreeElements["group"];

// Bara Imambara central hall: lime-green stucco walls with white cusped arches,
// dark-wood gallery, fan-vaulted coves, rosette ceiling, chains of lanterns.
// Interior volume: x -44..44, z -70..-52, roof underside y=19.

const X0 = -44, X1 = 44, ZB = -70, ZF = -52;
const LEN = X1 - X0;          // 88
const DEP = ZF - ZB;          // 18
const WALL_H = 11;            // painted wall up to the gallery
const GALLERY_Y = 11;
const COVE_Y = 13.5;          // cove springs here
const COVE_R = 5;             // cove rises to COVE_Y + R = 18.5 (flat ceiling)
const CEIL_Y = COVE_Y + COVE_R;
const ZC = (ZB + ZF) / 2;     // -61

// ───────────────────────── arch geometry shared by canvas + 3D ─────────────────────────
type V = { x: number; y: number };
const qb = (a: V, c: V, b: V, t: number): V => ({
  x: (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * c.x + t * t * b.x,
  y: (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * c.y + t * t * b.y,
});

/** pointed arch, y-up, from left spring to right spring (excluding jambs) */
function pointedArch(cx: number, y0: number, w: number, h: number, n = 24): V[] {
  const hw = w / 2;
  const spring = y0 + Math.max(h - hw * 1.25, h * 0.35);
  const top = y0 + h;
  const ctrl = spring + (top - spring) * 0.85;
  const L0 = { x: cx - hw, y: spring }, LC = { x: cx - hw, y: ctrl }, T = { x: cx, y: top };
  const R0 = { x: cx + hw, y: spring }, RC = { x: cx + hw, y: ctrl };
  const pts: V[] = [];
  for (let i = 0; i <= n; i++) pts.push(qb(L0, LC, T, i / n));
  for (let i = 1; i <= n; i++) pts.push(qb(T, RC, R0, i / n));
  return pts;
}

/** cusped / multifoil arch outline: bottom-left → around → bottom-right (dense polyline, y-up) */
function cuspedArch(cx: number, y0: number, w: number, h: number, lobes: number, depth = 0.22): V[] {
  const base = pointedArch(cx, y0, w, h, 60);
  const hw = w / 2;
  const spring = base[0].y;
  const centre = { x: cx, y: spring };
  // cumulative arc length → evenly spaced cusp points
  const acc = [0];
  for (let i = 1; i < base.length; i++) acc.push(acc[i - 1] + Math.hypot(base[i].x - base[i - 1].x, base[i].y - base[i - 1].y));
  const total = acc[acc.length - 1];
  const at = (s: number) => {
    const i = acc.findIndex((a) => a >= s);
    if (i <= 0) return base[0];
    const f = (s - acc[i - 1]) / (acc[i] - acc[i - 1]);
    return { x: base[i - 1].x + (base[i].x - base[i - 1].x) * f, y: base[i - 1].y + (base[i].y - base[i - 1].y) * f };
  };
  const cusps = Array.from({ length: lobes + 1 }, (_, i) => at((total * i) / lobes));
  const out: V[] = [{ x: cx - hw, y: y0 }];
  for (let i = 0; i < lobes; i++) {
    const a = cusps[i], b = cusps[i + 1];
    const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    let dx = m.x - centre.x, dy = m.y - centre.y;
    const d = Math.hypot(dx, dy) || 1;
    dx /= d; dy /= d;
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    const c = { x: m.x + dx * seg * depth * 2, y: m.y + dy * seg * depth * 2 };
    for (let k = 0; k <= 8; k++) out.push(qb(a, c, b, k / 8));
  }
  out.push({ x: cx + hw, y: y0 });
  return out;
}

// ───────────────────────── canvas textures ─────────────────────────
function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  return { c, ctx };
}

function tex(c: HTMLCanvasElement, rx = 1, ry = 1) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function polyPath(ctx: CanvasRenderingContext2D, pts: V[], close = true) {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  if (close) ctx.closePath();
}

const GREEN = "#a6cc78";
const GREEN_DK = "#86ad5c";
const STUCCO = "#f3f1e6";

/** one wall bay, 8 × 11 units at 64 px/unit. variant: niche (shrine recess) | door (light-filled doorway) */
function drawBay(variant: "niche" | "door") {
  const W = 512, H = 704, U = 64;
  const { c, ctx } = canvas(W, H);
  ctx.save();
  ctx.translate(0, H);
  ctx.scale(1, -1); // y-up, units = px

  ctx.fillStyle = GREEN;
  ctx.fillRect(0, 0, W, H);
  // subtle plaster mottling
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(${Math.random() < 0.5 ? "255,255,240" : "60,80,30"},${Math.random() * 0.05})`;
    ctx.fillRect(Math.random() * W, Math.random() * H, 6 + Math.random() * 20, 6 + Math.random() * 20);
  }
  // pilasters
  ctx.fillStyle = "#c4dba6";
  ctx.fillRect(0, 0, 22, H);
  ctx.fillRect(W - 22, 0, 22, H);
  ctx.strokeStyle = STUCCO;
  ctx.lineWidth = 3;
  [24, W - 24].forEach((x) => { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); });
  // dado
  ctx.fillStyle = GREEN_DK;
  ctx.fillRect(0, 0, W, 0.55 * U);
  ctx.strokeStyle = STUCCO;
  ctx.beginPath(); ctx.moveTo(0, 0.55 * U); ctx.lineTo(W, 0.55 * U); ctx.stroke();

  // main arch
  const cx = W / 2, y0 = 0.55 * U, aw = 4.6 * U, ah = 6.6 * U;
  const outer = cuspedArch(cx, y0, aw + 0.9 * U, ah + 0.6 * U, 9, 0.18);
  const inner = cuspedArch(cx, y0, aw, ah, variant === "door" ? 15 : 11, 0.25);
  // stucco frame
  ctx.fillStyle = STUCCO;
  polyPath(ctx, outer);
  ctx.fill();
  ctx.strokeStyle = "rgba(70,90,50,0.55)";
  ctx.lineWidth = 2;
  ctx.stroke();
  // recess
  const g = ctx.createLinearGradient(0, y0, 0, y0 + ah);
  if (variant === "door") {
    g.addColorStop(0, "#fbfdf6");
    g.addColorStop(0.6, "#eef5df");
    g.addColorStop(1, "#d9e8c2");
  } else {
    g.addColorStop(0, "#d9b25a");    // warm glow of the tazia lamps at the base
    g.addColorStop(0.25, "#7f9f55");
    g.addColorStop(1, "#5f7f40");
  }
  ctx.fillStyle = g;
  polyPath(ctx, inner);
  ctx.fill();
  ctx.strokeStyle = "rgba(60,80,40,0.6)";
  ctx.stroke();
  if (variant === "door") {
    // muqarnas-ish tiers inside the doorway head
    for (let k = 1; k <= 3; k++) {
      const ring = cuspedArch(cx, y0 + ah * 0.55, aw * (1 - k * 0.14), ah * (0.45 - k * 0.07), 9 + k * 2, 0.3);
      ctx.strokeStyle = "rgba(150,170,120,0.8)";
      ctx.lineWidth = 2;
      polyPath(ctx, ring, false);
      ctx.stroke();
    }
    // inner door leaf frame
    ctx.strokeStyle = STUCCO;
    ctx.lineWidth = 6;
    ctx.strokeRect(cx - aw * 0.32, y0, aw * 0.64, ah * 0.5);
  } else {
    // small inner niche
    ctx.fillStyle = "#4f6a35";
    polyPath(ctx, cuspedArch(cx, y0 + 0.4 * U, 1.4 * U, 2.4 * U, 7, 0.25));
    ctx.fill();
  }

  // upper window niche
  const wy = y0 + ah + 1.1 * U;
  ctx.fillStyle = STUCCO;
  polyPath(ctx, cuspedArch(cx, wy - 6, 1.6 * U + 14, 2.2 * U + 12, 7, 0.2));
  ctx.fill();
  ctx.fillStyle = "#62803f";
  polyPath(ctx, cuspedArch(cx, wy, 1.6 * U, 2.2 * U, 7, 0.22));
  ctx.fill();

  // stucco crest scrolls over the arch
  ctx.strokeStyle = STUCCO;
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  const top = y0 + ah + 0.6 * U;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + s * aw * 0.55, top - 1.0 * U);
    ctx.bezierCurveTo(cx + s * aw * 0.6, top + 0.2 * U, cx + s * aw * 0.25, top + 0.1 * U, cx + s * 0.9 * U, top - 0.2 * U);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + s * aw * 0.55, top - 1.0 * U, 10, 0, Math.PI * 2);
    ctx.stroke();
  }
  // lintel moulding
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(22, H - 18); ctx.lineTo(W - 22, H - 18); ctx.stroke();
  ctx.restore();
  return c;
}

/** fan-vault net for the coves. x = wall → ceiling, y = along the hall (one fan module) */
function drawCove() {
  const W = 512, H = 256;
  const { c, ctx } = canvas(W, H);
  ctx.fillStyle = "#e6dcc4";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#3a3630";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  // three tiers of overlapping petal-fans, shrinking toward the ceiling
  const tiers = [
    { x0: 0, x1: 250, span: 128 },
    { x0: 170, x1: 380, span: 64 },
    { x0: 320, x1: 470, span: 42.67 },
  ];
  for (const t of tiers) {
    for (let y = -t.span; y <= H + t.span; y += t.span) {
      for (const off of [0, t.span / 2]) {
        const yc = y + off;
        const hw = t.span * (off ? 0.5 : 0.62);
        // petal outline (pointed arch lying sideways)
        ctx.beginPath();
        ctx.moveTo(t.x0, yc - hw);
        ctx.quadraticCurveTo(t.x0 + (t.x1 - t.x0) * 0.9, yc - hw, t.x1, yc);
        ctx.quadraticCurveTo(t.x0 + (t.x1 - t.x0) * 0.9, yc + hw, t.x0, yc + hw);
        ctx.stroke();
        // ribs
        for (const k of [-0.5, 0, 0.5]) {
          ctx.beginPath();
          ctx.moveTo(t.x0 + 6, yc + k * hw * 0.6);
          ctx.quadraticCurveTo(t.x0 + (t.x1 - t.x0) * 0.6, yc + k * hw * 0.9, t.x1 - 10, yc + k * hw * 0.15);
          ctx.stroke();
        }
      }
    }
  }
  // cornice band where the cove meets the flat ceiling
  ctx.fillStyle = "#cfc3a8";
  ctx.fillRect(W - 30, 0, 30, H);
  ctx.strokeRect(W - 30, -2, 32, H + 4);
  return c;
}

function drawCeiling() {
  const S = 256;
  const { c, ctx } = canvas(S, S);
  ctx.fillStyle = "#ece2ca";
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 300; i++) {
    ctx.fillStyle = `rgba(120,100,70,${Math.random() * 0.04})`;
    ctx.fillRect(Math.random() * S, Math.random() * S, 10 + Math.random() * 30, 10 + Math.random() * 30);
  }
  // one rosette per tile (with chain hook)
  const r = 26;
  ctx.translate(S / 2, S / 2);
  ctx.fillStyle = "#3b352c";
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#e9dfc6";
  for (let k = 0; k < 12; k++) {
    ctx.rotate(Math.PI / 6);
    ctx.beginPath(); ctx.ellipse(0, r * 0.55, 4, 9, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = "#3b352c";
  ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
  return c;
}

function drawFloor() {
  const S = 512;
  const { c, ctx } = canvas(S, S);
  ctx.fillStyle = "#2c2c29";
  ctx.fillRect(0, 0, S, S);
  const n = 4;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const v = 38 + Math.floor(Math.random() * 22);
      ctx.fillStyle = `rgb(${v},${v},${v - 3})`;
      ctx.fillRect(i * (S / n) + 2, j * (S / n) + 2, S / n - 4, S / n - 4);
      for (let k = 0; k < 40; k++) {
        ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.03})`;
        ctx.fillRect(i * (S / n) + Math.random() * (S / n), j * (S / n) + Math.random() * (S / n), 20 + Math.random() * 40, 6 + Math.random() * 14);
      }
    }
  return c;
}

/** wooden jali for the gallery railing / green lattice for the zarih */
function drawLattice(bar: string, cell = 32, thick = 7) {
  const S = 256;
  const { c, ctx } = canvas(S, S);
  ctx.clearRect(0, 0, S, S);
  ctx.strokeStyle = bar;
  ctx.lineWidth = thick;
  for (let i = -S; i <= S * 2; i += cell) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + S, S); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i, S); ctx.lineTo(i + S, 0); ctx.stroke();
  }
  ctx.lineWidth = thick * 2;
  ctx.strokeRect(0, 0, S, S);
  return c;
}

// ───────────────────────── materials (built once, client side) ─────────────────────────
function useMaterials() {
  return useMemo(() => {
    const bayNiche = drawBay("niche");
    const bayDoor = drawBay("door");
    const cove = drawCove();
    const wood = new THREE.MeshStandardMaterial({ color: "#5e2f1d", roughness: 0.7 });
    const coveMat = (flip: boolean, len: number) => {
      const t = tex(cove, flip ? -1 : 1, len / 3.2);
      return new THREE.MeshStandardMaterial({ map: t, side: THREE.DoubleSide, roughness: 0.95 });
    };
    return {
      backWall: new THREE.MeshStandardMaterial({ map: tex(bayNiche, LEN / 8, 1), roughness: 0.9 }),
      endWall: new THREE.MeshStandardMaterial({ map: tex(bayNiche, DEP / 8, 1), roughness: 0.9 }),
      frontWall: new THREE.MeshStandardMaterial({ map: tex(bayDoor, 5, 1), roughness: 0.9 }),
      band: new THREE.MeshStandardMaterial({ color: "#b9d394", roughness: 0.9 }),
      coveBack: coveMat(true, LEN),
      coveFront: coveMat(false, LEN),
      coveEast: coveMat(false, DEP),
      coveWest: coveMat(true, DEP),
      ceiling: new THREE.MeshStandardMaterial({ map: tex(drawCeiling(), (LEN - 2 * COVE_R) / 4, (DEP - 2 * COVE_R) / 4), roughness: 0.95 }),
      floor: new THREE.MeshStandardMaterial({ map: tex(drawFloor(), LEN / 6, DEP / 6), roughness: 0.22, metalness: 0.15 }),
      wood,
      railing: new THREE.MeshStandardMaterial({ map: tex(drawLattice("#5e2f1d", 24, 6), LEN / 1.2, 1), transparent: true, alphaTest: 0.5, side: THREE.DoubleSide }),
      railingEnd: new THREE.MeshStandardMaterial({ map: tex(drawLattice("#5e2f1d", 24, 6), DEP / 1.2, 1), transparent: true, alphaTest: 0.5, side: THREE.DoubleSide }),
      zarihLattice: new THREE.MeshStandardMaterial({ map: tex(drawLattice("#1f6b3e", 28, 8), 3, 1.3), transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.5 }),
      redCarpet: new THREE.MeshStandardMaterial({ color: "#8a1f1a", roughness: 1 }),
      greenRunner: new THREE.MeshStandardMaterial({ color: "#1d5a32", roughness: 1 }),
      canopy: new THREE.MeshStandardMaterial({ color: "#6a3a2a", roughness: 0.9, side: THREE.DoubleSide }),
      brass: new THREE.MeshStandardMaterial({ color: "#c7a24c", metalness: 0.85, roughness: 0.3 }),
      glass: new THREE.MeshStandardMaterial({ color: "#c98a2e", emissive: "#ffb347", emissiveIntensity: 0.9, transparent: true, opacity: 0.8 }),
      tazia: new THREE.MeshStandardMaterial({ color: "#d9b44a", emissive: "#ffcf6a", emissiveIntensity: 1.1, metalness: 0.6, roughness: 0.35 }),
      tomb: new THREE.MeshStandardMaterial({ color: "#123d24", roughness: 0.8 }),
      stucco: new THREE.MeshStandardMaterial({ color: STUCCO, roughness: 0.85 }),
      stepMat: new THREE.MeshStandardMaterial({ color: "#d9e3cc", roughness: 0.8 }),
    };
  }, []);
}

type Mats = ReturnType<typeof useMaterials>;

// ───────────────────────── 3D pieces ─────────────────────────
/** cusped stucco frame around a real opening, extruded */
function CuspedFrame({ w, h, lobes, t = 0.6, material, ...g }: { w: number; h: number; lobes: number; t?: number; material: THREE.Material } & G) {
  const geo = useMemo(() => {
    const outer = pointedArch(0, 0, w + 2 * t, h + t);
    const inner = cuspedArch(0, 0, w - 0.5, h - 0.35, lobes, 0.24).slice(1, -1).reverse();
    const s = new THREE.Shape();
    s.moveTo(-w / 2 - t, 0);
    outer.forEach((p) => s.lineTo(p.x, p.y));
    s.lineTo(w / 2 + t, 0);
    s.lineTo(w / 2 - 0.25, 0);
    inner.forEach((p) => s.lineTo(p.x, p.y));
    s.lineTo(-w / 2 + 0.25, 0);
    s.lineTo(-w / 2 - t, 0);
    return new THREE.ExtrudeGeometry(s, { depth: 0.35, bevelEnabled: false });
  }, [w, h, lobes, t]);
  return (
    <group {...g}>
      <mesh geometry={geo} material={material} castShadow />
    </group>
  );
}

function Cove({ axis, len, thetaStart, material, position }: { axis: "x" | "z"; len: number; thetaStart: number; material: THREE.Material; position: [number, number, number] }) {
  return (
    <mesh position={position} rotation={axis === "x" ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0]} material={material}>
      <cylinderGeometry args={[COVE_R, COVE_R, len, 20, 1, true, thetaStart, Math.PI / 2]} />
    </mesh>
  );
}

function Brackets({ length, ...g }: { length: number } & G) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const n = Math.floor(length / 1.6);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    for (let i = 0; i < n; i++) {
      m.makeTranslation(-length / 2 + 1.6 * (i + 0.5), -0.45, 0.35);
      ref.current!.setMatrixAt(i, m);
    }
    ref.current!.instanceMatrix.needsUpdate = true;
  }, [n, length]);
  return (
    <group {...g}>
      <instancedMesh ref={ref} args={[undefined, undefined, n]}>
        <boxGeometry args={[0.28, 0.7, 0.7]} />
        <meshStandardMaterial color="#4a2416" roughness={0.75} />
      </instancedMesh>
    </group>
  );
}

/** wooden gallery running along a wall. Local +z points into the hall. */
function Gallery({ length, m, end = false, ...g }: { length: number; m: Mats; end?: boolean } & G) {
  return (
    <group {...g}>
      <mesh position={[0, 0, 0.7]} material={m.wood} castShadow receiveShadow>
        <boxGeometry args={[length, 0.45, 1.4]} />
      </mesh>
      <mesh position={[0, 0.3, 1.38]} material={m.wood}>
        <boxGeometry args={[length, 0.12, 0.12]} />
      </mesh>
      <mesh position={[0, 0.75, 1.38]} material={end ? m.railingEnd : m.railing}>
        <planeGeometry args={[length, 0.9]} />
      </mesh>
      <mesh position={[0, 1.22, 1.38]} material={m.wood}>
        <boxGeometry args={[length, 0.1, 0.16]} />
      </mesh>
      <Brackets length={length} />
    </group>
  );
}

function Candelabra({ m, ...g }: { m: Mats } & G) {
  const tiers = [
    { y: 1.5, r: 0.7 },
    { y: 2.3, r: 0.52 },
    { y: 3.0, r: 0.34 },
  ];
  return (
    <group {...g}>
      <mesh position={[0, 0.2, 0]} material={m.greenRunner} castShadow>
        <cylinderGeometry args={[0.8, 0.95, 0.4, 8]} />
      </mesh>
      <mesh position={[0, 1.9, 0]} material={m.brass}>
        <cylinderGeometry args={[0.06, 0.1, 3.4, 8]} />
      </mesh>
      {tiers.map((t) => (
        <group key={t.y} position={[0, t.y, 0]}>
          <mesh material={m.brass} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[t.r, 0.04, 6, 24]} />
          </mesh>
          {Array.from({ length: 6 }, (_, i) => (i / 6) * Math.PI * 2).map((a) => (
            <mesh key={a} position={[Math.cos(a) * t.r, 0.14, Math.sin(a) * t.r]} material={m.glass}>
              <cylinderGeometry args={[0.05, 0.05, 0.25, 6]} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[0, 3.7, 0]} material={m.brass}><coneGeometry args={[0.12, 0.5, 8]} /></mesh>
    </group>
  );
}

/** lantern on a long chain from the ceiling */
function Lantern({ m, drop, ...g }: { m: Mats; drop: number } & G) {
  return (
    <group {...g}>
      <mesh position={[0, -drop / 2, 0]}>
        <cylinderGeometry args={[0.025, 0.025, drop, 4]} />
        <meshStandardMaterial color="#2b2620" metalness={0.6} roughness={0.5} />
      </mesh>
      <group position={[0, -drop, 0]}>
        <mesh position={[0, 0.55, 0]} material={m.brass}><coneGeometry args={[0.4, 0.4, 8]} /></mesh>
        <mesh material={m.glass}><cylinderGeometry args={[0.36, 0.26, 0.9, 8]} /></mesh>
        <mesh position={[0, -0.55, 0]} material={m.brass}><coneGeometry args={[0.2, 0.3, 8]} /></mesh>
      </group>
    </group>
  );
}

function Zarih({ m, ...g }: { m: Mats } & G) {
  const W = 6, D = 4, H = 2.6;
  return (
    <group {...g}>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} material={m.redCarpet} receiveShadow>
        <planeGeometry args={[12, 9]} />
      </mesh>
      <mesh position={[0, 0.15, 0]} material={m.greenRunner}><boxGeometry args={[W + 0.3, 0.3, D + 0.3]} /></mesh>
      <mesh position={[0, 0.3 + H / 2, 0]} material={m.zarihLattice}><boxGeometry args={[W, H, D]} /></mesh>
      <mesh position={[0, 0.3 + H, 0]} material={m.greenRunner}><boxGeometry args={[W + 0.2, 0.18, D + 0.2]} /></mesh>
      <mesh position={[0, 0.9, 0]} material={m.tomb}><boxGeometry args={[2.6, 1.2, 1.4]} /></mesh>
      {/* corner poles + barrel canopy with fringe */}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => (
        <mesh key={`${sx}${sz}`} position={[(sx * W) / 2, 0.3 + H + 0.6, (sz * D) / 2]} material={m.brass}>
          <cylinderGeometry args={[0.05, 0.05, 1.2, 6]} />
        </mesh>
      ))}
      <mesh position={[0, 0.3 + H + 1.2, 0]} rotation={[0, 0, Math.PI / 2]} material={m.canopy} castShadow>
        <cylinderGeometry args={[D / 2 + 0.2, D / 2 + 0.2, W + 0.4, 20, 1, true, -Math.PI / 2, Math.PI]} />
      </mesh>
      {[1, -1].map((s) => (
        <mesh key={s} position={[0, 0.3 + H + 1.05, s * (D / 2 + 0.2)]} material={m.tazia}>
          <boxGeometry args={[W + 0.4, 0.3, 0.05]} />
        </mesh>
      ))}
    </group>
  );
}

function TaziaFrame({ m, ...g }: { m: Mats } & G) {
  return (
    <group {...g}>
      <mesh position={[0, 0.5, 0]} material={m.brass}><boxGeometry args={[1.8, 1, 0.5]} /></mesh>
      <mesh position={[0, 2.6, 0]} material={m.tazia}><boxGeometry args={[1.9, 3.2, 0.18]} /></mesh>
      <mesh position={[0, 2.6, 0.1]}>
        <planeGeometry args={[1.5, 2.8]} />
        <meshStandardMaterial color="#3c2a14" emissive="#7a5418" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

// ───────────────────────── the hall ─────────────────────────
export function HallInterior() {
  const m = useMaterials();
  const lanterns = useMemo(() => {
    const out: [number, number][] = [];
    for (let x = -36; x <= 36; x += 9) out.push([x, ZC - 2.2], [x, ZC + 2.2]);
    return out;
  }, []);
  const tazias = useMemo(() => [-38, -30.7, -23.3, -16, 16, 23.3, 30.7, 38], []);

  return (
    <group>
      {/* floor + runners */}
      <mesh position={[0, 0.02, ZC]} rotation={[-Math.PI / 2, 0, 0]} material={m.floor} receiveShadow>
        <planeGeometry args={[LEN, DEP]} />
      </mesh>
      <mesh position={[0, 0.03, ZB + 1.4]} rotation={[-Math.PI / 2, 0, 0]} material={m.greenRunner}>
        <planeGeometry args={[LEN - 2, 1.6]} />
      </mesh>

      {/* painted stucco walls */}
      <mesh position={[0, WALL_H / 2, ZB + 0.02]} material={m.backWall} receiveShadow>
        <planeGeometry args={[LEN, WALL_H]} />
      </mesh>
      {[-24, 24].map((x) => (
        <mesh key={x} position={[x, WALL_H / 2, ZF - 0.02]} rotation={[0, Math.PI, 0]} material={m.frontWall}>
          <planeGeometry args={[40, WALL_H]} />
        </mesh>
      ))}
      <mesh position={[0, 10.5, ZF - 0.02]} rotation={[0, Math.PI, 0]} material={m.band}>
        <planeGeometry args={[8, 1]} />
      </mesh>
      {[X0, X1].map((x) => (
        <mesh key={x} position={[x + (x < 0 ? 0.02 : -0.02), WALL_H / 2, ZC]} rotation={[0, x < 0 ? Math.PI / 2 : -Math.PI / 2, 0]} material={m.endWall}>
          <planeGeometry args={[DEP, WALL_H]} />
        </mesh>
      ))}
      {/* band between gallery and cove */}
      <mesh position={[0, (GALLERY_Y + COVE_Y) / 2, ZB + 0.03]} material={m.band}><planeGeometry args={[LEN, COVE_Y - GALLERY_Y]} /></mesh>
      <mesh position={[0, (GALLERY_Y + COVE_Y) / 2, ZF - 0.03]} rotation={[0, Math.PI, 0]} material={m.band}><planeGeometry args={[LEN, COVE_Y - GALLERY_Y]} /></mesh>
      {[X0, X1].map((x) => (
        <mesh key={x} position={[x + (x < 0 ? 0.03 : -0.03), (GALLERY_Y + COVE_Y) / 2, ZC]} rotation={[0, x < 0 ? Math.PI / 2 : -Math.PI / 2, 0]} material={m.band}>
          <planeGeometry args={[DEP, COVE_Y - GALLERY_Y]} />
        </mesh>
      ))}

      {/* real doorway from the courtyard — double cusped frame */}
      <CuspedFrame w={8} h={10} lobes={13} material={m.stucco} position={[0, 0, ZF - 0.02]} rotation={[0, Math.PI, 0]} />
      <CuspedFrame w={9.6} h={10.8} lobes={9} t={0.35} material={m.stucco} position={[0, 0, ZF - 0.05]} rotation={[0, Math.PI, 0]} />

      {/* gallery */}
      <Gallery length={LEN} m={m} position={[0, GALLERY_Y, ZB]} />
      <Gallery length={LEN} m={m} position={[0, GALLERY_Y, ZF]} rotation={[0, Math.PI, 0]} />
      <Gallery length={DEP - 2.8} m={m} end position={[X0, GALLERY_Y, ZC]} rotation={[0, Math.PI / 2, 0]} />
      <Gallery length={DEP - 2.8} m={m} end position={[X1, GALLERY_Y, ZC]} rotation={[0, -Math.PI / 2, 0]} />

      {/* fan-vaulted coves + rosette ceiling */}
      <Cove axis="x" len={LEN} thetaStart={Math.PI / 2} material={m.coveBack} position={[0, COVE_Y, ZB + COVE_R]} />
      <Cove axis="x" len={LEN} thetaStart={0} material={m.coveFront} position={[0, COVE_Y, ZF - COVE_R]} />
      <Cove axis="z" len={DEP} thetaStart={Math.PI / 2} material={m.coveEast} position={[X1 - COVE_R, COVE_Y, ZC]} />
      <Cove axis="z" len={DEP} thetaStart={Math.PI} material={m.coveWest} position={[X0 + COVE_R, COVE_Y, ZC]} />
      <mesh position={[0, CEIL_Y - 0.01, ZC]} rotation={[Math.PI / 2, 0, 0]} material={m.ceiling}>
        <planeGeometry args={[LEN - 2 * COVE_R, DEP - 2 * COVE_R]} />
      </mesh>

      {/* furnishings */}
      <Zarih m={m} position={[0, 0, -63]} />
      {[[-6.5, -58.5], [6.5, -58.5], [-6.5, -67], [6.5, -67]].map(([x, z]) => (
        <Candelabra key={`${x}${z}`} m={m} position={[x, 0, z]} />
      ))}
      {tazias.map((x) => <TaziaFrame key={x} m={m} position={[x, 0, ZB + 0.8]} />)}
      {lanterns.map(([x, z]) => <Lantern key={`${x}${z}`} m={m} drop={CEIL_Y - 7.5 - Math.abs(x) * 0.02} position={[x, CEIL_Y, z]} />)}

      {/* mimbar */}
      <group position={[-12, 0, ZB + 1.8]}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} position={[0, 0.3 + i * 0.3, 1 - i * 0.5]} material={m.wood}>
            <boxGeometry args={[3, 0.6 + i * 0.6, 0.6]} />
          </mesh>
        ))}
      </group>
      {/* white steps up to the side chamber (photo, left) */}
      <group position={[X0 + 1.2, 0, ZC]}>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} position={[-0.25 * i, 0.15 + i * 0.3, 0]} material={m.stepMat} receiveShadow>
            <boxGeometry args={[2.4 - i * 0.5, 0.3 + i * 0.6, 6 - i * 0.3]} />
          </mesh>
        ))}
      </group>

      {/* light */}
      {[-30, -10, 10, 30].map((x) => (
        <pointLight key={x} color="#ffd59a" intensity={90} distance={40} decay={1.5} position={[x, 8, ZC]} />
      ))}
      <pointLight color="#ffcf7a" intensity={40} distance={20} decay={1.5} position={[0, 4, ZB + 3]} />
    </group>
  );
}
