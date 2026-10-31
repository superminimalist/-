import * as THREE from "three";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Buildings } from "@/components/world/Buildings";
import { LocalPlayer, RemotePlayers, type Input } from "@/components/world/Players";
import { KURTA_COLORS } from "@/components/world/Avatar";
import { TouchControls } from "@/components/world/Joystick";
import { inHall } from "@/components/world/layout";
import { useRoom } from "./useRoom";

const LS = "vi.world.profile";
const LABELS = { rumi: "루미 다르와자", naubat: "나우바트 대문", hall: "이맘바르가 대홀", mosque: "아스피 모스크", baoli: "샤히 바올리" };
const COLOR_NAMES: Record<string, string> = {
  "#151515": "검정", "#f2efe8": "흰색", "#1f5c3a": "초록", "#2b3a55": "남색", "#6b2a2a": "적갈색",
};
const PLACES: [string, string][] = [["", "정문"], ["court", "대마당"], ["mosque", "모스크"], ["hall", "대홀"]];

function loadProfile(): { name: string; color: string } {
  try {
    const s = JSON.parse(localStorage.getItem(LS) ?? "{}");
    return { name: typeof s.name === "string" ? s.name : "", color: KURTA_COLORS.includes(s.color) ? s.color : KURTA_COLORS[0] };
  } catch {
    return { name: "", color: KURTA_COLORS[0] };
  }
}

