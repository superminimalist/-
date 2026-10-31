"use client";

import { useRef, useState } from "react";
import type { Input } from "./Players";

/** touch joystick (left) + jump button (right). Writes into a shared input ref. */
export function TouchControls({ input }: { input: React.RefObject<Input> }) {
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const R = 48;

  const update = (cx: number, cy: number) => {
    const r = base.current!.getBoundingClientRect();
    let dx = cx - (r.left + r.width / 2);
    let dy = cy - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy);
    if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R; }
    setKnob({ x: dx, y: dy });
    input.current!.x = dx / R;
    input.current!.y = -dy / R;
  };
  const reset = () => {
    setKnob({ x: 0, y: 0 });
    input.current!.x = 0;
    input.current!.y = 0;
  };

  return (
    <>
      <div
        ref={base}
        className="pointer-events-auto absolute bottom-28 left-6 h-32 w-32 touch-none rounded-full border border-white/20 bg-black/25"
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); update(e.clientX, e.clientY); }}
        onPointerMove={(e) => e.buttons && update(e.clientX, e.clientY)}
        onPointerUp={reset}
        onPointerCancel={reset}
      >
        <div
          className="absolute left-1/2 top-1/2 h-14 w-14 rounded-full bg-white/50"
          style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
        />
      </div>
      <button
        className="pointer-events-auto absolute bottom-32 right-6 h-20 w-20 touch-none rounded-full border border-white/20 bg-black/30 text-2xl text-white"
        onPointerDown={() => { input.current!.jump = true; }}
        onPointerUp={() => { input.current!.jump = false; }}
        onPointerCancel={() => { input.current!.jump = false; }}
        aria-label="jump"
      >
        ⤒
      </button>
    </>
  );
}
