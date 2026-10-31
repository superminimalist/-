"use client";

import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";

export const KURTA_COLORS = ["#151515", "#f2efe8", "#1f5c3a", "#2b3a55", "#6b2a2a"] as const;

const skin = new THREE.MeshStandardMaterial({ color: "#c69472", roughness: 0.8 });
const trouser = new THREE.MeshStandardMaterial({ color: "#efece4", roughness: 0.9 });
const cap = new THREE.MeshStandardMaterial({ color: "#f5f3ee", roughness: 0.9 });
const kurtaCache = new Map<string, THREE.MeshStandardMaterial>();
const kurta = (c: string) => {
  let m = kurtaCache.get(c);
  if (!m) kurtaCache.set(c, (m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 })));
  return m;
};

export type Motion = { moving: boolean; airborne: boolean };

/** blocky Roblox-style figure in kurta + topi. Front faces +z. */
export function Avatar({
  color, name, bubble, motion, isMe = false,
}: { color: string; name: string; bubble?: string; motion: React.RefObject<Motion>; isMe?: boolean }) {
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const phase = useRef(0);
  const body = useMemo(() => kurta(color), [color]);
  const trousers = color === "#f2efe8" ? trouser : body;

  useFrame((_, dt) => {
    const m = motion.current;
    const target = m?.airborne ? 0.6 : m?.moving ? 1 : 0;
    phase.current += dt * 10 * (m?.moving ? 1 : 0);
    const swing = m?.airborne ? 0.6 : Math.sin(phase.current) * 0.7 * target;
    legL.current!.rotation.x = THREE.MathUtils.lerp(legL.current!.rotation.x, swing, 0.3);
    legR.current!.rotation.x = THREE.MathUtils.lerp(legR.current!.rotation.x, m?.airborne ? -0.3 : -swing, 0.3);
    armL.current!.rotation.x = THREE.MathUtils.lerp(armL.current!.rotation.x, m?.airborne ? -2.6 : -swing, 0.3);
    armR.current!.rotation.x = THREE.MathUtils.lerp(armR.current!.rotation.x, m?.airborne ? -2.6 : swing, 0.3);
  });

  return (
    <group>
      {/* legs pivot at hip */}
      <group ref={legL} position={[-0.22, 0.85, 0]}>
        <mesh position={[0, -0.42, 0]} material={trousers} castShadow><boxGeometry args={[0.36, 0.85, 0.4]} /></mesh>
      </group>
      <group ref={legR} position={[0.22, 0.85, 0]}>
        <mesh position={[0, -0.42, 0]} material={trousers} castShadow><boxGeometry args={[0.36, 0.85, 0.4]} /></mesh>
      </group>
      {/* long kurta */}
      <mesh position={[0, 1.15, 0]} material={body} castShadow><boxGeometry args={[0.9, 1.0, 0.5]} /></mesh>
      <mesh position={[0, 0.6, 0]} material={body} castShadow><boxGeometry args={[0.95, 0.3, 0.52]} /></mesh>
      {/* arms pivot at shoulder */}
      <group ref={armL} position={[-0.6, 1.58, 0]}>
        <mesh position={[0, -0.4, 0]} material={body} castShadow><boxGeometry args={[0.28, 0.82, 0.32]} /></mesh>
        <mesh position={[0, -0.86, 0]} material={skin}><boxGeometry args={[0.24, 0.14, 0.26]} /></mesh>
      </group>
      <group ref={armR} position={[0.6, 1.58, 0]}>
        <mesh position={[0, -0.4, 0]} material={body} castShadow><boxGeometry args={[0.28, 0.82, 0.32]} /></mesh>
        <mesh position={[0, -0.86, 0]} material={skin}><boxGeometry args={[0.24, 0.14, 0.26]} /></mesh>
      </group>
      {/* head + topi */}
      <mesh position={[0, 1.95, 0]} material={skin} castShadow><boxGeometry args={[0.58, 0.58, 0.58]} /></mesh>
      <mesh position={[-0.12, 2.0, 0.295]}><boxGeometry args={[0.08, 0.08, 0.01]} /><meshBasicMaterial color="#1a1a1a" /></mesh>
      <mesh position={[0.12, 2.0, 0.295]}><boxGeometry args={[0.08, 0.08, 0.01]} /><meshBasicMaterial color="#1a1a1a" /></mesh>
      <mesh position={[0, 2.3, 0]} material={cap} castShadow><cylinderGeometry args={[0.3, 0.31, 0.16, 16]} /></mesh>

      <Html position={[0, 2.6, 0]} zIndexRange={[20, 0]} distanceFactor={14}>
        {/* anchored bottom-centre so a bubble grows upward */}
        <div className="pointer-events-none flex -translate-x-1/2 -translate-y-full select-none flex-col items-center gap-1">
          {bubble && (
            <div dir="auto" className="max-w-[16rem] break-words rounded-xl bg-white px-3 py-1.5 text-center text-sm text-black shadow-lg">
              {bubble}
            </div>
          )}
          <div className={`whitespace-nowrap rounded px-1.5 text-xs ${isMe ? "bg-[#2f8f5b]/80" : "bg-black/50"} text-white`}>{name}</div>
        </div>
      </Html>
    </group>
  );
}
