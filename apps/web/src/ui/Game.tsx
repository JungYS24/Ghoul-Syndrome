import { useState } from "react";
import { FACTIONS, GAUGE_LABEL, REGION_NAME, SEASON_KO, actionsFor, seasonOf, yearOf, type GameState, type RegionId } from "@guul/engine";
import { content, useGame } from "../store/store";
import { Dashboard } from "./Dashboard";
import { CardView } from "./Cards";
import { Illus } from "../art/Art";
import { ChronicleSheet, RulesSheet } from "./Sheets";
import { ImpactMark } from "./Impact";

const CREST: Record<string, string[]> = { arkandal: ["fortress", "shield"], iruth: ["ship", "scales"], voodoo: ["altar", "eye"] };

function Phases({ s }: { s: GameState }) {
  const steps = [["start", "시작 결산"], ["event", "사건 카드"], ["action", "행동"], ["end", "종료 결산"]];
  const cur = s.phase === "over" ? "end" : s.phase;
  const idx = steps.findIndex((x) => x[0] === cur);
  return (
    <div className="flex gap-1 font-ui text-[12px] text-faint flex-wrap">
      {steps.map(([k, n], i) => <span key={k} className={`px-2 py-0.5 border rounded-[2px] ${i === idx ? "border-gold text-gold" : i < idx ? "border-line text-muted" : "border-line"}`}>{i + 1}. {n}{k === "event" && cur === "event" ? ` ${s.eventIdx + 1}/${s.events.length}` : ""}</span>)}
    </div>
  );
}
function QuickStrip({ s }: { s: GameState }) {
  const F = FACTIONS[s.faction];
  const inf = s.infection[s.faction];
  return (
    <div className="relative z-10 flex flex-wrap gap-1.5 font-ui text-[12px] lg:hidden">
      <span className={`inline-flex items-center gap-1 bg-panel border rounded-[2px] px-2 py-0.5 tabular-nums ${inf >= 61 ? "text-blood border-[#5a3328]" : "border-line"}`}>감염도 {inf}<ImpactMark k="infection" /></span>
      {F.gauges.map((k) => <span key={k} className={`inline-flex items-center gap-1 bg-panel border rounded-[2px] px-2 py-0.5 tabular-nums ${s.gauges[k] <= 20 ? "text-blood border-[#5a3328]" : "border-line"}`}>{GAUGE_LABEL[k]} {s.gauges[k]}<ImpactMark k={k} /></span>)}
      <span className="inline-flex items-center gap-1 bg-panel border border-line rounded-[2px] px-2 py-0.5 tabular-nums">식량 {Math.round(s.res.food)}<ImpactMark k="food" /></span>
      <span className="inline-flex items-center gap-1 bg-panel border border-line rounded-[2px] px-2 py-0.5 tabular-nums">진노 {s.wrath}<ImpactMark k="wrath" /></span>
    </div>
  );
}

function TargetPicker({ s }: { s: GameState }) {
  const setTarget = useGame((z) => z.setTarget);
  if (s.faction !== "voodoo") return null;
  const opts: RegionId[] = ["arkandal", "iruth", "neutral"];
  return (
    <div className="flex items-center gap-2 font-ui text-[12px] text-muted flex-wrap">
      <span>확산 대상:</span>
      {opts.map((o) => <button key={o} onClick={() => setTarget(o)} aria-pressed={s.target === o}
        className={`px-2 py-1 rounded-[2px] border ${s.target === o ? "border-gold text-gold bg-[#2a2216]" : "border-line"}`}>{REGION_NAME[o]} ({s.infection[o]})</button>)}
    </div>
  );
}

