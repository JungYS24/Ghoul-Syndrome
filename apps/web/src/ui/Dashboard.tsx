import {
  FACTIONS, GAUGE_LABEL, PRESETS, REGION_NAME, SEASON_KO, SEASON_MOD, ci, foodUseOf, infStage, otherFactions, preyUse,
  progressOf, seasonOf, type EffectKey, type GameState, type PresetId, type RegionId,
} from "@guul/engine";
import { useGame } from "../store/store";
import { ImpactMark } from "./Impact";

function Gauge({ label, v, hostile, k }: { label: string; v: number; hostile?: boolean; k?: EffectKey | EffectKey[] }) {
  const danger = hostile ? v >= 70 : v <= 20;
  const warn = hostile ? v >= 50 : v <= 35;
  const cls = danger ? "bg-blood" : warn ? "bg-[#b8873c]" : "bg-gold";
  return (
    <div className="grid grid-cols-[46px_14px_1fr_28px] items-center gap-2 text-[13px]">
      <span className="font-ui text-[12px] text-muted">{label}</span>
      {k ? <ImpactMark k={k} /> : <span />}
      <span className="h-2 bg-[#100d0b] border border-line rounded-[1px] overflow-hidden"><i className={`block h-full ${cls} transition-[width] duration-500`} style={{ width: `${v}%` }} /></span>
      <span className={`text-right font-ui tabular-nums text-[13px] ${danger ? "text-blood" : ""}`}>{v}</span>
    </div>
  );
}
function Bar({ label, v, cls, k }: { label: string; v: number; cls: string; k?: EffectKey | EffectKey[] }) {
  return (
    <div className="grid grid-cols-[46px_14px_1fr_28px] items-center gap-2 text-[13px]">
      <span className="font-ui text-[12px] text-muted">{label}</span>
      {k ? <ImpactMark k={k} /> : <span />}
      <span className="h-2 bg-[#100d0b] border border-line rounded-[1px] overflow-hidden"><i className={`block h-full ${cls} transition-[width] duration-500`} style={{ width: `${v}%` }} /></span>
      <span className="text-right font-ui tabular-nums text-[13px]">{Math.floor(v)}</span>
    </div>
  );
}

