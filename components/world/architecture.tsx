"use client";

import * as THREE from "three";
import { useLayoutEffect, useMemo, useRef } from "react";
import type { ThreeElements } from "@react-three/fiber";

type G = ThreeElements["group"];

// ───────── palette (from the photos: pink sandstone, lime-plaster cream, weathered domes) ─────────
const std = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra });

export const M = {
  sand: std("#d49a7a"),
  sandDark: std("#b97e62"),
  cream: std("#eadcc2"),
  lime: std("#f1e8d6"),
  dome: std("#c9b79a"),
  shade: std("#2e221c", { roughness: 1 }),
  gold: std("#c9a24a", { metalness: 0.75, roughness: 0.35 }),
  grass: std("#647f3c"),
  water: std("#3f6772", { roughness: 0.15, metalness: 0.2 }),
  black: std("#121212"),
  carpet: std("#3a0e10"),
  green: std("#1f5c3a"),
  trunk: std("#5a4330"),
  leaf: std("#4d6b34"),
  railing: std("#d49a7a", { side: THREE.DoubleSide }),
};

// ───────── arch outline helpers ─────────
/** pointed (four-centred-ish) arch traced from (cx-w/2, y0) up and over to (cx+w/2, y0) */
function traceArch(p: THREE.Path, cx: number, y0: number, w: number, h: number) {
  const hw = w / 2;
  const spring = y0 + Math.max(h - hw * 1.25, h * 0.35);
  const top = y0 + h;
  const ctrl = spring + (top - spring) * 0.85;
  p.lineTo(cx - hw, spring);
  p.quadraticCurveTo(cx - hw, ctrl, cx, top);
  p.quadraticCurveTo(cx + hw, ctrl, cx + hw, spring);
  p.lineTo(cx + hw, y0);
}

export function archShape(w: number, h: number) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  traceArch(s, 0, 0, w, h);
  s.lineTo(-w / 2, 0);
  return s;
}

const archGeoCache = new Map<string, THREE.ShapeGeometry>();
function archGeo(w: number, h: number) {
  const k = `${w}:${h}`;
  let g = archGeoCache.get(k);
  if (!g) archGeoCache.set(k, (g = new THREE.ShapeGeometry(archShape(w, h), 6)));
  return g;
}

/** arch ring (frame) — outer arch minus inner arch, extruded a little */
function archFrameGeo(w: number, h: number, t: number, d: number) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 - t, 0);
  traceArch(s, 0, 0, w + 2 * t, h + t);
  s.lineTo(w / 2, 0);
  // walk back along the inner arch (reverse direction)
  const hw = w / 2;
  const spring = Math.max(h - hw * 1.25, h * 0.35);
  const ctrl = spring + (h - spring) * 0.85;
  s.lineTo(hw, spring);
  s.quadraticCurveTo(hw, ctrl, 0, h);
  s.quadraticCurveTo(-hw, ctrl, -hw, spring);
  s.lineTo(-hw, 0);
  s.lineTo(-w / 2 - t, 0);
  return new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 6 });
}

// ───────── wall with real arched openings cut from the bottom edge ─────────
export type Opening = { x: number; w: number; h: number };

export function ArchedWall({
  w, h, d, openings, material = M.sand, frames = true, ...g
}: { w: number; h: number; d: number; openings: Opening[]; material?: THREE.Material; frames?: boolean } & G) {
  const geo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0);
    for (const o of [...openings].sort((a, b) => a.x - b.x)) {
      s.lineTo(o.x - o.w / 2, 0);
      traceArch(s, o.x, 0, o.w, o.h);
    }
    s.lineTo(w / 2, 0);
    s.lineTo(w / 2, h);
    s.lineTo(-w / 2, h);
    s.lineTo(-w / 2, 0);
    const e = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 8 });
    e.translate(0, 0, -d / 2);
    return e;
  }, [w, h, d, openings]);

  return (
    <group {...g}>
      <mesh geometry={geo} material={material} castShadow receiveShadow />
      {frames &&
        openings.map((o, i) => (
          <group key={i}>
            <ArchFrame w={o.w} h={o.h} position={[o.x, 0, d / 2]} />
            <ArchFrame w={o.w} h={o.h} position={[o.x, 0, -d / 2]} rotation={[0, Math.PI, 0]} />
          </group>
        ))}
    </group>
  );
}

