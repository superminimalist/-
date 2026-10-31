"use client";

import * as THREE from "three";
import { useMemo } from "react";
import { Html } from "@react-three/drei";
import {
  ArchedWall, ArchFrame, ArchRow, Chhatri, Dome, Guldasta, M, Minaret, Parapet, Tree,
} from "./architecture";
import { PLINTH, STAIRS } from "./layout";
import { HallInterior } from "./HallInterior";

export type BuildingLabels = { rumi: string; naubat: string; hall: string; mosque: string; baoli: string };

function Label({ text, position }: { text: string; position: [number, number, number] }) {
  // keep the Html mounted (unmounting drei Html mid-frame throws) — just hide it
  return (
    <Html position={position} center distanceFactor={60} zIndexRange={[10, 0]}>
      <div
        style={{ display: text ? undefined : "none" }}
        className="pointer-events-none select-none whitespace-nowrap rounded-full bg-black/55 px-3 py-1 text-sm text-[#f1e8d6] backdrop-blur"
      >
        {text}
      </div>
    </Html>
  );
}

// ─────────────────────────────── ground ───────────────────────────────
function useTileTexture() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const x = c.getContext("2d")!;
    x.fillStyle = "#c79a7f";
    x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++) {
        const v = 190 + Math.floor(Math.random() * 22);
        x.fillStyle = `rgb(${v},${v - 40},${v - 66})`;
        x.fillRect(i * 64 + 2, j * 64 + 2, 60, 60);
      }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(60, 60);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, []);
}

function Ground() {
  const tex = useTileTexture();
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial map={tex} roughness={0.95} />
      </mesh>
      {/* outer dust beyond the complex */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[1200, 1200]} />
        <meshStandardMaterial color="#a88f74" roughness={1} />
      </mesh>
      {/* parterres in the great court */}
      {[-17, 17].map((x) => (
        <mesh key={x} position={[x, 0.04, -12]} material={M.grass} receiveShadow>
          <boxGeometry args={[18, 0.08, 34]} />
        </mesh>
      ))}
      {/* lawn in the first court */}
      {[-22, 22].map((x) => (
        <mesh key={x} position={[x, 0.04, 45]} material={M.grass} receiveShadow>
          <boxGeometry args={[28, 0.08, 20]} />
        </mesh>
      ))}
    </group>
  );
}

// ─────────────────────────────── Rumi Darwaza ───────────────────────────────
function RumiDarwaza({ label }: { label: string }) {
  return (
    <group position={[0, 0, 60]}>
      <ArchedWall w={22} h={20} d={8} openings={[{ x: 0, w: 7, h: 13 }]} />
      {/* great pishtaq frame + tiers of small arches above the opening (both faces) */}
      {[1, -1].map((s) => (
        <group key={s} position={[0, 0, s * 4]} rotation={[0, s > 0 ? 0 : Math.PI, 0]}>
          <ArchFrame w={11} h={17.5} t={0.6} material={M.lime} />
          <ArchRow span={8} count={5} y={14.2} w={1} h={1.8} />
          <ArchRow span={20} count={2} y={2} w={2.4} h={6} skip={6} framed />
          <ArchRow span={20} count={2} y={10} w={2} h={4} skip={6} framed />
        </group>
      ))}
      <Parapet length={22} depth={8} position={[0, 20, 0]} spacing={1.4} />
      {/* crown: octagonal lantern */}
      <mesh position={[0, 21.5, 0]} material={M.cream} castShadow>
        <cylinderGeometry args={[4.2, 4.6, 3, 8]} />
      </mesh>
      <ArchRow span={6} count={3} y={20.4} w={1.1} h={2} position={[0, 0, 4.0]} />
      <Chhatri r={3} h={3.4} n={8} position={[0, 23, 0]} />
      {/* flanking turrets */}
      {[-11, 11].map((x) => (
        <group key={x} position={[x, 0, 4]}>
          <mesh position={[0, 12, 0]} material={M.sand} castShadow>
            <cylinderGeometry args={[0.8, 1, 24, 8]} />
          </mesh>
          <Chhatri r={0.9} h={1.6} position={[0, 24, 0]} />
        </group>
      ))}
      {/* wings */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 27, 0, 0]}>
          <mesh position={[0, 5, 0]} material={M.sand} castShadow receiveShadow>
            <boxGeometry args={[32, 10, 6]} />
          </mesh>
          {[3, -3].map((z) => (
            <group key={z} position={[0, 0, z]} rotation={[0, z > 0 ? 0 : Math.PI, 0]}>
              <ArchRow span={30} count={7} y={0.6} w={2.4} h={5.4} framed />
              <ArchRow span={30} count={12} y={7} w={1.1} h={2.2} />
            </group>
          ))}
          <Parapet length={32} depth={6} position={[0, 10, 0]} />
          {/* end tower */}
          <group position={[s * 15.5, 0, 0]}>
            <mesh position={[0, 6.5, 0]} material={M.cream} castShadow>
              <cylinderGeometry args={[3, 3.3, 13, 8]} />
            </mesh>
            <Chhatri r={2} h={2.4} n={8} position={[0, 13, 0]} />
          </group>
        </group>
      ))}
      <Label text={label} position={[0, 33, 0]} />
    </group>
  );
}

