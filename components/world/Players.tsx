"use client";

import * as THREE from "three";
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Avatar, type Motion } from "./Avatar";
import { constrainCamera, groundHeight, inHall, resolve, SPAWN, SPAWNS } from "./layout";
import type { Peer, PeerState } from "./usePlaza";

export type Input = { x: number; y: number; jump: boolean }; // joystick / touch input, -1..1

const WALK = 7;
const RUN = 12;
const GRAVITY = 32;
const JUMP = 11;
const SEND_EVERY = 0.125; // 8 Hz
const IDLE_SEND_EVERY = 2;

function useKeys() {
  const keys = useRef(new Set<string>());
  useEffect(() => {
    const typing = () => {
      const el = document.activeElement;
      return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
    };
    const down = (e: KeyboardEvent) => {
      if (typing()) return;
      keys.current.add(e.code);
      if (e.code === "Space") e.preventDefault();
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    const blur = () => keys.current.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);
  return keys;
}

/** third-person orbit: drag to rotate, wheel/pinch to zoom */
function useOrbit() {
  const { gl } = useThree();
  const orbit = useRef({ yaw: 0, pitch: 0.35, dist: 11 });
  useEffect(() => {
    const el = gl.domElement;
    let dragging = false;
    let lx = 0, ly = 0;
    const down = (e: PointerEvent) => {
      dragging = true;
      lx = e.clientX;
      ly = e.clientY;
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const o = orbit.current;
      o.yaw -= (e.clientX - lx) * 0.006;
      o.pitch = THREE.MathUtils.clamp(o.pitch + (e.clientY - ly) * 0.005, -0.55, 1.35);
      lx = e.clientX;
      ly = e.clientY;
    };
    const up = (e: PointerEvent) => {
      dragging = false;
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      orbit.current.dist = THREE.MathUtils.clamp(orbit.current.dist + e.deltaY * 0.01, 3, 40);
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("wheel", wheel);
    };
  }, [gl]);
  return orbit;
}

function lerpAngle(a: number, b: number, t: number) {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

export function LocalPlayer({
  name, color, bubble, input, onSend, onHall,
}: {
  name: string;
  color: string;
  bubble?: string;
  input: React.RefObject<Input>;
  onSend: (s: PeerState) => void;
  onHall: (inside: boolean) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const keys = useKeys();
  const orbit = useOrbit();
  const { camera } = useThree();
  const p = useRef({ x: SPAWN.x, y: 0, z: SPAWN.z, vy: 0, ry: SPAWN.ry, grounded: true });

  useEffect(() => {
    const key = new URLSearchParams(window.location.search).get("spawn") ?? window.location.hash.slice(1);
    const sp = SPAWNS[key];
    if (!sp) return;
    Object.assign(p.current, { x: sp.x, z: sp.z, ry: sp.ry, y: groundHeight(sp.x, sp.z) });
    orbit.current.yaw = sp.ry + Math.PI;
  }, [orbit]);
  const motion = useRef<Motion>({ moving: false, airborne: false });
  const sendT = useRef(0);
  const lastSent = useRef("");
  const lastSentAt = useRef(0);
  const hall = useRef(false);
  const camPos = useRef(new THREE.Vector3());
  const camTarget = useRef(new THREE.Vector3());

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const k = keys.current;
    const s = p.current;
    const o = orbit.current;

    // input → camera-relative direction
    let ix = (k.has("KeyD") || k.has("ArrowRight") ? 1 : 0) - (k.has("KeyA") || k.has("ArrowLeft") ? 1 : 0);
    let iz = (k.has("KeyW") || k.has("ArrowUp") ? 1 : 0) - (k.has("KeyS") || k.has("ArrowDown") ? 1 : 0);
    ix += input.current?.x ?? 0;
    iz += input.current?.y ?? 0;
    const len = Math.hypot(ix, iz);
    if (len > 1) { ix /= len; iz /= len; }
    const moving = len > 0.05;
    const speed = k.has("ShiftLeft") || k.has("ShiftRight") ? RUN : WALK;
    const fx = -Math.sin(o.yaw), fz = -Math.cos(o.yaw);   // forward
    const rx = Math.cos(o.yaw), rz = -Math.sin(o.yaw);    // right
    const dx = (fx * iz + rx * ix) * speed;
    const dz = (fz * iz + rz * ix) * speed;

    s.x += dx * dt;
    s.z += dz * dt;
    resolve(s);

    // vertical
    const g = groundHeight(s.x, s.z);
    if ((k.has("Space") || input.current?.jump) && s.grounded) {
      s.vy = JUMP;
      s.grounded = false;
    }
    s.vy -= GRAVITY * dt;
    s.y += s.vy * dt;
    if (s.y <= g) {
      s.y = g;
      s.vy = 0;
      s.grounded = true;
    } else if (s.grounded && s.y - g < 0.5 && s.vy <= 0) {
      s.y = g; // walking down stairs — stick to the step
      s.vy = 0;
    } else {
      s.grounded = false;
    }

    if (moving) s.ry = lerpAngle(s.ry, Math.atan2(dx, dz), 1 - Math.exp(-14 * dt));
    motion.current.moving = moving && s.grounded;
    motion.current.airborne = !s.grounded;

    group.current!.position.set(s.x, s.y, s.z);
    group.current!.rotation.y = s.ry;

    // camera
    camTarget.current.set(s.x, s.y + 2.2, s.z);
    const cp = Math.cos(o.pitch);
    camPos.current.set(
      s.x + Math.sin(o.yaw) * cp * o.dist,
      Math.max(s.y + 2.2 + Math.sin(o.pitch) * o.dist, 0.6),
      s.z + Math.cos(o.yaw) * cp * o.dist,
    );
    constrainCamera(s.x, s.y + 2.2, s.z, camPos.current);
    camera.position.lerp(camPos.current, 1 - Math.exp(-12 * dt));
    camera.lookAt(camTarget.current);

    // zone
    const nowIn = inHall(s.x, s.z);
    if (nowIn !== hall.current) {
      hall.current = nowIn;
      onHall(nowIn);
    }

    // network
    sendT.current += dt;
    if (sendT.current >= SEND_EVERY) {
      sendT.current = 0;
      const snap: PeerState = {
        x: +s.x.toFixed(2), y: +s.y.toFixed(2), z: +s.z.toFixed(2), ry: +s.ry.toFixed(2),
        moving: motion.current.moving, airborne: motion.current.airborne,
      };
      const key = JSON.stringify(snap);
      const t = state.clock.elapsedTime;
      if (key !== lastSent.current || t - lastSentAt.current > IDLE_SEND_EVERY) {
        lastSent.current = key;
        lastSentAt.current = t;
        onSend(snap);
      }
    }
  });

  return (
    <group ref={group}>
      <Avatar color={color} name={name} bubble={bubble} motion={motion} isMe />
    </group>
  );
}

function RemotePlayer({ id, peer, bubble, targets }: { id: string; peer: Peer; bubble?: string; targets: React.RefObject<Map<string, PeerState>> }) {
  const group = useRef<THREE.Group>(null);
  const motion = useRef<Motion>({ moving: false, airborne: false });
  const placed = useRef(false);

  useFrame((_, dt) => {
    const t = targets.current?.get(id);
    const g = group.current!;
    if (!t) {
      g.visible = false;
      return;
    }
    g.visible = true;
    if (!placed.current) {
      g.position.set(t.x, t.y, t.z);
      g.rotation.y = t.ry;
      placed.current = true;
    }
    const a = 1 - Math.exp(-10 * Math.min(dt, 0.05));
    g.position.x += (t.x - g.position.x) * a;
    g.position.y += (t.y - g.position.y) * a;
    g.position.z += (t.z - g.position.z) * a;
    g.rotation.y = lerpAngle(g.rotation.y, t.ry, a);
    motion.current.moving = t.moving;
    motion.current.airborne = t.airborne;
  });

  return (
    <group ref={group} visible={false}>
      <Avatar color={peer.color} name={peer.name} bubble={bubble} motion={motion} />
    </group>
  );
}

export function RemotePlayers({
  peers, targets, bubbles,
}: {
  peers: Record<string, Peer>;
  targets: React.RefObject<Map<string, PeerState>>;
  bubbles: Record<string, { text: string }>;
}) {
  return (
    <>
      {Object.entries(peers).map(([id, peer]) => (
        <RemotePlayer key={id} id={id} peer={peer} bubble={bubbles[id]?.text} targets={targets} />
      ))}
    </>
  );
}
