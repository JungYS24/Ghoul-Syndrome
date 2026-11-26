// 실시간 모드 대륙 지도 (SVG). 게임 시계(턴·날짜)에 맞춰 조금씩 변합니다.
// - 오염: 지역 감염도가 오를수록 반점이 늘고 커지며, 연두색 → 진한 초록으로 짙어짐
// - 상단(금색 점)은 육상 교역로를, 선박은 해상 항로를 따라 날짜가 흐를 때만 움직임
// - 지나는 지역 감염도가 높으면 교역로가 끊겨(붉은 점선) 상단이 사라짐
// - 우리 세력 영토로 확대해 보여 주고, 버튼으로 대륙 전체를 볼 수 있음
// - 지도 위에서 휠(트랙패드 스크롤)로 확대·축소, 누른 채 끌면 이동
import { useEffect, useRef, useState } from "react";
import { CITIES as ENGINE_CITIES, FACTIONS, infStage, seasonOf, type FactionId, type GameState, type RegionId } from "@guul/engine";
import { useGame } from "../store/store";
import { regionCollapsed } from "./mapShade";
import { MAP_H as H, MAP_W as W, clampView, panBy, polyPath, voronoiCell, zoomAt, type View } from "./mapView";

/** 지도에 그리는 세 땅 (부두교는 라벤 폐허=중립지에 숨어 있음) */
type Zone = Extract<RegionId, "iruth" | "neutral" | "arkandal">;

const COAST = "M120,110 C200,70 320,95 400,78 C480,62 560,90 640,72 C720,58 800,84 870,110 C920,140 935,200 920,260 C945,330 930,420 940,500 C948,580 900,640 830,660 C740,690 640,672 560,690 C470,705 380,680 300,690 C210,700 130,670 95,610 C60,550 75,470 62,400 C50,320 80,250 70,190 C66,150 85,125 120,110 Z";
const BORDER = "M480,262 L470,340 L455,450 L470,560 L440,720";
const REGION: Record<Zone, { d: string; fill: string; name: string; label: [number, number] }> = {
  iruth: { d: "M0,0 H1000 V250 C900,262 820,240 740,258 C640,276 560,250 480,262 C380,276 300,250 200,266 C120,276 60,258 0,262 Z", fill: "#a9c3c9", name: "아이루스 공국", label: [560, 205] },
  neutral: { d: "M0,262 C60,258 120,276 200,266 C300,250 380,276 480,262 L470,340 L455,450 L470,560 L440,720 H0 Z", fill: "#5b4868", name: "라벤 폐허", label: [235, 470] },
  arkandal: { d: "M480,262 C560,250 640,276 740,258 C820,240 900,262 1000,250 V720 H440 L470,560 L455,450 L470,340 Z", fill: "#86352e", name: "아르칸달 군국", label: [700, 380] },
};
const ORDER: Zone[] = ["iruth", "neutral", "arkandal"];

// 오염 반점: [x, y, 기본 반지름, 나타나기 시작하는 감염도]
const BLOBS: Record<Zone, [number, number, number, number][]> = {
  neutral: [[360, 440, 70, 0], [280, 380, 60, 12], [420, 520, 60, 22], [220, 520, 70, 32], [160, 420, 55, 42], [300, 610, 62, 52], [400, 330, 50, 62], [130, 600, 55, 72], [110, 320, 50, 82]],
  iruth: [[330, 228, 50, 4], [450, 205, 55, 18], [220, 185, 50, 30], [600, 212, 55, 42], [720, 172, 50, 54], [380, 130, 45, 66], [830, 200, 50, 78], [160, 130, 45, 88]],
  arkandal: [[525, 335, 55, 4], [560, 450, 60, 18], [620, 565, 60, 30], [700, 360, 50, 42], [785, 470, 55, 54], [850, 590, 50, 66], [720, 640, 50, 76], [880, 330, 45, 86]],
};