// ─────────────────────────────── Naubat gate + arcaded wings ───────────────────────────────
function NaubatGate({ label }: { label: string }) {
  const openings = useMemo(() => [
    { x: -7, w: 4, h: 7 },
    { x: 0, w: 5, h: 9 },
    { x: 7, w: 4, h: 7 },
  ], []);
  const domes = useMemo(() => Array.from({ length: 11 }, (_, i) => -25 + i * 5), []);
  return (
    <group position={[0, 0, 30]}>
      <ArchedWall w={30} h={15} d={8} openings={openings} />
      {[1, -1].map((s) => (
        <group key={s} position={[0, 0, s * 4]} rotation={[0, s > 0 ? 0 : Math.PI, 0]}>
          <ArchRow span={26} count={7} y={11} w={1.3} h={2.4} framed />
        </group>
      ))}
      <Parapet length={30} depth={8} position={[0, 15, 0]} />
      {[-14, 14].map((x) => <Chhatri key={x} r={1.4} h={2} position={[x, 15, 3]} />)}
      {[-4, 4].map((x) => <Guldasta key={x} h={3} position={[x, 15, 3.8]} />)}

      {/* long two-storey arcades with a row of ribbed domelets (photo 7) */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 44.5, 0, 0]}>
          <mesh position={[0, 4.5, 0]} material={M.lime} castShadow receiveShadow>
            <boxGeometry args={[59, 9, 4]} />
          </mesh>
          {[2, -2].map((z) => (
            <group key={z} position={[0, 0, z]} rotation={[0, z > 0 ? 0 : Math.PI, 0]}>
              <ArchRow span={57} count={16} y={0.5} w={2} h={4.8} framed />
              <ArchRow span={57} count={24} y={6.2} w={0.9} h={1.8} />
            </group>
          ))}
          <Parapet length={59} depth={4} position={[0, 9, 0]} />
          {domes.map((x) => <Dome key={x} r={1.1} h={1.8} ribs={12} position={[x, 9, 0]} />)}
        </group>
      ))}
      <Label text={label} position={[0, 22, 0]} />
    </group>
  );
}

// ─────────────────────────────── great court walls ───────────────────────────────
function CourtWalls() {
  return (
    <>
      {[-72, 72].map((x) => (
        <group key={x} position={[x, 0, -20]} rotation={[0, Math.PI / 2, 0]}>
          <mesh position={[0, 4.5, 0]} material={M.lime} castShadow receiveShadow>
            <boxGeometry args={[104, 9, 4]} />
          </mesh>
          {[2, -2].map((z) => (
            <group key={z} position={[0, 0, z]} rotation={[0, z > 0 ? 0 : Math.PI, 0]}>
              <ArchRow span={102} count={26} y={0.5} w={2} h={4.8} />
              <ArchRow span={102} count={40} y={6.2} w={0.9} h={1.8} />
            </group>
          ))}
          <Parapet length={104} depth={4} position={[0, 9, 0]} />
        </group>
      ))}
      {/* first court side walls */}
      {[-40, 40].map((x) => (
        <group key={x} position={[x, 0, 43.5]} rotation={[0, Math.PI / 2, 0]}>
          <mesh position={[0, 4, 0]} material={M.sand} castShadow receiveShadow>
            <boxGeometry args={[27, 8, 2]} />
          </mesh>
          <Parapet length={27} depth={2} position={[0, 8, 0]} />
        </group>
      ))}
    </>
  );
}