export function ArchFrame({ w, h, t = 0.45, material = M.cream, ...g }: { w: number; h: number; t?: number; material?: THREE.Material } & G) {
  const geo = useMemo(() => archFrameGeo(w, h, t, 0.25), [w, h, t]);
  return (
    <group {...g}>
      <mesh geometry={geo} material={material} castShadow />
    </group>
  );
}

/** row of blind/recessed arches painted onto a facade — instanced, 1–2 draw calls per row */
const frameGeoCache = new Map<string, THREE.ExtrudeGeometry>();
function cachedFrameGeo(w: number, h: number, t: number) {
  const k = `${w}:${h}:${t}`;
  let g = frameGeoCache.get(k);
  if (!g) frameGeoCache.set(k, (g = archFrameGeo(w, h, t, 0.25)));
  return g;
}

export function ArchRow({
  span, count, y, w, h, skip, material = M.shade, framed = false, ...g
}: { span: number; count: number; y: number; w: number; h: number; skip?: number; material?: THREE.Material; framed?: boolean } & G) {
  const xs = useMemo(() => {
    const step = span / count;
    return Array.from({ length: count }, (_, i) => -span / 2 + step * (i + 0.5)).filter((x) => !skip || Math.abs(x) > skip);
  }, [span, count, skip]);
  const arches = useRef<THREE.InstancedMesh>(null);
  const frames = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    xs.forEach((x, i) => {
      m.makeTranslation(x, y, 0.03);
      arches.current?.setMatrixAt(i, m);
      m.makeTranslation(x, y, 0);
      frames.current?.setMatrixAt(i, m);
    });
    if (arches.current) arches.current.instanceMatrix.needsUpdate = true;
    if (frames.current) frames.current.instanceMatrix.needsUpdate = true;
  }, [xs, y]);
  if (xs.length === 0) return null;
  return (
    <group {...g}>
      <instancedMesh ref={arches} args={[archGeo(w, h), material, xs.length]} />
      {framed && <instancedMesh ref={frames} args={[cachedFrameGeo(w, h, 0.2), M.cream, xs.length]} castShadow />}
    </group>
  );
}

// ───────── crenellated parapet (instanced) ─────────
export function Parapet({ length, depth = 0.4, spacing = 1.1, size = 0.55, material = M.cream, ...g }: { length: number; depth?: number; spacing?: number; size?: number; material?: THREE.Material } & G) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const n = Math.max(1, Math.floor(length / spacing));
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    for (let i = 0; i < n; i++) {
      m.makeTranslation(-length / 2 + spacing * (i + 0.5), size / 2, 0);
      ref.current!.setMatrixAt(i, m);
    }
    ref.current!.instanceMatrix.needsUpdate = true;
  }, [n, length, spacing, size]);
  return (
    <group {...g}>
      <mesh position={[0, 0.12, 0]} material={material}>
        <boxGeometry args={[length, 0.24, depth + 0.1]} />
      </mesh>
      <instancedMesh ref={ref} args={[undefined, undefined, n]} material={material} castShadow>
        <boxGeometry args={[size * 0.75, size, depth]} />
      </instancedMesh>
    </group>
  );
}

// ───────── ribbed onion dome (Lucknow style) ─────────
const domeCache = new Map<string, THREE.BufferGeometry>();
function domeGeo(r: number, h: number, ribs: number) {
  const k = `${r}:${h}:${ribs}`;
  const hit = domeCache.get(k);
  if (hit) return hit;
  const pts: THREE.Vector2[] = [];
  const N = 28;
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const bulge = 1 + 0.3 * Math.sin(Math.PI * Math.min(u * 1.55, 1));
    pts.push(new THREE.Vector2(Math.max(r * Math.pow(1 - u, 0.6) * bulge, 0.001), u * h));
  }
  const g = new THREE.LatheGeometry(pts, 64);
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const k2 = 1 + 0.035 * Math.cos(Math.atan2(z, x) * ribs);
    pos.setX(i, x * k2);
    pos.setZ(i, z * k2);
  }
  g.computeVertexNormals();
  domeCache.set(k, g);
  return g;
}

export function Dome({ r, h, ribs = 20, drum = 0, material = M.dome, ...g }: { r: number; h: number; ribs?: number; drum?: number; material?: THREE.Material } & G) {
  return (
    <group {...g}>
      {drum > 0 && (
        <mesh position={[0, drum / 2, 0]} material={M.cream} castShadow>
          <cylinderGeometry args={[r * 0.92, r * 0.95, drum, 24]} />
        </mesh>
      )}
      <mesh geometry={domeGeo(r, h, ribs)} position={[0, drum, 0]} material={material} castShadow />
      <Finial position={[0, drum + h - 0.05, 0]} scale={Math.max(r / 3, 0.35)} />
    </group>
  );
}

