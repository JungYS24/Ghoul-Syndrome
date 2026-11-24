// 실시간 모드 우측 배너용 압축 카드: 1:1 그림 + 제목·본문, 그 아래 정사각형 선택 버튼.
// 판정 자원 투입은 버튼마다 두지 않고 한 줄로 공유합니다(고른 단계가 그 선택지에 허용될 때만 적용).
import { useState } from "react";
import {
  FACTIONS, boostOptions, canAfford, checkModifiers, choiceImpact, successChance, successChanceWith,
  type Boost, type Card, type Choice, type GameState,
} from "@guul/engine";
import { Illus } from "../art/Art";
import { HEADER_IDS, headerUrl } from "../art/headers";
import { useGame } from "../store/store";
import { ImpactLine } from "./Cards";

const COUNCIL: Record<string, string> = { arkandal: "제후 회의", iruth: "가문회", voodoo: "비밀 회합" };
const sign = (n: number) => (n >= 0 ? "+" : "−") + Math.abs(n);

/** 공유 투입 단계(비용 기준)를 이 선택지에 맞는 Boost 로 — 허용되지 않으면 undefined */
export function boostFor(s: GameState, choice: Choice, cost: number | null): Boost | undefined {
  if (cost === null) return undefined;
  return boostOptions(s, choice).find((o) => o.cost === cost);
}

function SquareArt({ card, faction }: { card: Card; faction: GameState["faction"] }) {
  if (HEADER_IDS.has(card.id)) {
    return <img src={headerUrl(card.id)} alt="" loading="lazy" width={512} height={512} draggable={false}
      className="w-full aspect-square object-cover rounded-[4px] border border-line2 shadow-[0_10px_28px_-12px_#000]" />;
  }
  return <div className="w-full aspect-square grid place-items-center rounded-[4px] border border-line2 bg-[#2a231b]">{card.art ? <Illus keys={card.art} faction={faction} accent className="w-3/4 h-3/4" /> : null}</div>;
}

function ChoiceTile({ s, choice, boostCost, onPick, disabled }: { s: GameState; choice: Choice; boostCost: number | null; onPick: (b?: Boost) => void; disabled?: boolean }) {
  const setPreview = useGame((z) => z.setPreview);
  const afford = canAfford(s, choice);
  const boost = boostFor(s, choice, boostCost);
  const m = checkModifiers(s, choice);
  const chance = boost ? successChanceWith(s, choice, boost.mod) : successChance(s, choice);
  const label = choice.target === s.faction ? `${FACTIONS[s.faction].short} 내 ${COUNCIL[s.faction] ?? "가문회"}` : choice.label;
  const show = () => setPreview(choiceImpact(s, choice));
  const hide = () => setPreview(null);
  return (
    <button type="button" onClick={() => onPick(boost)} disabled={disabled || !afford}
      onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}
      className="seal-btn choice-tile aspect-square p-2.5 grid grid-rows-[auto_1fr_auto] gap-1 text-left disabled:opacity-55 disabled:cursor-not-allowed">
      <span className="font-body text-[15px] font-bold leading-snug line-clamp-3">{label}</span>
      <span className="self-end text-[11px] leading-snug"><ImpactLine s={s} choice={choice} /></span>
      <span className="flex items-baseline justify-between gap-1 font-ui">
        <span className="text-[11px] text-muted truncate">{m.statLabel} {sign(m.statMod + (boost?.mod ?? 0))}</span>
        <b className={`text-[18px] tabular-nums ${afford ? "text-[#7a1a14]" : "text-blood"}`}>{afford ? `${chance}%` : "부족"}</b>
      </span>
    </button>
  );
}

export function BannerCard({ s, card, kind, onPick, children }: { s: GameState; card: Card; kind?: string; onPick: (i: number, boost?: Boost) => void; children?: React.ReactNode }) {
  const [boostCost, setBoostCost] = useState<number | null>(null);
  // 투입 단계: 선택지 중 하나라도 허용하는 비용들
  const tiers = [...new Map(card.choices.flatMap((c) => boostOptions(s, c)).map((o) => [o.cost, o])).values()].sort((a, b) => a.cost - b.cost);
  return (
    <article className="letter banner-card relative p-3.5 grid gap-3 card-deal">
      <span className="pointer-events-none absolute inset-1.5 border border-[#3e3328] rounded-[2px]" aria-hidden="true" />
      <div className="grid gap-3 sm:grid-cols-[minmax(0,46%)_1fr] items-start">
        <SquareArt card={card} faction={s.faction} />
        <div className="grid gap-1.5 content-start min-w-0">
          <span className="font-ui text-[11px] text-gold-dim">{kind ?? card.kind ?? ""}</span>
          <h2 className="font-display text-[22px] leading-tight">{card.title}</h2>
          <p className="m-0 text-[14.5px] leading-[1.65] font-medium text-[#ece2c8]">{card.text}</p>
        </div>
      </div>
      <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(120px,150px))] justify-center sm:justify-start">
        {card.choices.map((c, i) => <ChoiceTile key={i} s={s} choice={c} boostCost={boostCost} onPick={(b) => onPick(i, b)} />)}
      </div>
      {tiers.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 font-ui text-[11px]">
          <span className="text-faint">판정에 투입:</span>
          <button type="button" aria-pressed={boostCost === null} onClick={() => setBoostCost(null)}
            className={`px-1.5 py-0.5 rounded-[2px] border ${boostCost === null ? "border-gold text-gold" : "border-line text-muted"}`}>없음</button>
          {tiers.map((o) => (
            <button key={o.cost} type="button" aria-pressed={boostCost === o.cost} onClick={() => setBoostCost(o.cost)}
              className={`px-1.5 py-0.5 rounded-[2px] border ${boostCost === o.cost ? "border-gold text-gold bg-[#2a2216]" : "border-line text-muted"}`}>{o.label} {o.cost} → +{o.mod}</button>
          ))}
        </div>
      )}
      {children}
    </article>
  );
}
