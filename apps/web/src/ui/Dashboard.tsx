import {
  FACTIONS, GAUGE_LABEL, PRESETS, REGION_NAME, SEASON_KO, SEASON_MOD, ci, foodUseOf, infStage, otherFactions, preyUse,
  gaugeInfluences, ownedRelics, progressOf, seasonOf, type GameState, type GaugeKey, type PresetId, type RegionId,
} from "@guul/engine";
import { useState } from "react";
import { content, useGame } from "../store/store";
import { ResourcePanel } from "./ResourcePanel";
import { TerritoryPanel } from "./TerritoryPanel";

function GaugeRow({ s, k }: { s: GameState; k: GaugeKey }) {
  const [open, setOpen] = useState(false);
  const inf = gaugeInfluences(s, k, content);
  return (
    <div className="grid gap-1">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} title="눌러서 이 수치를 움직이는 규칙 보기" className="text-left">
        <Gauge label={GAUGE_LABEL[k]} v={s.gauges[k]} hostile={false} />
      </button>
      {open && (
        <ul className="m-0 pl-3.5 grid gap-0.5 font-ui text-[11px] text-muted list-none" data-testid={`influences-${k}`}>
          {inf.map((x, i) => (
            <li key={i} className={x.active ? (x.sign > 0 ? "text-frost" : "text-blood") : "text-faint"}>{x.active ? "● " : "○ "}{x.text}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
function Gauge({ label, v, hostile }: { label: string; v: number; hostile?: boolean }) {
  const danger = hostile ? v >= 70 : v <= 20;
  const warn = hostile ? v >= 50 : v <= 35;
  const cls = danger ? "bg-blood" : warn ? "bg-[#b8873c]" : "bg-gold";
  return (
    <div className="grid grid-cols-[46px_1fr_28px] items-center gap-2 text-[13px]">
      <span className="font-ui text-[12px] text-muted">{label}</span>
      <span className="h-2 bg-[#100d0b] border border-line rounded-[1px] overflow-hidden"><i className={`block h-full ${cls} transition-[width] duration-500`} style={{ width: `${v}%` }} /></span>
      <span className={`text-right font-ui tabular-nums text-[13px] ${danger ? "text-blood" : ""}`}>{v}</span>
    </div>
  );
}
function Bar({ label, v, cls }: { label: string; v: number; cls: string }) {
  return (
    <div className="grid grid-cols-[46px_1fr_28px] items-center gap-2 text-[13px]">
      <span className="font-ui text-[12px] text-muted">{label}</span>
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
  const res: [string, string, boolean][] = [
    [F.popName, s.res.pop.toFixed(1) + "만", s.res.pop <= s.startPop * 0.3],
    [F.armyName, s.res.army.toFixed(1) + "만", false],
    ["식량", String(Math.round(s.res.food)), s.res.food < fu * 2.5],
    ...(V ? [["먹이", String(Math.round(s.res.prey)), s.res.prey < preyUse(s.res.army) * 2.5] as [string, string, boolean]] : []),
    ["실링", String(Math.round(s.res.silver)), s.res.silver < 10],
    [F.stratName, String(Math.round(s.res.strat)), false],
  ];
  const prog = Math.round(progressOf(s));
  return (
    <aside className="panel-iron grid gap-3.5 p-5 self-start lg:sticky lg:top-3">
      <span className="rot-layer" aria-hidden="true" />
      <TerritoryPanel s={s} />
      {/* 게이지 */}
      <div className="grid gap-2"><h3 className="eyebrow">{V ? "교단 게이지" : "국정 게이지"}</h3>{F.gauges.map((k) => <GaugeRow key={k} s={s} k={k} />)}<span className="font-ui text-[10px] text-faint">수치를 누르면 올리고 내리는 규칙이 나옵니다 (● 지금 적용 중)</span></div>
      {ownedRelics(s, content).length > 0 && (
        <div className="grid gap-1.5"><h3 className="eyebrow">유물</h3>
          {ownedRelics(s, content).map((r) => <span key={r.id} className="font-ui text-[12px] text-gold" title={r.desc}>◆ {r.name}</span>)}</div>
      )}
      <ResourcePanel s={s} />
      {/* 진노 */}
      <div className="grid gap-2"><h3 className="eyebrow">여신의 진노</h3><Gauge label="진노" v={s.wrath} hostile /></div>
      {/* 승리 진척 */}
      <div className="grid gap-2"><h3 className="eyebrow">승리 진척 · {F.victory}</h3>
        <Bar label={V ? "CI" : F.victory} v={V ? ci(s) : prog} cls="bg-frost" />
        <span className="font-ui text-[11px] text-faint">{F.victoryText}{V ? ` · CI ${ci(s)} (85×2턴) · 연속 ${s.ciStreak}/2` : ""}</span>
      </div>
      {/* 타 세력 */}
      <div className="grid gap-2"><h3 className="eyebrow">대륙 정세</h3>
        <div className="font-ui text-[12px] text-muted grid gap-1">
          {(["iruth", "arkandal", "neutral"] as RegionId[]).filter((r) => r !== s.faction).map((r) => (
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