// 도시는 엔진이 주인을 관리합니다(전쟁으로 바뀜). 지역(Zone)은 처음 주인으로 정합니다.
const ZONE_OF: Record<FactionId, Zone> = { arkandal: "arkandal", iruth: "iruth", voodoo: "neutral" };
const CITIES = ENGINE_CITIES.map((c) => ({ ...c, region: ZONE_OF[c.owner] }));
const OWNER_FILL: Record<FactionId, string> = { arkandal: "#86352e", iruth: "#a9c3c9", voodoo: "#5b4868" };
const OWNER_RING: Record<FactionId, string> = { arkandal: "#e0705a", iruth: "#cfe6ee", voodoo: "#c9a2f2" };
// 도시 영향권 (보로노이 칸) — 주인이 바뀐 도시의 땅을 새 주인 색으로 칠할 때 씀
const CELLS = CITIES.map((_, i) => polyPath(voronoiCell(CITIES.map((c) => [c.x, c.y] as [number, number]), i)));

// 교역로: via = 지나는 지역(감염도 80 이상이면 끊김)
interface Route { id: string; d: string; via: Zone[]; days: number; n: number }
const LAND: Route[] = [
  { id: "r-north", d: "M250,150 C330,130 400,165 470,150 C560,132 620,160 690,140", via: ["iruth"], days: 24, n: 2 },
  { id: "r-west", d: "M470,150 C420,190 360,205 330,232 C280,265 230,280 210,320 C190,360 230,390 250,420", via: ["iruth", "neutral"], days: 28, n: 2 },
  { id: "r-east", d: "M690,140 C760,190 800,250 790,310 C780,360 740,390 700,430 C760,460 820,480 850,520", via: ["iruth", "arkandal"], days: 30, n: 2 },
  { id: "r-cross", d: "M700,430 C620,440 540,480 470,470 C400,460 320,440 250,420", via: ["arkandal", "neutral"], days: 26, n: 2 },
  { id: "r-south", d: "M700,430 C670,480 620,510 600,560 C590,600 620,630 650,650", via: ["arkandal"], days: 18, n: 1 },
];
const SEA: Route[] = [
  { id: "s-north", d: "M30,170 C60,80 150,48 260,58 C420,40 560,50 700,40 C820,34 920,60 975,120", via: [], days: 40, n: 2 },
  { id: "s-east", d: "M975,120 C990,240 975,380 985,500 C990,600 950,680 860,705", via: [], days: 36, n: 2 },
  { id: "s-south", d: "M860,705 C760,716 690,700 650,690 C540,712 420,712 300,712 C180,714 80,690 30,620", via: [], days: 44, n: 2 },
];

const MOUNTAINS: [number, number, number][] = [
  [170, 100, 14], [205, 92, 18], [560, 86, 16], [595, 80, 20], [630, 84, 15], [760, 88, 14],
  [478, 300, 16], [470, 340, 18], [462, 385, 16], [458, 425, 18], [462, 470, 16], [470, 515, 18], [466, 560, 15],
  [620, 380, 12], [645, 392, 14],
];

/** 감염도 0~100 → 연두(#b5e061)에서 진한 초록(#1e5418)으로 */
export function infColor(inf: number): string {
  const t = Math.max(0, Math.min(100, inf)) / 100;
  const a = [0xb5, 0xe0, 0x61], b = [0x1e, 0x54, 0x18];
  return "#" + a.map((v, i) => Math.round(v + (b[i]! - v) * t).toString(16).padStart(2, "0")).join("");
}
/** 반점 크기 배율 0~1 (나타나는 감염도에서 25 오를 때 다 자람) */
export function blobScale(inf: number, threshold: number): number {
  return Math.sqrt(Math.max(0, Math.min(1, (inf - threshold) / 25)));
}
export const routeOpen = (s: Pick<GameState, "infection">, via: Zone[]) => via.every((r) => s.infection[r] < 80);

