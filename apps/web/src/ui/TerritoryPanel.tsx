import { REGION_NAME, SEASON_KO, SEASON_MOD, infStage, seasonOf, type GameState, type RegionId } from "@guul/engine";
import { useGame } from "../store/store";
import { regionCollapsed } from "./mapShade";

type Zone = "arkandal" | "iruth" | "neutral";
/** 찢어진 전략 지도: 서쪽 아르칸달, 동쪽 해안 아이루스, 가운데 아래 라벤 폐허 */
const ZONES: Record<Zone, { d: string; cap: [number, number]; name: string; veins: string[] }> = {
  arkandal: { d: "M18 38 L118 22 L146 74 L112 126 L44 138 L12 90 Z", cap: [66, 82], name: "아르칸달",
    veins: ["M66 82 C80 70 96 66 118 56", "M66 82 C58 104 70 118 96 126", "M66 82 C48 74 34 62 26 48"] },
  iruth: { d: "M186 26 L292 34 L308 96 L282 156 L212 146 L180 88 Z", cap: [244, 90], name: "아이루스",
    veins: ["M244 90 C228 76 214 62 196 44", "M244 90 C262 100 270 124 276 146", "M244 90 C262 70 280 58 296 50"] },
  neutral: { d: "M112 126 L146 74 L180 88 L212 146 L192 190 L102 186 L68 156 Z", cap: [142, 142], name: "라벤 폐허",
    veins: ["M142 142 C132 122 138 104 150 84", "M142 142 C164 150 184 146 204 142", "M142 142 C120 158 110 168 100 180"] },
};
const stageLine = (stage: string, V: boolean, streak: number) =>
  `${stage === "소강" ? "효과 없음" : stage === "확산" ? "식량 생산 −10%" : stage === "창궐" ? "모든 판정 −5 · 식량 −20%" : "매 턴 붕괴 카드 추가"}${!V && streak ? ` · 감염도 100 연속 ${streak}/3` : ""}`;
const veinColor = (inf: number) => (inf >= 91 ? "#590909" : inf >= 61 ? "#3e1111" : inf >= 31 ? "#4b5a2c" : "#2f4326");

/** 혈관 게이지 — 가지 친 혈관이 감염도만큼 썩어 들어갑니다 (막대바 대신). */
export function VeinGauge({ value, label }: { value: number; label: string }) {
  const v = Math.max(0, Math.min(100, value));
  const off = 100 - v;
  const col = veinColor(v);
  const paths = [
    "M4 20 C40 6 70 34 110 20 S190 8 230 20 S290 30 316 18",
    "M60 14 C66 4 74 2 84 6", "M120 22 C126 34 134 38 146 34", "M180 12 C186 2 196 0 206 4", "M236 22 C242 33 252 37 264 33",
  ];
  return (
    <svg viewBox="0 0 320 40" className="w-full h-[44px] block" role="meter" aria-label={label} aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
      <rect x="1" y="1" width="318" height="38" fill="#17120e" stroke="#0d0a08" />
      <path d={paths[0]} fill="none" stroke="#2d2620" strokeWidth="6" strokeLinecap="round" />
      {paths.slice(1).map((d, i) => <path key={i} d={d} fill="none" stroke="#2d2620" strokeWidth="3" strokeLinecap="round" />)}
      <g filter="url(#ink)">
        <path className="vein" pathLength={100} d={paths[0]} stroke={col} strokeWidth="6" style={{ strokeDashoffset: off }} />
        {paths.slice(1).map((d, i) => <path key={i} className="vein" pathLength={100} d={d} stroke={col} strokeWidth="3" style={{ strokeDashoffset: Math.min(100, Math.max(0, off + (i + 1) * -4 + 8)), opacity: v > 12 + i * 12 ? 1 : 0.2 }} />)}
      </g>
    </svg>
  );
}