// ─────────────────────────────── Imambara hall (enterable) ───────────────────────────────
function ImambaraHall({ label }: { label: string }) {
  const door = useMemo(() => [{ x: 0, w: 8, h: 10 }], []);
  const pishtaqDoor = useMemo(() => [{ x: 0, w: 8, h: 11 }], []);
  return (
    <group>
      {/* front wall */}
      <ArchedWall w={92} h={20} d={2} openings={door} frames={false} position={[0, 0, -51]} />
      <group position={[0, 0, -50]}>
        <ArchRow span={88} count={16} y={0.6} w={2.6} h={7} skip={11} framed />
        <ArchRow span={88} count={30} y={11} w={1.3} h={3.2} skip={11} />
        <ArchRow span={88} count={36} y={16.5} w={0.7} h={1.4} skip={11} />
      </group>
      {/* central pishtaq */}
      <ArchedWall w={20} h={25} d={2} openings={pishtaqDoor} position={[0, 0, -49]} material={M.cream} />
      <group position={[0, 0, -48]}>
        <ArchFrame w={13} h={21} t={0.7} material={M.lime} />
        <ArchRow span={10} count={5} y={17.5} w={0.9} h={1.8} />
      </group>
      <Parapet length={20} depth={2} position={[0, 25, -49]} />
      {[-10, 10].map((x) => <Chhatri key={x} r={1.3} h={2} position={[x, 25, -49]} />)}
      {[-5, 0, 5].map((x) => <Guldasta key={x} h={2.8} position={[x, 25, -48.4]} />)}

      {/* back, sides, roof */}
      <mesh position={[0, 10, -71]} material={M.sand} castShadow receiveShadow>
        <boxGeometry args={[92, 20, 2]} />
      </mesh>
      {[-45, 45].map((x) => (
        <mesh key={x} position={[x, 10, -61]} material={M.sand} castShadow receiveShadow>
          <boxGeometry args={[2, 20, 20]} />
        </mesh>
      ))}
      <mesh position={[0, 19.5, -61]} material={M.sandDark} castShadow receiveShadow>
        <boxGeometry args={[92, 1, 22]} />
      </mesh>
      <Parapet length={92} depth={0.5} position={[0, 20, -50.2]} />
      <Parapet length={92} depth={0.5} position={[0, 20, -71.8]} />
      {[-45, -22, 22, 45].map((x) => <Chhatri key={x} r={1.4} h={2.2} position={[x, 20, -51]} />)}
      {[-45, 45].map((x) => <Chhatri key={x} r={1.4} h={2.2} position={[x, 20, -71]} />)}

      <HallInterior />
      <Label text={label} position={[0, 32, -49]} />
    </group>
  );
}

// ─────────────────────────────── Asfi Mosque ───────────────────────────────
function AsfiMosque({ label }: { label: string }) {
  const steps = useMemo(() => Array.from({ length: STAIRS.steps }, (_, i) => i + 1), []);
  const pw = PLINTH.x1 - PLINTH.x0;
  const pl = PLINTH.z1 - PLINTH.z0;
  const pcx = (PLINTH.x0 + PLINTH.x1) / 2;
  const pcz = (PLINTH.z0 + PLINTH.z1) / 2;
  const sw = (STAIRS.x1 - STAIRS.x0) / STAIRS.steps;
  const scz = (STAIRS.z0 + STAIRS.z1) / 2;
  const sl = STAIRS.z1 - STAIRS.z0;
  const guldastas = useMemo(() => [-14, -10, -6, 6, 10, 14], []);

  return (
    <group>
      {/* plinth with arcaded front (photo 1) */}
      <mesh position={[pcx, PLINTH.h / 2, pcz]} material={M.cream} castShadow receiveShadow>
        <boxGeometry args={[pw, PLINTH.h, pl]} />
      </mesh>
      <group position={[PLINTH.x1, 0, pcz]} rotation={[0, Math.PI / 2, 0]}>
        <ArchRow span={pl} count={18} y={0.2} w={1.4} h={2.3} skip={13} />
      </group>
      {steps.map((k) => (
        <mesh key={k} position={[STAIRS.x1 - (k - 0.5) * sw, (k * PLINTH.h) / STAIRS.steps / 2, scz]} material={M.sand} receiveShadow castShadow>
          <boxGeometry args={[sw, (k * PLINTH.h) / STAIRS.steps, sl]} />
        </mesh>
      ))}

      {/* prayer hall — built facing +z locally, rotated to face east */}
      <group position={[-57, PLINTH.h, -8]} rotation={[0, Math.PI / 2, 0]}>
        <mesh position={[0, 6, 0]} material={M.cream} castShadow receiveShadow>
          <boxGeometry args={[32, 12, 14]} />
        </mesh>
        <group position={[0, 0, 7]}>
          <ArchRow span={32} count={7} y={0.4} w={2.6} h={7} skip={4.5} framed />
          <ArchRow span={32} count={14} y={8.8} w={0.9} h={1.8} skip={4.5} />
        </group>
        {/* central pishtaq */}
        <group position={[0, 0, 7.5]}>
          <mesh position={[0, 8, 0]} material={M.lime} castShadow>
            <boxGeometry args={[9, 16, 1]} />
          </mesh>
          <ArchRow span={1} count={1} y={0.4} w={5} h={11} position={[0, 0, 0.5]} />
          <ArchFrame w={5} h={11} t={0.5} material={M.sand} position={[0, 0.4, 0.5]} />
          <Parapet length={9} depth={1} position={[0, 16, 0]} />
          {[-4.5, 4.5].map((x) => <Guldasta key={x} h={4} position={[x, 16, 0]} />)}
        </group>
        <Parapet length={32} depth={0.5} position={[0, 12, 6.8]} />
        {guldastas.map((x) => <Guldasta key={x} h={2.2} position={[x, 12, 6.9]} />)}
        {/* three ribbed domes */}
        <Dome r={5.2} h={9.5} ribs={24} drum={1.6} position={[0, 12, -1]} />
        {[-10, 10].map((x) => <Dome key={x} r={3.6} h={6.6} ribs={20} drum={1.2} position={[x, 12, -1]} />)}
        {[-15.5, 15.5].map((x) =>
          [6.4, -6.4].map((z) => <Chhatri key={`${x}${z}`} r={1.1} h={1.8} position={[x, 12, z]} />),
        )}
      </group>
      <Minaret position={[-47, PLINTH.h, -28]} />
      <Minaret position={[-47, PLINTH.h, 12]} />
      <Label text={label} position={[-50, 34, -8]} />
    </group>
  );
}

