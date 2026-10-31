// Bara Imambara complex, Lucknow — loosely scaled. 1 unit ≈ 1 m, avatar ≈ 2.2 tall.
// x = east, z = south. Spawn is south of Rumi Darwaza, walking north (-z).
//
//   z=+95  spawn
//   z=+60  Rumi Darwaza (great gate)
//   z=+30  Naubat gate (three arches) + arcaded wings
//   z=-10  hauz (pool) in the great court, Asfi Mosque west, Baoli block east
//   z=-50  Imambara hall front (enterable)

export const SPAWN = { x: 0, z: 95, ry: Math.PI };

/** ?spawn=court|mosque|hall — jump straight to a spot (handy for testing / sharing a link) */
export const SPAWNS: Record<string, { x: number; z: number; ry: number }> = {
  gate: SPAWN,
  court: { x: 0, z: 16, ry: Math.PI },
  mosque: { x: -18, z: -8, ry: -Math.PI / 2 },
  hall: { x: -32, z: -60, ry: Math.PI / 2 },
};

export type Box = { x0: number; x1: number; z0: number; z1: number; h: number };
const box = (x0: number, x1: number, z0: number, z1: number, h = 99): Box => ({ x0, x1, z0, z1, h });

export const PLINTH = { x0: -66, x1: -40, z0: -30, z1: 14, h: 3 };
export const STAIRS = { x0: -40, x1: -31, z0: -20, z1: 4, steps: 9 };
export const HALL_INTERIOR = { x0: -44, x1: 44, z0: -70, z1: -52 };

export const COLLIDERS: Box[] = [
  // Rumi Darwaza: central block with 7-wide opening, wings, end towers
  box(-11, -3.5, 56, 64), box(3.5, 11, 56, 64),
  box(-46, -11, 56.5, 63.5), box(11, 46, 56.5, 63.5),
  // first court side walls
  box(-41, -39, 30, 57), box(39, 41, 30, 57),
  // Naubat gate piers (three openings) + arcaded wings
  box(-15, -9, 26, 34), box(-5, -2.5, 26, 34), box(2.5, 5, 26, 34), box(9, 15, 26, 34),
  box(-74, -15, 28, 32), box(15, 74, 28, 32),
  // great court side walls
  box(-74, -70, -72, 32), box(70, 74, -72, 32),
  // Imambara hall shell (front opening x -4..4)
  box(-46, -4, -52, -50), box(4, 46, -52, -50),
  box(-10, -4, -50, -48), box(4, 10, -50, -48),
  box(-46, 46, -72, -70), box(-46, -44, -72, -50), box(44, 46, -72, -50),
  // hall interior: zarih, mimbar
  box(-3.2, 3.2, -65.2, -60.8), box(-14, -10, -70, -66.5), box(-44, -41.4, -64.2, -57.8),
  // tazia frames along the back wall
  box(-44, 44, -70, -69),
  // Asfi Mosque plinth (walkable top), body, minarets
  box(PLINTH.x0, PLINTH.x1, PLINTH.z0, PLINTH.z1, PLINTH.h),
  box(-64, -50, -24, 8), box(-50, -48.9, -12.5, -3.5), box(-48.9, -45.1, -29.9, -26.1), box(-48.9, -45.1, 10.1, 13.9),
  // Baoli block east
  box(50, 68, -30, 10),
  // hauz rim — low, jumpable
  box(-4.2, 4.2, -14.2, -5.8, 0.6),
];

export const BOUNDS = { x0: -110, x1: 110, z0: -100, z1: 130 };

export function groundHeight(x: number, z: number) {
  if (x >= PLINTH.x0 && x <= PLINTH.x1 && z >= PLINTH.z0 && z <= PLINTH.z1) return PLINTH.h;
  if (x > STAIRS.x0 && x <= STAIRS.x1 && z >= STAIRS.z0 && z <= STAIRS.z1) {
    const t = (STAIRS.x1 - x) / (STAIRS.x1 - STAIRS.x0);
    return (Math.ceil(t * STAIRS.steps) / STAIRS.steps) * PLINTH.h;
  }
  return 0;
}

const R = 0.4; // player radius

/** push a circle out of every box it overlaps; boxes with h are passable when standing above them */
export function resolve(p: { x: number; y: number; z: number }) {
  for (const b of COLLIDERS) {
    if (p.y >= b.h - 0.35) continue;
    const cx = Math.max(b.x0, Math.min(p.x, b.x1));
    const cz = Math.max(b.z0, Math.min(p.z, b.z1));
    const dx = p.x - cx;
    const dz = p.z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 >= R * R) continue;
    if (d2 > 1e-8) {
      const d = Math.sqrt(d2);
      p.x = cx + (dx / d) * R;
      p.z = cz + (dz / d) * R;
    } else {
      // center inside the box — eject along the shallowest axis
      const pen = [p.x - b.x0, b.x1 - p.x, p.z - b.z0, b.z1 - p.z];
      const i = pen.indexOf(Math.min(...pen));
      if (i === 0) p.x = b.x0 - R;
      else if (i === 1) p.x = b.x1 + R;
      else if (i === 2) p.z = b.z0 - R;
      else p.z = b.z1 + R;
    }
  }
  p.x = Math.max(BOUNDS.x0, Math.min(BOUNDS.x1, p.x));
  p.z = Math.max(BOUNDS.z0, Math.min(BOUNDS.z1, p.z));
}

export function inHall(x: number, z: number) {
  const h = HALL_INTERIOR;
  return x > h.x0 && x < h.x1 && z > h.z0 && z < h.z1;
}

function insideAny(x: number, y: number, z: number) {
  for (const b of COLLIDERS) if (y < b.h && x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1) return true;
  return false;
}

/** pull the camera in so it doesn't sit inside walls; keep it under the hall roof when inside */
export function constrainCamera(
  tx: number, ty: number, tz: number,
  cam: { x: number; y: number; z: number },
) {
  const N = 24;
  let f = 1;
  for (let i = 1; i <= N; i++) {
    const k = i / N;
    if (insideAny(tx + (cam.x - tx) * k, ty + (cam.y - ty) * k, tz + (cam.z - tz) * k)) {
      f = Math.max((i - 1.5) / N, 0.08);
      break;
    }
  }
  cam.x = tx + (cam.x - tx) * f;
  cam.y = ty + (cam.y - ty) * f;
  cam.z = tz + (cam.z - tz) * f;
  if (inHall(tx, tz)) {
    const h = HALL_INTERIOR;
    cam.x = Math.max(h.x0 + 0.5, Math.min(h.x1 - 0.5, cam.x));
    cam.z = Math.max(h.z0 + 0.5, Math.min(h.z1 - 0.5, cam.z));
    cam.y = Math.min(cam.y, 17, ty + 3.5);
  }
}