const HOME: Record<FactionId, Zone> = { iruth: "iruth", arkandal: "arkandal", voodoo: "neutral" };
// 확대 영역 [x, y] (폭 620 · 높이 446)
const FOCUS: Record<Zone, [number, number]> = { iruth: [190, 40], arkandal: [380, 250], neutral: [20, 240] };
const ZW = 620;

export function focusView(f: FactionId): View { const [x, y] = FOCUS[HOME[f]]; return clampView({ k: W / ZW, x, y }); }

export function WorldMap({ s }: { s: GameState }) {
  const [view, setView] = useState<View>(() => focusView(s.faction));
  const [animate, setAnimate] = useState(true);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
  const justDragged = useRef(false);
  const toSvg = (dx: number) => { const el = svgRef.current; return el ? (dx * W) / el.getBoundingClientRect().width : dx; };
  const go = (v: View) => { setAnimate(true); setView(clampView(v)); };
  // 휠 확대·축소 — 페이지 스크롤을 막아야 해서 passive: false 로 직접 등록
  useEffect(() => {
    const el = svgRef.current; if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rc = el.getBoundingClientRect();
      const sx = ((e.clientX - rc.left) * W) / rc.width, sy = ((e.clientY - rc.top) * H) / rc.height;
      setAnimate(false);
      setView((v) => zoomAt(v, Math.exp(-e.deltaY * 0.0015), sx, sy));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);
  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = drag.current; if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 4) return;
    if (!d.moved) { d.moved = true; e.currentTarget.setPointerCapture(e.pointerId); }
    d.x = e.clientX; d.y = e.clientY;
    setAnimate(false);
    setView((v) => panBy(v, toSvg(dx), toSvg(dy)));
  };
  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = drag.current; if (!d || d.id !== e.pointerId) return;
    justDragged.current = d.moved; drag.current = null;
  };
  const whole = view.k <= 1.001;
  const setTarget = useGame((z) => z.setTarget);
  const V = s.faction === "voodoo";
  const canPick = V && s.phase === "action";
  const season = seasonOf(s.turn);
  return (
    <figure className="m-0 relative rounded border border-line2 overflow-hidden bg-[#1a2a33] shadow-[0_10px_28px_-12px_#000]" data-testid="world-map">
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block select-none cursor-grab active:cursor-grabbing" role="img"
        style={{ touchAction: view.k > 1.001 ? "none" : "pan-y" }}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
        onClickCapture={(e) => { if (justDragged.current) { e.stopPropagation(); e.preventDefault(); justDragged.current = false; } }}
        aria-label={`대륙 지도: ${ORDER.map((r) => `${REGION[r].name} 감염도 ${s.infection[r]}`).join(", ")}`}>
        <defs>
          <clipPath id="wm-coast"><path d={COAST} /></clipPath>
          {ORDER.map((r) => <clipPath key={r} id={`wm-${r}`}><path d={REGION[r].d} /></clipPath>)}
          <filter id="wm-soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="14" /></filter>
          <pattern id="wm-wave" width="26" height="14" patternUnits="userSpaceOnUse"><path d="M0 9 Q6.5 3 13 9 T26 9" stroke="#2c4350" fill="none" strokeWidth="1.2" /></pattern>
          <pattern id="wm-swamp" width="16" height="10" patternUnits="userSpaceOnUse"><path d="M2 6 h6 M9 3 h5" stroke="#2b2135" strokeWidth="1.4" /></pattern>
          <radialGradient id="wm-vig" cx="50%" cy="50%" r="70%"><stop offset="60%" stopColor="#000" stopOpacity="0" /><stop offset="100%" stopColor="#000" stopOpacity=".55" /></radialGradient>
        </defs>
        <rect width={W} height={H} fill="#1a2a33" />
        <rect width={W} height={H} fill="url(#wm-wave)" />

        <g style={{ transform: `scale(${view.k}) translate(${-view.x}px, ${-view.y}px)`, transition: animate ? "transform 700ms cubic-bezier(.2,.7,.2,1)" : "none" }}>
          {/* 해상 항로 */}
          {SEA.map((r) => <path key={r.id} d={r.d} fill="none" stroke="#6f8fa0" strokeWidth="2" strokeDasharray="2 9" strokeLinecap="round" opacity=".7" />)}

          <g clipPath="url(#wm-coast)">
            {ORDER.map((r) => {
              const targeted = V && s.target === r;
              return (
                <g key={r} onClick={canPick ? () => setTarget(r) : undefined} style={canPick ? { cursor: "pointer" } : undefined}>
                  <path d={REGION[r].d} fill={REGION[r].fill} />
                  {r === "neutral" && <path d={REGION[r].d} fill="url(#wm-swamp)" opacity=".5" />}
                  {targeted && <path d={REGION[r].d} fill="none" stroke="#c9a2f2" strokeWidth="5" strokeDasharray="12 8" />}
                </g>
              );
            })}
            {/* 전쟁으로 주인이 바뀐 도시의 땅 */}
            {CITIES.map((c, i) => {
              const o = s.cities[c.id] ?? c.owner;
              if (o === c.owner) return null;
              return <path key={c.id} d={CELLS[i]} fill={OWNER_FILL[o]} opacity=".9" stroke="#1b1410" strokeWidth="2" strokeDasharray="6 5" className="transition-opacity duration-1000" pointerEvents="none"><title>{c.name} — {FACTIONS[o].short} 점령</title></path>;
            })}
            {/* 오염 */}
            {ORDER.map((r) => {
              const inf = s.infection[r];
              return (
                <g key={r} clipPath={`url(#wm-${r})`} filter="url(#wm-soft)" pointerEvents="none">
                  <rect width={W} height={H} fill={infColor(inf)} opacity={Math.min(0.35, inf / 260)} className="transition-opacity duration-1000" />
                  {BLOBS[r].map(([x, y, rad, thr], i) => <Blob key={i} x={x} y={y} r={rad} scale={blobScale(inf, thr)} color={infColor(inf)} seed={i} />)}
                </g>
              );
            })}
            {/* 겨울엔 서리 */}
            {season === "winter" && <rect width={W} height={H} fill="#eef6ff" opacity=".14" pointerEvents="none" />}
            {season === "summer" && <rect width={W} height={H} fill="#ffcf7a" opacity=".06" pointerEvents="none" />}
            {/* 국경 · 방벽 */}
            <path d={BORDER} fill="none" stroke="#1b1410" strokeWidth="3" strokeDasharray="10 6" opacity=".6" />
            <path d="M0,262 C60,258 120,276 200,266 C300,250 380,276 480,262 C560,250 640,276 740,258 C820,240 900,262 1000,250" fill="none" stroke="#1b1410" strokeWidth="3" strokeDasharray="10 6" opacity=".55" />
            {s.wall > 0 && <path d={BORDER} pathLength={100} fill="none" stroke="#e0b65a" strokeWidth="7" strokeDasharray={`${s.wall} 100`} strokeLinecap="round" className="transition-[stroke-dasharray] duration-1000"><title>아르칸달 방벽 {s.wall}%</title></path>}
            {/* 강 */}
            <path d="M600,90 C620,160 580,210 640,262 C690,310 660,360 700,430 C730,500 700,600 760,690" fill="none" stroke="#3e6476" strokeWidth="3" opacity=".75" />
            <path d="M120,300 C170,360 150,440 200,500 C240,560 220,640 260,700" fill="none" stroke="#3e6476" strokeWidth="2.5" opacity=".6" />
            {/* 산맥 */}
            {MOUNTAINS.map(([x, y, m], i) => <path key={i} d={`M${x - m},${y + m * 0.6} L${x},${y - m * 0.7} L${x + m},${y + m * 0.6} Z`} fill="#2d241d" stroke="#d8cbb2" strokeWidth="1.4" strokeLinejoin="round" opacity=".85" />)}
            {/* 실바 늪 (교단 본거지) */}
            <g><ellipse cx="150" cy="520" rx="58" ry="40" fill="#241a2c" opacity=".85" /><circle cx="150" cy="520" r="7" fill="#9b5de5" opacity={V ? 1 : 0.6} /></g>
            {/* 최초 발병지 */}
            <circle cx="360" cy="440" r="34" fill="none" stroke="#b4513a" strokeWidth="2" strokeDasharray="4 4" opacity=".8" />
          </g>
          <path d={COAST} fill="none" stroke="#d9c9a6" strokeWidth="3" opacity=".75" />

          {/* 육상 교역로 */}
          {LAND.map((r) => {
            const open = routeOpen(s, r.via);
            return <path key={r.id} d={r.d} fill="none" stroke={open ? "#e8cf8a" : "#c0483a"} strokeWidth={open ? 2.2 : 2} strokeDasharray={open ? "7 6" : "3 7"} opacity={open ? 0.8 : 0.7} />;
          })}
          <Movers s={s} />

          {/* 도시 */}
          {CITIES.map((c) => (
            <g key={c.id} pointerEvents="none">
              {c.capital && <circle cx={c.x} cy={c.y} r="11" fill="none" stroke="#f0d68d" strokeWidth="2" />}
              {(s.cities[c.id] ?? c.owner) !== c.owner && <circle cx={c.x} cy={c.y} r="14" fill="none" stroke={OWNER_RING[s.cities[c.id]!]} strokeWidth="3" />}
              <circle cx={c.x} cy={c.y} r={c.capital ? 6 : 4.5} fill={regionCollapsed(s.infection[c.region]) ? "#4e8f2a" : "#f5ecd8"} stroke="#1b1410" strokeWidth="2" />
              {c.port && <path d={`M${c.x + 9},${c.y - 14} v10 m-5,-5 h10`} stroke="#bcd6e2" strokeWidth="1.6" />}
              <text x={c.x} y={c.y + 22} textAnchor="middle" fontSize="15" className="font-ui" fill="#f3ead6" stroke="#15100c" strokeWidth="4" paintOrder="stroke">{c.name}</text>
            </g>
          ))}
          {/* 지역 이름 + 감염도 */}
          {ORDER.map((r) => (
            <g key={r} pointerEvents="none">
              <text x={REGION[r].label[0]} y={REGION[r].label[1]} textAnchor="middle" fontSize="30" letterSpacing="6" className="font-display" fill="#f7eedb" stroke="#15100c" strokeWidth="6" paintOrder="stroke" opacity=".92">{REGION[r].name}</text>
              <text x={REGION[r].label[0]} y={REGION[r].label[1] + 26} textAnchor="middle" fontSize="16" className="font-ui" fill={s.infection[r] >= 50 ? "#c9f08a" : "#e6dcc6"} stroke="#15100c" strokeWidth="4" paintOrder="stroke">오염 {s.infection[r]} · {infStage(s.infection[r])}</text>
            </g>
          ))}
        </g>
        <rect width={W} height={H} fill="url(#wm-vig)" pointerEvents="none" />
      </svg>

      <div className="absolute top-2 right-2 flex gap-1">
        <button type="button" className="btn !py-1 !px-2 !text-[12px] min-w-[30px]" aria-label="확대" onClick={() => go(zoomAt(view, 1.4, W / 2, H / 2))}>+</button>
        <button type="button" className="btn !py-1 !px-2 !text-[12px] min-w-[30px]" aria-label="축소" onClick={() => go(zoomAt(view, 1 / 1.4, W / 2, H / 2))}>−</button>
        <button type="button" className="btn !py-1 !px-2.5 !text-[12px]" onClick={() => go(whole ? focusView(s.faction) : { k: 1, x: 0, y: 0 })}>
          {whole ? "우리 영토 확대" : "대륙 전체 보기"}
        </button>
      </div>
      <figcaption className="absolute left-2 bottom-2 flex flex-wrap gap-x-3 gap-y-1 px-2 py-1 rounded-[3px] font-ui text-[11px] text-[#e6dcc6]" style={{ background: "rgba(20,15,11,.78)" }}>
        <span><i className="inline-block w-2.5 h-2.5 rounded-full align-middle mr-1" style={{ background: infColor(15) }} />오염</span>
        <span><i className="inline-block w-2.5 h-2.5 rounded-full align-middle mr-1" style={{ background: infColor(90) }} />심각</span>
        <span><i className="inline-block w-2 h-2 rounded-full align-middle mr-1 bg-[#f0d68d]" />상단</span>
        <span>⛵ 선박</span>
        <span className="text-[#e07a6a]">┄ 끊긴 길</span>
        <span className="hidden sm:inline text-faint">휠: 확대·축소 · 끌기: 이동</span>
        {canPick && <span className="text-[#c9a2f2]">지역을 눌러 확산 대상 지정</span>}
      </figcaption>
    </figure>
  );
}