export function Game({ s }: { s: GameState }) {
  const { goEvents, chooseEvent, openActionCard, closeActionCard, chooseAction, finishTurn, advance, toTitle, openAction } = useGame();
  const [sheet, setSheet] = useState<null | "chron" | "rules">(null);
  const F = FACTIONS[s.faction];
  const V = s.faction === "voodoo";
  const last = s.chronicle[s.chronicle.length - 1];

  return (
    <section className="gutter max-w-[1120px] mx-auto py-5 pb-10">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2.5 pb-3.5 border-b border-line mb-4">
        <div className="flex items-center gap-2.5 min-w-0"><span className="w-7 h-7 shrink-0"><Illus keys={CREST[s.faction]} faction={s.faction} accent /></span>
          <div><h2 className="font-display text-[22px] leading-none">{F.name}</h2><div className="font-ui text-[12px] text-muted">{F.ruler} · 시드 {s.seed}</div></div></div>
        <div className="ml-auto text-right"><div className="font-display text-[22px] leading-none">{yearOf(s.turn)}년 {SEASON_KO[seasonOf(s.turn)]}</div><div className="font-ui text-[12px] text-muted">{s.turn} / 40턴</div></div>
        <div className="flex gap-1.5 w-full justify-end lg:w-auto">
          <button className="btn !px-2.5 !text-[12px]" onClick={() => setSheet("chron")}>연대기</button>
          <button className="btn !px-2.5 !text-[12px]" onClick={() => setSheet("rules")}>규칙</button>
          <button className="btn !px-2.5 !text-[12px]" onClick={toTitle}>처음으로</button>
        </div>
      </header>

      <div className="grid gap-[18px] lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start">
        <Dashboard s={s} />
        <main className="grid gap-3.5 min-w-0 order-first lg:order-none">
          <QuickStrip s={s} />
          <Phases s={s} />

          {s.phase === "start" && (
            <section className="bg-panel border border-line rounded p-[18px] grid gap-2.5">
              <div className="eyebrow">{yearOf(s.turn)}년 {SEASON_KO[seasonOf(s.turn)]} · 시작 결산</div>
              <h2 className="font-display text-[26px]">{s.turn === 1 ? "759년 봄, 통치가 시작됩니다" : "새 계절이 밝았습니다"}</h2>
              <ul className="m-0 pl-[18px] grid gap-1 text-[14px] text-[#d9cdb6]">{s.startReport.map((l, i) => <li key={i}>{l}</li>)}</ul>
              <div className="flex gap-2 flex-wrap"><button className="btn-gold" onClick={goEvents}>사건 카드 {s.events.length}장 펼치기</button></div>
            </section>
          )}

          {s.phase === "event" && s.events[s.eventIdx] && (
            <CardView key={`${s.turn}-${s.eventIdx}`} s={s} card={s.events[s.eventIdx]!} onPick={chooseEvent} />
          )}

          {s.phase === "action" && !openAction && (
            <section className="bg-panel border border-line rounded p-[18px] grid gap-3">
              <div className="flex justify-between items-center gap-2.5 flex-wrap">
                <h2 className="font-display text-[26px]">행동권</h2>
                <div className="flex gap-1.5 items-center font-ui text-[13px] text-muted">{[0, 1, 2].map((i) => <i key={i} className={`w-3.5 h-3.5 rotate-45 border border-gold inline-block ${i < s.ap ? "bg-gold" : ""}`} />)}<span>{s.ap}개 남음</span></div>
              </div>
              <TargetPicker s={s} />
              <p className="m-0 text-muted text-[14px]">{V ? "확산 행동은 성공할수록 은닉이 더 깎입니다. 남긴 행동권은 다음 계절로 이월됩니다." : "남긴 행동권은 다음 계절로 이월됩니다(최대 3)."}</p>
              <div className="grid [grid-template-columns:repeat(auto-fill,minmax(150px,1fr))] gap-2">
                {actionsFor(s, content).map((a) => (
                  <button key={a.id} onClick={() => openActionCard(a.id)} disabled={s.ap <= 0}
                    className="text-left bg-[#17130f] border border-line rounded-[3px] p-3 grid gap-0.5 hover:border-gold transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    <b className="font-display text-[20px] font-normal">{a.name}</b><span className="font-ui text-[12px] text-muted">{a.desc}</span></button>
                ))}
              </div>
              <div className="flex gap-2 flex-wrap"><button className="btn-gold" onClick={finishTurn}>계절을 마친다</button></div>
            </section>
          )}

          {s.phase === "action" && openAction && (() => {
            const act = actionsFor(s, content).find((a) => a.id === openAction) ?? content.actions.find((a) => a.id === openAction)!;
            return <CardView key={act.id} s={s} card={{ ...act.card, kind: `행동 · ${act.name}` }} onPick={(i) => chooseAction(act.id, i)}>
              <div className="flex gap-2 flex-wrap"><button className="btn" onClick={closeActionCard}>다른 행동 고르기</button></div>
            </CardView>;
          })()}

          {(s.phase === "end" || s.phase === "over") && (
            <section className="bg-panel border border-line rounded p-[18px] grid gap-2.5">
              <div className="eyebrow">{yearOf(s.turn)}년 {SEASON_KO[seasonOf(s.turn)]} · 종료 결산</div>
              <h2 className="font-display text-[26px]">계절 결산</h2>
              <ul className="m-0 pl-[18px] grid gap-1 text-[14px] text-[#d9cdb6]">{s.endReport.map((l, i) => <li key={i}>{l}</li>)}</ul>
              {s.aiReport.length > 0 && <div className="grid gap-1 text-[13px] text-muted border-t border-line pt-2.5"><span className="eyebrow">대륙 동향</span>{s.aiReport.map((l, i) => <div key={i}>· {l}</div>)}</div>}
              {last && <div className="text-[15px] border-l-2 border-gold-dim pl-3 text-ink"><span className="eyebrow">연대기</span><br />{last.year}년 {last.season} — {last.text}</div>}
              <div className="flex gap-2 flex-wrap"><button className="btn-gold" onClick={advance}>{s.ended ? "결말 보기" : `${yearOf(s.turn + 1)}년 ${SEASON_KO[seasonOf(s.turn + 1)]}으로`}</button></div>
            </section>
          )}
        </main>
      </div>

      {sheet === "chron" && <ChronicleSheet s={s} onClose={() => setSheet(null)} />}
      {sheet === "rules" && <RulesSheet onClose={() => setSheet(null)} />}
    </section>
  );
}