export function Finial(g: G) {
  return (
    <group {...g}>
      <mesh position={[0, 0.4, 0]} material={M.gold}><sphereGeometry args={[0.28, 12, 8]} /></mesh>
      <mesh position={[0, 0.9, 0]} material={M.gold}><sphereGeometry args={[0.2, 12, 8]} /></mesh>
      <mesh position={[0, 1.6, 0]} material={M.gold}><coneGeometry args={[0.1, 1.4, 8]} /></mesh>
    </group>
  );
}

// ───────── chhatri (domed pavilion) ─────────
export function Chhatri({ r = 1.2, h = 2.2, n = 6, ...g }: { r?: number; h?: number; n?: number } & G) {
  const pillars = useMemo(() => Array.from({ length: n }, (_, i) => (i / n) * Math.PI * 2), [n]);
  return (
    <group {...g}>
      <mesh position={[0, 0.15, 0]} material={M.cream} castShadow>
        <cylinderGeometry args={[r * 1.1, r * 1.15, 0.3, n]} />
      </mesh>
      {pillars.map((a) => (
        <mesh key={a} position={[Math.cos(a) * r * 0.85, 0.3 + h / 2, Math.sin(a) * r * 0.85]} material={M.cream} castShadow>
          <cylinderGeometry args={[r * 0.08, r * 0.1, h, 6]} />
        </mesh>
      ))}
      <mesh position={[0, 0.3 + h + 0.15, 0]} material={M.cream} castShadow>
        <cylinderGeometry args={[r * 1.15, r * 1.05, 0.3, n]} />
      </mesh>
      <Dome r={r * 0.95} h={r * 1.5} ribs={12} position={[0, 0.6 + h, 0]} />
    </group>
  );
}

// ───────── minaret (Asfi Mosque) ─────────
export function Minaret({ height = 42, r = 1.6, ...g }: { height?: number; r?: number } & G) {
  const seg = (height - 8) / 3;
  const sections = [0, 1, 2].map((i) => {
    const r0 = r * (1 - i * 0.12);
    const r1 = r * (1 - (i + 1) * 0.12);
    return { y: 4 + i * seg, r0, r1 };
  });
  return (
    <group {...g}>
      <mesh position={[0, 2, 0]} material={M.cream} castShadow>
        <cylinderGeometry args={[r * 1.35, r * 1.45, 4, 8]} />
      </mesh>
      {sections.map((s, i) => (
        <group key={i} position={[0, s.y, 0]}>
          <mesh position={[0, seg / 2, 0]} material={i % 2 ? M.sandDark : M.sand} castShadow>
            <cylinderGeometry args={[s.r1, s.r0, seg, 12]} />
          </mesh>
          {/* balcony */}
          <mesh position={[0, seg, 0]} material={M.cream} castShadow>
            <cylinderGeometry args={[s.r1 + 0.75, s.r1 + 0.4, 0.45, 12]} />
          </mesh>
          <mesh position={[0, seg + 0.65, 0]} material={M.railing}>
            <cylinderGeometry args={[s.r1 + 0.7, s.r1 + 0.7, 0.8, 12, 1, true]} />
          </mesh>
        </group>
      ))}
      <Chhatri r={r * 0.75} h={2.2} n={8} position={[0, 4 + seg * 3 + 0.3, 0]} />
    </group>
  );
}

/** small turret with a mini dome — the guldastas lining Lucknow parapets */
export function Guldasta({ h = 2.4, ...g }: { h?: number } & G) {
  return (
    <group {...g}>
      <mesh position={[0, h / 2, 0]} material={M.cream} castShadow>
        <cylinderGeometry args={[0.16, 0.22, h, 8]} />
      </mesh>
      <Dome r={0.3} h={0.55} ribs={8} position={[0, h, 0]} />
    </group>
  );
}

export function Tree(g: G) {
  return (
    <group {...g}>
      <mesh position={[0, 1.5, 0]} material={M.trunk} castShadow>
        <cylinderGeometry args={[0.25, 0.35, 3, 6]} />
      </mesh>
      <mesh position={[0, 4.2, 0]} material={M.leaf} castShadow>
        <icosahedronGeometry args={[2.6, 0]} />
      </mesh>
      <mesh position={[1.2, 3.6, 0.6]} material={M.leaf} castShadow>
        <icosahedronGeometry args={[1.7, 0]} />
      </mesh>
    </group>
  );
}