function Blob({ x, y, r, scale, color, seed }: { x: number; y: number; r: number; scale: number; color: string; seed: number }) {
  const day = useGame((z) => z.dayOffset);
  // 날짜에 따라 아주 조금씩 일렁임
  const wob = scale > 0 ? 1 + 0.06 * Math.sin(day / 6 + seed * 1.7) : 1;
  return (
    <circle cx={x} cy={y} r={r} fill={color} opacity={0.45 + 0.4 * scale}
      style={{ transformBox: "fill-box", transformOrigin: "center", transform: `scale(${(scale * wob).toFixed(3)})`, transition: "transform 1.2s ease-out, fill 1s" }} />
  );
}

/** 상단·선박 — 게임 시계(턴·날짜)로 위치가 정해져 일시정지하면 멈춥니다. */
function Movers({ s }: { s: GameState }) {
  const day = useGame((z) => z.dayOffset);
  const refs = useRef<Record<string, SVGPathElement | null>>({});
  const [, ready] = useState(0);
  useEffect(() => { ready(1); }, []);
  const t = (s.turn - 1) * 90 + day;
  const at = (id: string, f: number) => {
    const p = refs.current[id];
    if (!p || typeof p.getTotalLength !== "function") return null;
    const L = p.getTotalLength();
    const a = p.getPointAtLength(f * L), b = p.getPointAtLength(Math.min(L, f * L + 1));
    return { x: a.x, y: a.y, flip: b.x < a.x };
  };
  const out: React.ReactNode[] = [];
  for (const r of LAND) {
    if (!routeOpen(s, r.via)) continue;
    for (let i = 0; i < r.n; i++) {
      const ph = (t / r.days + i / r.n) % 2;
      const f = ph < 1 ? ph : 2 - ph; // 왕복
      const p = at(r.id, f);
      if (p) out.push(<g key={`${r.id}-${i}`} transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`}><circle r="6" fill="#f0d68d" stroke="#3a2a16" strokeWidth="2" /><circle r="2" fill="#3a2a16" /></g>);
    }
  }
  for (const r of SEA) {
    for (let i = 0; i < r.n; i++) {
      const f = (t / r.days + i / r.n) % 1;
      const p = at(r.id, f);
      if (p) out.push(
        <g key={`${r.id}-${i}`} transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) scale(${p.flip ? -1 : 1} 1)`}>
          <path d="M-12,2 L12,2 L8,9 L-8,9 Z" fill="#6b4a2c" stroke="#1b1410" strokeWidth="1.5" />
          <path d="M0,1 V-16 L10,-1 Z" fill="#efe4c8" stroke="#1b1410" strokeWidth="1.2" />
        </g>);
    }
  }
  return (
    <g pointerEvents="none">
      {[...LAND, ...SEA].map((r) => <path key={r.id} ref={(el) => { refs.current[r.id] = el; }} d={r.d} fill="none" stroke="none" />)}
      {out}
    </g>
  );
}