/** 영지·오염도 패널: 감염 혈관 게이지 + 찢어진 지도 위에 핀을 박는 구조 */
export function TerritoryPanel({ s }: { s: GameState }) {
  const setTarget = useGame((z) => z.setTarget);
  const V = s.faction === "voodoo";
  const canPick = V && s.phase === "action";
  const inf = s.infection[s.faction];
  const stage = infStage(inf);
  const next = seasonOf(s.turn + 1);
  const zones = Object.keys(ZONES) as Zone[];
  return (
    <div className="grid gap-2.5" data-testid="territory-panel">
      <div className="flex justify-between items-center"><span className="eyebrow">감염도 · 오염</span>
        <span className={`rune text-[13px] px-2 py-px border ${stage === "붕괴" ? "border-[#590909] text-[#d9806a]" : stage === "창궐" ? "border-[#5a3328] text-[#c98a5a]" : "border-[#4a4439]"}`}>{stage}</span></div>
      <div className="flex justify-between items-baseline gap-2">
        <span className="rune text-[40px] leading-none tabular-nums" style={{ color: inf >= 61 ? "#c0705a" : "#d4bd7e" }}>{inf}</span>
        <span className="font-ui text-[11px] text-faint">다음 {SEASON_KO[next]} 보정 {SEASON_MOD[next] >= 0 ? "+" : ""}{SEASON_MOD[next]}</span>
      </div>
      <VeinGauge value={inf} label={`${REGION_NAME[s.faction]} 감염도`} />
      <span className="font-ui text-[11px] text-faint">{stageLine(stage, V, s.streak[s.faction])}</span>

      <figure className="m-0 grid gap-1.5">
        <div className="parchment torn p-1.5">
          <svg viewBox="0 0 320 210" className="w-full h-auto block" role="group"
            aria-label={`대륙 지도: ${zones.map((z) => `${ZONES[z].name} 감염도 ${s.infection[z]}`).join(", ")}`}>
            <defs>
              <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><path d="M0 0 V6" stroke="#6a5636" strokeOpacity=".35" strokeWidth="1" /></pattern>
              {zones.map((z) => (
                <radialGradient key={z} id={`blot-${z}`}><stop offset="0" stopColor={s.infection[z] >= 61 ? "#590909" : "#1c2b18"} stopOpacity=".95" /><stop offset=".6" stopColor={s.infection[z] >= 61 ? "#3e1111" : "#2f4326"} stopOpacity=".6" /><stop offset="1" stopColor="#1c2b18" stopOpacity="0" /></radialGradient>
              ))}
            </defs>
            <path d="M200 6 L210 24 M26 188 L40 176 M300 196 L286 180" stroke="#6a5636" strokeOpacity=".4" fill="none" /> {/* 접힌 자국 */}
            <path d="M160 4 L156 206" stroke="#6a5636" strokeOpacity=".28" strokeWidth="1" fill="none" strokeDasharray="2 3" />
            {zones.map((z) => {
              const v = s.infection[z];
              const mine = z === s.faction;
              const targeted = V && s.target === z;
              const col = veinColor(v);
              const pick = canPick ? () => setTarget(z as RegionId) : undefined;
              return (
                <g key={z} onClick={pick} onKeyDown={canPick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick?.(); } } : undefined}
                  role={canPick ? "button" : undefined} tabIndex={canPick ? 0 : undefined} aria-label={canPick ? `${ZONES[z].name}을(를) 확산 대상으로 지정` : undefined}
                  style={canPick ? { cursor: "pointer" } : undefined}>
                  <path d={ZONES[z].d} fill="url(#hatch)" stroke="#3a2c1a" strokeWidth={mine || targeted ? 2.4 : 1.3} strokeLinejoin="round" strokeDasharray={targeted ? "6 3" : undefined} />
                  <circle className="ink-blot" cx={ZONES[z].cap[0]} cy={ZONES[z].cap[1]} r={6 + v * 0.55} fill={`url(#blot-${z})`} opacity={Math.min(1, 0.15 + v / 90)} filter="url(#ink)" />
                  <g filter="url(#ink)">{ZONES[z].veins.map((d, i) => <path key={i} className="vein" pathLength={100} d={d} stroke={col} strokeWidth={regionCollapsed(v) ? 3.2 : 2.4} style={{ strokeDashoffset: Math.max(0, 100 - v * 1.15 + i * 6), opacity: v > 8 ? 0.95 : 0.15 }} />)}</g>
                  {/* 핀 */}
                  <g transform={`translate(${ZONES[z].cap[0]} ${ZONES[z].cap[1]})`}>
                    <ellipse cx="2" cy="9" rx="5" ry="2" fill="#000" opacity=".35" />
                    <line x1="0" y1="0" x2="0" y2="9" stroke="#2a2218" strokeWidth="1.6" />
                    {targeted ? <path d="M0 -12 L6 -3 L0 0 L-6 -3 Z" fill="#590909" stroke="#1a0606" /> : <circle cx="0" cy="-4" r="5.2" fill={mine ? "#8b7355" : "#4a4439"} stroke="#1a1308" />}
                    <circle cx="-1.5" cy="-5.5" r="1.6" fill="#fff" opacity=".25" />
                  </g>
                  <text x={ZONES[z].cap[0]} y={ZONES[z].cap[1] + 24} textAnchor="middle" fontSize="12" fontFamily="Song Myung, serif" fill="#2a2118" stroke="#cbbb86" strokeWidth="2.6" paintOrder="stroke">{ZONES[z].name}</text>
                  <text x={ZONES[z].cap[0]} y={ZONES[z].cap[1] + 37} textAnchor="middle" fontSize="11" fontFamily="IM Fell English SC, serif" fill={v >= 61 ? "#590909" : "#2a2118"} stroke="#cbbb86" strokeWidth="2.6" paintOrder="stroke">{v} · {infStage(v)}</text>
                </g>
              );
            })}
            <g aria-hidden="true" transform="translate(128 196)"><path d="M0 0 L5 -7 L10 0 Z" fill="#3e1111" /><text x="14" y="-1" fontSize="9" fill="#3e1111" fontFamily="Song Myung, serif">교단의 늪</text></g>
          </svg>
        </div>
        <figcaption className="font-ui text-[11px] text-faint flex flex-wrap gap-x-3">
          <span>{V ? "◆ 핏빛 핀: 확산 대상" : "황동 핀: 우리 땅"}</span>
          <span>혈관이 뻗을수록 오염이 깊음{canPick ? " · 지도의 땅을 눌러 핀을 옮기기" : ""}</span>
        </figcaption>
      </figure>
    </div>
  );
}