export function App() {
  const [me, setMe] = useState<{ name: string; color: string } | null>(null);
  const [draft, setDraft] = useState(loadProfile);
  const [place, setPlace] = useState(() => location.hash.slice(1));

  if (!me) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0b0d0c] bg-[radial-gradient(ellipse_at_top,#2a3a2e,transparent_60%)] p-6 text-[#e8ece9]">
        <form
          className="w-full max-w-sm space-y-5 rounded-2xl border border-white/10 bg-[#141816]/90 p-7 shadow-2xl"
          onSubmit={(e) => {
            e.preventDefault();
            const name = draft.name.trim().slice(0, 24) || `손님-${Math.floor(Math.random() * 9000 + 1000)}`;
            const p = { name, color: draft.color };
            try { localStorage.setItem(LS, JSON.stringify(p)); } catch {}
            if (place) history.replaceState(null, "", `#${place}`);
            else history.replaceState(null, "", location.pathname + location.search);
            setMe(p);
          }}
        >
          <div>
            <div className="mb-1 flex items-center gap-2 text-xl font-semibold">
              <span className="inline-block h-6 w-1.5 rounded-sm bg-[#2f8f5b]" />
              버츄얼 이맘바르가
            </div>
            <p className="text-sm text-[#8a968f]">러크나우 바라 이맘바라를 함께 걷는 3D 공간</p>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#8a968f]">이름</span>
            <input
              autoFocus
              value={draft.name}
              maxLength={24}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="표시될 이름"
              className="w-full rounded-md border border-[#26302b] bg-[#0b0d0c] px-3 py-2 text-sm outline-none focus:border-[#2f8f5b]"
            />
          </label>
          <div>
            <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-[#8a968f]">쿠르타 색</span>
            <div className="flex gap-2">
              {KURTA_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setDraft({ ...draft, color: c })}
                  title={COLOR_NAMES[c]}
                  className={`h-9 w-9 rounded-full border-2 transition ${draft.color === c ? "scale-110 border-[#c9a24a]" : "border-white/15"}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
          <div>
            <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-[#8a968f]">시작 위치</span>
            <div className="grid grid-cols-4 gap-1.5">
              {PLACES.map(([k, label]) => (
                <button
                  type="button"
                  key={k}
                  onClick={() => setPlace(k)}
                  className={`rounded-md border px-2 py-1.5 text-sm ${place === k ? "border-[#2f8f5b] bg-[#1d3a2a] text-white" : "border-[#26302b] text-[#8a968f]"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <button className="w-full rounded-md bg-[#2f8f5b] py-2.5 font-medium text-white transition hover:brightness-110">입장하기</button>
          <p className="text-xs leading-relaxed text-[#8a968f]">
            WASD 이동 · Shift 달리기 · Space 점프 · 드래그로 시점 · Enter 채팅. 모바일은 화면 조이스틱.
          </p>
        </form>
      </div>
    );
  }
  return <Plaza me={me} onSettings={(p) => setMe(p)} />;
}

function Plaza({ me, onSettings }: { me: { name: string; color: string }; onSettings: (p: { name: string; color: string }) => void }) {
  const { status, peers, targets, bubbles, log, sendPos, sendChat } = useRoom(me);
  const input = useRef<Input>({ x: 0, y: 0, jump: false });
  const chatInput = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState("");
  const [hall, setHall] = useState(false);
  const [inHallNames, setInHallNames] = useState<string[]>([]);
  const [touch, setTouch] = useState(false);
  const [settings, setSettings] = useState(false);

  useEffect(() => setTouch(window.matchMedia("(pointer: coarse)").matches), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && document.activeElement !== chatInput.current) {
        e.preventDefault();
        chatInput.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  // who else is inside the hall
  useEffect(() => {
    if (!hall) return;
    const tick = () =>
      setInHallNames(
        Object.entries(peers)
          .filter(([id]) => {
            const t = targets.current.get(id);
            return t && inHall(t.x, t.z);
          })
          .map(([, p]) => p.name),
      );
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [hall, peers, targets]);

  const online = Object.keys(peers).length + 1;
  const labels = useMemo(() => LABELS, []);

  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-[#a9b6cf]">
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ fov: 60, near: 0.1, far: 900, position: [0, 30, 160] }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
        onCreated={({ scene }) => {
          scene.background = new THREE.Color("#a9b6cf");
          scene.fog = new THREE.Fog("#b9bfcc", 120, 420);
        }}
      >
        <hemisphereLight args={["#dfe6f2", "#9a7a5e", 0.9]} />
        <directionalLight
          position={[-60, 90, 50]}
          intensity={2.4}
          color="#fff1dc"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-120}
          shadow-camera-right={120}
          shadow-camera-top={120}
          shadow-camera-bottom={-120}
          shadow-camera-far={300}
          shadow-bias={-0.0004}
        />
        <Suspense fallback={null}>
          <Buildings labels={labels} indoors={hall} />
          <LocalPlayer name={me.name} color={me.color} bubble={bubbles.me?.text} input={input} onSend={sendPos} onHall={setHall} />
          <RemotePlayers peers={peers} targets={targets} bubbles={bubbles} />
        </Suspense>
      </Canvas>

      <div className="pointer-events-none absolute inset-0 text-white">
        <div className="pointer-events-auto absolute left-3 top-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="flex items-center gap-2 rounded-md bg-black/45 px-3 py-1.5">
            <span className={`h-2 w-2 rounded-full ${status === "online" ? "bg-[#3fbf7a]" : status === "solo" ? "bg-[#8a968f]" : "animate-pulse bg-[#c9a24a]"}`} />
            {status === "solo" ? "혼자 둘러보기" : `${online}명 접속 중`}
          </span>
          <button className="rounded-md bg-black/45 px-3 py-1.5 hover:bg-black/60" onClick={() => setSettings((s) => !s)}>⚙ 설정</button>
        </div>

        {settings && (
          <div className="pointer-events-auto absolute left-3 top-14 w-64 space-y-3 rounded-xl bg-black/75 p-4 text-sm backdrop-blur">
            <label className="block">
              <span className="mb-1 block text-xs text-white/60">이름</span>
              <input
                defaultValue={me.name}
                maxLength={24}
                className="w-full rounded-md border border-white/15 bg-black/40 px-3 py-1.5 outline-none focus:border-[#2f8f5b]"
                onBlur={(e) => {
                  const name = e.target.value.trim();
                  if (name && name !== me.name) {
                    const p = { ...me, name };
                    try { localStorage.setItem(LS, JSON.stringify(p)); } catch {}
                    onSettings(p);
                  }
                }}
              />
            </label>
            <div>
              <span className="mb-1 block text-xs text-white/60">쿠르타 색</span>
              <div className="flex gap-2">
                {KURTA_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      const p = { ...me, color: c };
                      try { localStorage.setItem(LS, JSON.stringify(p)); } catch {}
                      onSettings(p);
                    }}
                    className={`h-8 w-8 rounded-full border-2 ${me.color === c ? "border-[#c9a24a]" : "border-white/20"}`}
                    style={{ background: c }}
                    title={COLOR_NAMES[c]}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {hall && (
          <div className="pointer-events-auto absolute right-3 top-3 w-72 max-w-[calc(100%-1.5rem)] space-y-2 rounded-xl bg-black/70 p-4 backdrop-blur">
            <div className="font-medium">이맘바르가 대홀</div>
            <p className="text-sm text-white/70">
              {inHallNames.length ? `함께 있는 분: ${inHallNames.join(", ")}` : "지금 홀 안에는 혼자 계십니다."}
            </p>
          </div>
        )}

        <div className="pointer-events-auto absolute bottom-3 left-3 w-[24rem] max-w-[calc(100%-1.5rem)]">
          <ul className="mb-2 max-h-48 space-y-1 overflow-y-auto text-sm">
            {log.slice(-8).map((l) => (
              <li key={`${l.id}${l.ts}`} className="w-fit max-w-full rounded bg-black/45 px-2 py-0.5">
                <span className="me-1.5 font-medium text-[#c9a24a]">{l.name}</span>
                <span dir="auto" className="break-words">{l.text}</span>
              </li>
            ))}
          </ul>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendChat(draft);
              setDraft("");
              chatInput.current?.blur();
            }}
          >
            <input
              ref={chatInput}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && chatInput.current?.blur()}
              placeholder="Enter 눌러 채팅…"
              maxLength={200}
              dir="auto"
              className="w-full rounded-md border border-white/15 bg-black/50 px-3 py-2 text-sm outline-none placeholder:text-white/50 focus:border-[#2f8f5b]"
            />
          </form>
        </div>

        {!touch && (
          <div className="absolute bottom-3 right-3 hidden rounded-md bg-black/40 px-3 py-1.5 text-xs text-white/80 md:block">
            WASD 이동 · Shift 달리기 · Space 점프 · 드래그 시점 · 휠 줌 · Enter 채팅
          </div>
        )}
        {touch && <TouchControls input={input} />}
      </div>
    </div>
  );
}
