// 대시보드 맨 위 감염도 패널: 숫자 + 혈관 게이지 + 경계 단계. (대륙 지도는 오른쪽 실시간 지도로 옮겼습니다.)
import { REGION_NAME, SEASON_KO, SEASON_MOD, infStage, seasonOf, type GameState } from "@guul/engine";
import { useFlash } from "./useFlash";

const stageLine = (stage: string, V: boolean, streak: number) =>
  `경계 단계 ${stage} — ${stage === "소강" ? "아직 페널티 없음" : stage === "확산" ? "식량 생산 −10%" : stage === "창궐" ? "모든 판정 −5 · 식량 −20%" : "매 턴 붕괴 카드 추가"}${!V && streak ? ` · 감염도 100 연속 ${streak}/3` : ""}`;
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

/** 감염도 패널 */
export function TerritoryPanel({ s }: { s: GameState }) {
  const V = s.faction === "voodoo";
  const inf = s.infection[s.faction];
  const stage = infStage(inf);
  const next = seasonOf(s.turn + 1);
  const flash = useFlash(inf, false);
  return (
    <div className="grid gap-2.5" data-testid="territory-panel">
      <div className="flex justify-between items-center"><span className="eyebrow">감염도 · 오염</span>
        <span className={`rune text-[13px] px-2 py-px border ${stage === "붕괴" ? "border-[#590909] text-[#d9806a]" : stage === "창궐" ? "border-[#5a3328] text-[#c98a5a]" : "border-[#4a4439]"}`}>{stage}</span></div>
      <div className="flex justify-between items-baseline gap-2">
        <span className={`num text-[40px] leading-none ${flash ? `flash-${flash}` : ""}`} style={{ color: inf >= 61 ? "#c0705a" : "#d4bd7e" }}>{inf}</span>
        <span className="font-ui text-[11px] text-faint">다음 {SEASON_KO[next]} 보정 {SEASON_MOD[next] >= 0 ? "+" : ""}{SEASON_MOD[next]}</span>
      </div>
      <VeinGauge value={inf} label={`${REGION_NAME[s.faction]} 감염도`} />
      <span className="font-ui text-[11px] text-faint">{stageLine(stage, V, s.streak[s.faction])}</span>
    </div>
  );
}
