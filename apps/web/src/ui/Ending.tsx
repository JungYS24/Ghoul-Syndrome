import { useEffect, useState } from "react";
import { DIFFICULTIES, FACTIONS, SEASON_KO, ci, epilogueOf, infStage, scoreOf, seasonOf, yearOf, type GameState } from "@guul/engine";
import { content, useGame } from "../store/store";
import { shareUrl } from "../store/share";

function ShareLink({ s }: { s: GameState }) {
  const url = shareUrl(typeof window !== "undefined" ? window.location.href : "", s);
  const [copied, setCopied] = useState<null | "ok" | "fail">(null);
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied("ok"); } catch { setCopied("fail"); }
  };
  return (
    <div className="grid gap-1.5 bg-panel border border-line rounded-[3px] p-3">
      <span className="eyebrow">시드 공유</span>
      <p className="m-0 text-[13px] text-muted">같은 링크로 시작하면 같은 세력·시드·난이도로 같은 주사위가 굴러갑니다.</p>
      <div className="flex gap-2 items-center flex-wrap">
        <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} aria-label="공유 링크"
          className="flex-1 min-w-0 bg-[#15120e] border border-line text-ink px-2.5 py-1.5 rounded-[3px] font-ui text-[12px]" />
        <button className="btn" onClick={copy}>{copied === "ok" ? "복사됨" : "링크 복사"}</button>
      </div>
      {copied === "fail" && <span className="font-ui text-[11px] text-blood">복사할 수 없습니다. 위 칸을 직접 선택해 복사하세요.</span>}
    </div>
  );
}

export function Ending({ s }: { s: GameState }) {
  const toTitle = useGame((z) => z.toTitle);
  const recordEnding = useGame((z) => z.recordEnding);
  const e = s.ended!;
  const F = FACTIONS[s.faction];
  const score = e.score ?? scoreOf(s);
  const verdict = e.type === "victory" ? "승리" : e.type === "defeat" ? "패배" : "생존";
  const tone = e.type === "victory" ? "text-gold" : e.type === "defeat" ? "text-blood" : "text-frost";
  useEffect(() => { recordEnding(s); }, [s, recordEnding]);
  return (
    <section className="gutter max-w-[1120px] mx-auto">
      <div className="grid gap-4 max-w-[720px] py-8">
        <div className={`font-ui text-[13px] tracking-[0.14em] ${tone}`}>{verdict} · {F.name} · {yearOf(s.turn)}년 {SEASON_KO[seasonOf(s.turn)]} · {DIFFICULTIES[s.difficulty].name}</div>
        <h1 className="font-display text-[clamp(40px,8vw,72px)] leading-[1.05]">{e.title}</h1>
        <p className="text-muted max-w-[62ch] m-0 text-[16px]">{e.text}</p>
        <blockquote className="m-0 border-l-2 border-gold-dim pl-3.5 text-[15px] text-ink max-w-[62ch]">
          <span className="eyebrow block mb-1">후기</span>
          {epilogueOf(s, content.decrees)}
        </blockquote>
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
        <ShareLink s={s} />
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
