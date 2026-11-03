import { FACTIONS, SEASON_KO, ci, infStage, scoreOf, seasonOf, yearOf, type GameState } from "@guul/engine";
import { useGame } from "../store/store";

export function Ending({ s }: { s: GameState }) {
  const toTitle = useGame((z) => z.toTitle);
  const e = s.ended!;
  const F = FACTIONS[s.faction];
  const score = e.score ?? scoreOf(s);
  const verdict = e.type === "victory" ? "승리" : e.type === "defeat" ? "패배" : "생존";
  const tone = e.type === "victory" ? "text-gold" : e.type === "defeat" ? "text-blood" : "text-frost";
  return (
    <section className="gutter max-w-[1120px] mx-auto">
      <div className="grid gap-4 max-w-[720px] py-8">
        <div className={`font-ui text-[13px] tracking-[0.14em] ${tone}`}>{verdict} · {F.name} · {yearOf(s.turn)}년 {SEASON_KO[seasonOf(s.turn)]}</div>
        <h1 className="font-display text-[clamp(40px,8vw,72px)] leading-[1.05]">{e.title}</h1>
        <p className="text-muted max-w-[62ch] m-0 text-[16px]">{e.text}</p>
        <div className="grid [grid-template-columns:repeat(auto-fit,minmax(130px,1fr))] gap-2">
          {([
            ["통치 기간", `${s.turn}턴`],
            [F.popName, `${s.res.pop.toFixed(1)} / ${s.startPop}만`],
            ["감염도 (최고)", `${s.infection[s.faction]} (${s.maxInfection})`],
            ["대륙 감염 CI", `${ci(s)}`],
            ["여신의 진노", `${s.wrath}`],
            ["점수", `${score}`],
          ] as [string, string][]).map(([k, v]) => (
            <div key={k} className="bg-panel border border-line p-2.5 rounded-[3px]"><small className="block font-ui text-[11px] text-faint">{k}</small><b className="font-ui text-[18px] font-medium tabular-nums">{v}</b></div>
          ))}
        </div>
        <h2 className="font-display text-[24px] mt-2">연대기</h2>
        <ol className="grid gap-2.5 m-0 p-0 list-none">
          {s.chronicle.slice().reverse().map((c, i) => (
            <li key={i} className="grid grid-cols-[86px_1fr] gap-2.5 text-[14px] border-b border-line pb-2">
              <div><div className="font-ui text-[12px] text-gold-dim">{c.year}년 {c.season}</div><div className="font-ui text-[11px] text-faint">감염도 {c.infection} · {infStage(c.infection)}</div></div>
              <div>{c.text}</div>
            </li>
          ))}
        </ol>
        <div className="flex gap-2 flex-wrap mt-2"><button className="btn-gold" onClick={toTitle}>새로 시작</button></div>
      </div>
    </section>
  );
}
