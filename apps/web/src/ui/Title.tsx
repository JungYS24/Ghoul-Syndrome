import { useState } from "react";
import { FACTIONS, FACTION_IDS, SEASON_KO, seasonOf, yearOf, type FactionId } from "@guul/engine";
import { content } from "@guul/content";
import { useGame } from "../store/store";
import { Illus } from "../art/Art";
import { MuteToggle } from "./MuteToggle";
import { RulesSheet } from "./Sheets";

const CREST: Record<FactionId, string[]> = { arkandal: ["fortress", "shield"], iruth: ["ship", "scales"], voodoo: ["altar", "eye"] };

export function Title() {
  const start = useGame((z) => z.start);
  const hasSave = useGame((z) => z.hasSave);
  const cont = useGame((z) => z.continueSave);
  const [seed, setSeed] = useState(() => String(Math.floor(Math.random() * 900000) + 100000));
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
      <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(270px,1fr))]">
        {FACTION_IDS.map((id) => {
          const F = FACTIONS[id];
          return (
            <button key={id} onClick={() => start(id, (parseInt(seed, 10) || 1) >>> 0)}
              className="text-left bg-panel border border-line rounded p-[18px] grid gap-2.5 content-start hover:border-gold-dim hover:-translate-y-0.5 transition-all" data-faction={id}>
              <div className="flex items-center gap-2.5"><span className="w-11 h-11 shrink-0"><Illus keys={CREST[id]} faction={id} accent /></span>
                <div><h2 className="font-display text-[26px] leading-tight">{F.name}</h2><div className="font-ui text-[12px] text-muted">{F.ruler}</div></div></div>
              <p className="m-0 text-[14px] text-[#d9cdb6]">{F.tagline}</p>
              <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-2.5 gap-y-1 text-[13px]">
                <dt className="font-ui text-faint text-[12px] pt-px">강점</dt><dd className="m-0 text-ink">{F.strength}</dd>
                <dt className="font-ui text-faint text-[12px] pt-px">약점</dt><dd className="m-0 text-ink">{F.weakness}</dd>
                <dt className="font-ui text-faint text-[12px] pt-px">승리</dt><dd className="m-0 text-ink">{F.victory} — {F.victoryText}</dd>
              </dl>
              <div className="font-ui text-[13px] text-gold mt-1">이 세력으로 시작 →</div>
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
      {rules && <RulesSheet onClose={() => setRules(false)} />}
    </section>
  );
}