// ─────────────────────────────── east block (Shahi Baoli side) ───────────────────────────────
function Baoli({ label }: { label: string }) {
  return (
    <group position={[59, 0, -10]} rotation={[0, -Math.PI / 2, 0]}>
      <mesh position={[0, 6, 0]} material={M.sand} castShadow receiveShadow>
        <boxGeometry args={[40, 12, 18]} />
      </mesh>
      {[9, -9].map((z) => (
        <group key={z} position={[0, 0, z]} rotation={[0, z > 0 ? 0 : Math.PI, 0]}>
          <ArchRow span={38} count={9} y={0.5} w={2.6} h={6} framed />
          <ArchRow span={38} count={16} y={8} w={1.1} h={2.4} />
        </group>
      ))}
      <Parapet length={40} depth={18} position={[0, 12, 0]} />
      {[-19, 19].map((x) => [8, -8].map((z) => <Chhatri key={`${x}${z}`} r={1.3} h={2} position={[x, 12, z]} />))}
      <Label text={label} position={[0, 20, 0]} />
    </group>
  );
}

function Hauz() {
  return (
    <group position={[0, 0, -10]}>
      <mesh position={[0, 0.3, 0]} material={M.cream} castShadow receiveShadow>
        <cylinderGeometry args={[4.2, 4.4, 0.6, 8]} />
      </mesh>
      <mesh position={[0, 0.55, 0]} material={M.water}>
        <cylinderGeometry args={[3.7, 3.7, 0.1, 8]} />
      </mesh>
      <mesh position={[0, 1.2, 0]} material={M.cream}>
        <cylinderGeometry args={[0.3, 0.45, 1.4, 8]} />
      </mesh>
    </group>
  );
}

const TREES: [number, number][] = [
  [-60, 80], [-75, 100], [60, 85], [78, 105], [-90, 40], [92, 30], [-95, -40], [95, -60], [-30, 115], [32, 118],
];

const NO_LABELS: BuildingLabels = { rumi: "", naubat: "", hall: "", mosque: "", baoli: "" };

/** labels are DOM overlays (not occluded) — hide them while indoors */
export function Buildings({ labels, indoors = false }: { labels: BuildingLabels; indoors?: boolean }) {
  if (indoors) labels = NO_LABELS;
  return (
    <group>
      <Ground />
      <RumiDarwaza label={labels.rumi} />
      <NaubatGate label={labels.naubat} />
      <CourtWalls />
      <ImambaraHall label={labels.hall} />
      <AsfiMosque label={labels.mosque} />
      <Baoli label={labels.baoli} />
      <Hauz />
      {TREES.map(([x, z]) => <Tree key={`${x}${z}`} position={[x, 0, z]} />)}
    </group>
  );
}