export function Dashboard({ s }: { s: GameState }) {
  const setPreset = useGame((z) => z.setPreset);
  const F = FACTIONS[s.faction];
  const V = s.faction === "voodoo";
  const inf = s.infection[s.faction];
  const stage = infStage(inf);
  const fu = foodUseOf(s);
  const nextSeason = seasonOf(s.turn + 1);
  const stageColor: Record<string, string> = { 소강: "text-frost", 확산: "text-[#c9a14a]", 창궐: "text-[#d0783d]", 붕괴: "text-blood" };
  const res: [EffectKey, string, string, boolean][] = [
    ["pop", F.popName, s.res.pop.toFixed(1) + "만", s.res.pop <= s.startPop * 0.3],
    ["army", F.armyName, s.res.army.toFixed(1) + "만", false],
    ["food", "식량", String(Math.round(s.res.food)), s.res.food < fu * 2.5],
    ...(V ? [["prey", "먹이", String(Math.round(s.res.prey)), s.res.prey < preyUse(s.res.army) * 2.5] as [EffectKey, string, string, boolean]] : []),
    ["silver", "실링", String(Math.round(s.res.silver)), s.res.silver < 10],
    ["strat", F.stratName, String(Math.round(s.res.strat)), false],
  ];
  const prog = Math.round(progressOf(s));
  return (
    <aside className="relative z-10 grid gap-3.5 bg-panel border border-line rounded p-4 self-start lg:sticky lg:top-3">
      {/* 감염도 */}
      <div className="grid gap-1.5 p-3 bg-[#15120e] border border-line rounded-[3px]">
        <div className="flex justify-between items-center"><span className="eyebrow flex items-center gap-1">감염도 <ImpactMark k="infection" /></span><span className={`font-ui text-[12px] px-2 py-px rounded-[2px] border border-current ${stageColor[stage]}`}>{stage}</span></div>
        <div className="flex justify-between items-baseline gap-2"><span className="font-display text-[34px] leading-none tabular-nums">{inf}</span><span className="font-ui text-[11px] text-faint">다음 {SEASON_KO[nextSeason]} 보정 {SEASON_MOD[nextSeason] >= 0 ? "+" : ""}{SEASON_MOD[nextSeason]}</span></div>
        <span className="h-2.5 bg-[#100d0b] border border-line rounded-[1px] overflow-hidden"><i className="block h-full bg-blight transition-[width] duration-500" style={{ width: `${inf}%` }} /></span>
        <span className="font-ui text-[11px] text-faint">{stage === "소강" ? "효과 없음" : stage === "확산" ? "식량 생산 −10%" : stage === "창궐" ? "모든 판정 −5 · 식량 −20%" : "매 턴 붕괴 카드 추가"}{!V && s.streak[s.faction] ? ` · 감염도 100 연속 ${s.streak[s.faction]}/3` : ""}</span>
      </div>
      {/* 게이지 */}
      <div className="grid gap-2"><h3 className="eyebrow">{V ? "교단 게이지" : "국정 게이지"}</h3>{F.gauges.map((k) => <Gauge key={k} k={k} label={GAUGE_LABEL[k]} v={s.gauges[k]} hostile={false} />)}</div>
      {/* 자원 */}
      <div className="grid gap-2"><h3 className="eyebrow">비축 자원</h3>
        <div className="grid grid-cols-3 gap-1.5">{res.map(([key, n, v, low]) => <div key={n} className="bg-[#15120e] border border-line rounded-[2px] px-2 py-1.5 min-w-0"><small className="flex items-center justify-between font-ui text-[11px] text-faint">{n}<ImpactMark k={key} /></small><b className={`font-ui tabular-nums font-medium text-[14px] ${low ? "text-blood" : ""}`}>{v}</b></div>)}</div>
        <span className="font-ui text-[11px] text-faint tabular-nums">계절마다 식량 {fu.toFixed(1)}{V ? ` · 먹이 ${preyUse(s.res.army).toFixed(1)}` : ""} 소비</span>
      </div>
      {/* 진노 */}
      <div className="grid gap-2"><h3 className="eyebrow">여신의 진노</h3><Gauge k="wrath" label="진노" v={s.wrath} hostile /></div>
      {/* 승리 진척 */}
      <div className="grid gap-2"><h3 className="eyebrow">승리 진척 · {F.victory}</h3>
        <Bar k={V ? ["target", "neutral"] : s.faction === "arkandal" ? "wall" : "research"} label={V ? "CI" : F.victory} v={V ? ci(s) : prog} cls="bg-frost" />
        <span className="font-ui text-[11px] text-faint">{F.victoryText}{V ? ` · CI ${ci(s)} (85×2턴) · 연속 ${s.ciStreak}/2` : ""}</span>
      </div>
      {/* 프리셋 */}
      <div className="grid gap-2"><h3 className="eyebrow">인구 배분 (종료 결산 적용)</h3>
        <div className="flex flex-wrap gap-1">{(Object.entries(PRESETS) as [PresetId, { name: string }][]).map(([k, p]) => (
          <button key={k} onClick={() => setPreset(k)} aria-pressed={s.preset === k}
            className={`flex-1 font-ui text-[12px] px-1.5 py-1 rounded-[2px] border ${s.preset === k ? "border-gold text-gold bg-[#2a2216]" : "border-line text-muted"}`}>{p.name}</button>
        ))}</div>
      </div>
      {/* 타 세력 */}
      <div className="grid gap-2"><h3 className="eyebrow flex items-center gap-1">대륙 정세 <ImpactMark k={["rel", "neutral", "voodooPower", "target"]} /></h3>
        <div className="font-ui text-[12px] text-muted grid gap-1">
          {(["arkandal", "iruth", "neutral"] as RegionId[]).filter((r) => r !== s.faction).map((r) => (
            <div key={r} className="flex justify-between gap-2"><span>{REGION_NAME[r]} · 감염도 {s.infection[r]}</span>
              {r !== "neutral" && !V && <span>관계 {s.rel[r as "arkandal" | "iruth"] ?? "—"} {s.pacts.includes(r as "arkandal" | "iruth") ? <span className="text-gold">동맹</span> : ""}</span>}
            </div>
          ))}
          {V && <div className="flex justify-between gap-2"><span>부두교 (본교단)</span><span>은닉 {s.gauges.stealth}</span></div>}
          {!V && <div className="flex justify-between gap-2"><span>구울 부두교 세력</span><span>{s.voodooPower}</span></div>}
        </div>
      </div>
    </aside>
  );
}
