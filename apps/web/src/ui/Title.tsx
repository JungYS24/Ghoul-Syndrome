import { useState } from "react";
import { DIFFICULTIES, DIFFICULTY_IDS, ENDINGS, FACTIONS, FACTION_IDS, type Difficulty, type FactionId } from "@guul/engine";
import { content } from "@guul/content";
import { useGame } from "../store/store";
import { Illus } from "../art/Art";
import { MuteToggle } from "./MuteToggle";
import { RulesSheet } from "./Sheets";
import { parseShare } from "../store/share";

const shared = typeof window !== "undefined" ? parseShare(window.location.search) : {};

const CREST: Record<FactionId, string[]> = { arkandal: ["fortress", "shield"], iruth: ["ship", "scales"], voodoo: ["altar", "eye"] };

export function Title() {
  const start = useGame((z) => z.start);
  const hasSave = useGame((z) => z.hasSave);
  const cont = useGame((z) => z.continueSave);
  const [seed, setSeed] = useState(() => String(shared.seed ?? Math.floor(Math.random() * 900000) + 100000));
  const [diff, setDiff] = useState<Difficulty>(shared.difficulty ?? "normal");
  const [rules, setRules] = useState(false);
  return (
    <section className="gutter max-w-[1120px] mx-auto py-5 pb-10">
      <div className="flex justify-between items-start gap-3">
        <div className="eyebrow pt-1">The Game of Peace · 여신력 759년 봄</div>
        <MuteToggle />
      </div>
      <div className="grid gap-2.5 max-w-[760px] py-5">
        <h1 className="font-display text-[clamp(44px,9vw,84px)] leading-none">구울 <span className="text-gold">증후군</span></h1>
        <p className="text-muted max-w-[62ch] m-0">발푸르기스의 밤으로부터 10년. 시신이 다시 일어나 산 자를 먹는 대륙에서, 세 세력 중 하나를 골라 40계절 동안 나라를 이끄십시오. 모든 결정은 20면체 다섯 개로 판정됩니다.</p>
      </div>
      <div className="grid gap-1.5 my-4 p-3.5 border-l-2 border-gold-dim bg-gradient-to-r from-[#1f1a14] to-transparent max-w-[760px] text-[14px] text-muted">
        <div><b className="text-ink font-bold">749년, 발푸르기스의 밤.</b> 마도왕 필립스 프리오는 재가 되고 불의 신 그니스는 소멸했습니다. 인공신 스틱스 아이루스가 아이루스 공국을 지키고, 여신 샤리아의 진노는 0으로 돌아왔습니다.</div>
        <div><b className="text-ink font-bold">752년, 라벤 폐허.</b> 몰락한 마도왕국의 옛 영토에서 구울 증후군이 처음 발병했습니다. 물린 사람은 한 계절 뒤 같은 것이 됩니다.</div>
        <div><b className="text-ink font-bold">759년 봄.</b> 세 세력은 서로를 구원자이자 감염원으로 의심합니다. 여신은 침묵하지만, 무고한 피는 여전히 셈하고 있습니다.</div>
      </div>
      {shared.seed !== undefined && <p className="font-ui text-[13px] text-gold m-0 mb-3">공유 링크로 열었습니다 — 시드 {shared.seed}{shared.difficulty ? ` · ${DIFFICULTIES[shared.difficulty].name}` : ""}. 같은 세력·시드·난이도면 같은 주사위가 굴러갑니다.</p>}
      <fieldset className="border-0 p-0 m-0 mb-3.5 flex flex-wrap items-center gap-2 font-ui text-[13px]">
        <legend className="sr-only">난이도</legend>
        <span className="text-muted mr-1">난이도</span>
        {DIFFICULTY_IDS.map((d) => (
          <button key={d} type="button" aria-pressed={diff === d} onClick={() => setDiff(d)} title={DIFFICULTIES[d].desc}
            className={`px-3 py-1.5 rounded-[3px] border ${diff === d ? (d === "hell" ? "border-blood text-blood bg-[#2a1712]" : "border-gold text-gold bg-[#2a2216]") : "border-line text-muted"}`}>{DIFFICULTIES[d].name}</button>
        ))}
        <span className="text-faint text-[12px]">{DIFFICULTIES[diff].desc}</span>
      </fieldset>
      <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(270px,1fr))]">
        {FACTION_IDS.map((id) => {
          const F = FACTIONS[id];
          return (
            <button key={id} onClick={() => start(id, (parseInt(seed, 10) || 1) >>> 0, diff)}
              className={`text-left bg-panel border rounded p-[18px] grid gap-2.5 content-start hover:border-gold-dim hover:-translate-y-0.5 transition-all ${shared.faction === id ? "border-gold" : "border-line"}`} data-faction={id}>
              <div className="flex items-center gap-2.5"><span className="w-11 h-11 shrink-0"><Illus keys={CREST[id]} faction={id} accent /></span>
                <div><h2 className="font-display text-[26px] leading-tight">{F.name}</h2><div className="font-ui text-[12px] text-muted">{F.ruler}</div></div></div>
              <p className="m-0 text-[14px] text-[#d9cdb6]">{F.tagline}</p>
              <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-2.5 gap-y-1 text-[13px]">
                <dt className="font-ui text-faint text-[12px] pt-px">강점</dt><dd className="m-0 text-ink">{F.strength}</dd>
                <dt className="font-ui text-faint text-[12px] pt-px">약점</dt><dd className="m-0 text-ink">{F.weakness}</dd>
                <dt className="font-ui text-faint text-[12px] pt-px">승리</dt><dd className="m-0 text-ink">{F.victory} — {F.victoryText}</dd>
              </dl>
              <div className="font-ui text-[13px] text-gold mt-1">{shared.faction === id ? "공유된 판으로 시작 →" : "이 세력으로 시작 →"}</div>
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3 items-center mt-5 font-ui text-[13px] text-muted">
        <label htmlFor="seed" className="flex items-center gap-2">시드
          <input id="seed" inputMode="numeric" value={seed} onChange={(e) => setSeed(e.target.value.replace(/\D/g, ""))}
            className="bg-panel border border-line text-ink px-2.5 py-1.5 rounded-[3px] w-32 font-ui tabular-nums" /></label>
        <span>같은 시드는 같은 주사위를 굴립니다.</span>
        {hasSave && <button className="btn" onClick={cont}>이어하기</button>}
        <button className="btn" onClick={() => setRules(true)}>규칙 보기</button>
      </div>
      <p className="font-ui text-[11px] text-faint mt-6">카드 {content.cards.length}장 · 일러스트 심볼 벡터 · 주사위 데모는 <a className="text-gold-dim underline" href="./dice.html">/dice.html</a>, 일러스트 갤러리는 <a className="text-gold-dim underline" href="./art.html">/art.html</a></p>
      <EndingCollection />
      {rules && <RulesSheet onClose={() => setRules(false)} />}
    </section>
  );
}

const TYPE_LABEL = { victory: "승리", defeat: "패배", survive: "생존" } as const;
const TYPE_CLASS = { victory: "text-gold border-gold-dim", defeat: "text-blood border-[#5a3328]", survive: "text-frost border-[#3d5560]" } as const;

/** 엔딩 컬렉션 — IndexedDB 에 저장된 달성 기록 */
function EndingCollection() {
  const book = useGame((z) => z.book);
  const got = ENDINGS.filter((e) => book[e.id]).length;
  return (
    <section className="mt-7 grid gap-2.5" aria-labelledby="ending-col">
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <h2 id="ending-col" className="font-display text-[24px]">엔딩 컬렉션</h2>
        <span className="font-ui text-[13px] text-muted tabular-nums">{got} / {ENDINGS.length} 달성</span>
      </div>
      <ul className="m-0 p-0 list-none grid gap-1.5 [grid-template-columns:repeat(auto-fill,minmax(190px,1fr))]">
        {ENDINGS.map((e) => {
          const rec = book[e.id];
          const who = e.factions ? e.factions.map((f) => FACTIONS[f].short).join("·") : "공통";
          return (
            <li key={e.id} className={`bg-panel border rounded-[3px] px-2.5 py-2 grid gap-0.5 ${rec ? "border-line2" : "border-line opacity-60"}`} title={rec ? e.text : "아직 보지 못한 결말"}>
              <span className="flex items-center gap-1.5 font-ui text-[11px]"><span className={`px-1 border rounded-[2px] ${TYPE_CLASS[e.type]}`}>{TYPE_LABEL[e.type]}</span><span className="text-faint">{who}</span></span>
              <b className="font-display text-[17px] font-normal leading-tight">{rec ? e.title : "？？？"}</b>
              {rec && <span className="font-ui text-[11px] text-faint tabular-nums">{rec.count}회 · 최고 {DIFFICULTIES[rec.bestDifficulty].name}</span>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
