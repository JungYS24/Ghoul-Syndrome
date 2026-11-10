import {
  FACTIONS, REGION_NAME, canAfford, checkModifiers, choiceImpact, labelOf, mapKey, successChance,
  type Card, type Choice, type EffectKey, type GameState,
} from "@guul/engine";
import { Illus } from "../art/Art";
import { useGame } from "../store/store";
import { HEADER_IDS, headerUrl } from "../art/headers";

// 헤더 일러스트: 제미나이 시트에서 자른 이미지가 있으면 쓰고, 없으면 SVG 심볼 조합으로 폴백
function HeaderArt({ card, faction }: { card: Card; faction: GameState["faction"] }) {
  if (HEADER_IDS.has(card.id)) {
    return (
      <img src={headerUrl(card.id)} alt="" loading="lazy" width={512} height={512}
        className="w-full max-w-[460px] max-h-[30vh] lg:max-h-none mx-auto aspect-square object-contain rounded-[4px] shadow-[0_10px_28px_-12px_#000]" />
    );
  }
  return card.art ? <div className="w-full h-[clamp(120px,30vw,230px)] grid place-items-center opacity-95"><Illus keys={card.art} faction={faction} accent /></div> : null;
}

// 효과 미리보기 칩
function isBad(s: GameState, k: EffectKey): boolean {
  if (k === "infection" || k === "wrath" || k === "voodooPower") return true;
  if (k === "neutral") return s.faction !== "voodoo";
  return false;
}
function fmt(k: EffectKey, v: number) {
  const unit = k === "pop" || k === "army" || k === "silver" ? "만" : k === "food" || k === "strat" || k === "stone" ? "t" : "";
  const n = k === "pop" || k === "army" ? Math.abs(v).toFixed(1) : String(Math.abs(Math.round(v)));
  return (v > 0 ? "+" : "−") + n + unit;
}
function Chips({ s, choice, target }: { s: GameState; choice: Choice; target?: string }) {
  const chips: { t: string; good: boolean; fail?: boolean }[] = [];
  const push = (eff: Choice["effects"], fail: boolean) => {
    for (const [rk, v0] of Object.entries(eff ?? {}) as [EffectKey, number][]) {
      if (rk === "relTo") { const t = choice.target ?? (target as "arkandal" | "iruth" | undefined); if (s.faction === "voodoo" || choice.target === s.faction) continue; chips.push({ t: `${t ? FACTIONS[t as "arkandal"].short : ""} 관계 ${fmt("relTo", v0)}`, good: v0 > 0, fail }); continue; }
      const k = mapKey(s, rk); if (!k || !v0) continue;
      chips.push({ t: `${labelOf(s, k)} ${fmt(k, v0)}`, good: (v0 > 0) !== isBad(s, k), fail });
    }
  };
  push(choice.effects, false);
  if (choice.onFail) push(choice.onFail, true);
  return (
    <span className="flex flex-wrap gap-1">
      {chips.map((c, i) => (
        <span key={i} className={`chip ${c.good ? "text-frost border-[#3d5560]" : "text-[#d98a74] border-[#5a3328]"} ${c.fail ? "border-dashed" : ""}`}>{c.fail ? "실패 시 " : ""}{c.t}</span>
      ))}
    </span>
  );
}

export function ChoiceButton({ s, choice, onPick, disabled }: { s: GameState; choice: Choice; onPick: () => void; disabled?: boolean }) {
  const afford = canAfford(s, choice);
  const setPreview = useGame((z) => z.setPreview);
  const m = checkModifiers(s, choice);
  const sign = (n: number) => (n >= 0 ? "+" : "−") + Math.abs(n);
  // 자기 세력과의 "협상"은 내부 회의로 표기 (아이루스=가문회, 아르칸달=제후 회의)
  const COUNCIL: Record<string, string> = { arkandal: "제후 회의", iruth: "가문회", voodoo: "비밀 회합" };
  const label = choice.target === s.faction ? `${FACTIONS[s.faction].short} 내 ${COUNCIL[s.faction] ?? "가문회"}` : choice.label;
  return (
    <button onClick={onPick} disabled={disabled || !afford}
      onMouseEnter={() => setPreview(choiceImpact(s, choice))} onMouseLeave={() => setPreview(null)}
      onFocus={() => setPreview(choiceImpact(s, choice))} onBlur={() => setPreview(null)}
      onTouchStart={() => setPreview(choiceImpact(s, choice))}
      className="seal-btn p-3 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5 items-center disabled:opacity-55 disabled:cursor-not-allowed">
      <span className="font-body text-[17px] font-bold col-start-1">{label}</span>
      {choice.art && <span className="row-span-2 col-start-2 w-12 h-12 shrink-0"><Illus keys={choice.art} faction={s.faction} /></span>}
      <span className="col-start-1 grid gap-1.5">
        <span className="font-ui text-[13px] text-muted flex flex-wrap gap-x-2.5 gap-y-0.5">
          <span>판정 {m.statLabel} {sign(m.statMod)}</span>
          {m.choiceMod ? <span>난이도 {sign(m.choiceMod)}</span> : null}
          {m.stateMod ? <span>상태 {sign(m.stateMod)}</span> : null}
          <span className="text-gold">성공 약 {successChance(s, choice)}%</span>
          {!afford && <span className="text-blood">자원 부족</span>}
        </span>
        <Chips s={s} choice={choice} />
      </span>
    </button>
  );
}

export function CardView({ s, card, kind, onPick, disabled, children }: { s: GameState; card: Card; kind?: string; onPick: (i: number) => void; disabled?: boolean; children?: React.ReactNode }) {
  return (
    <article className="letter relative p-[18px_14px_16px] sm:p-[26px_24px_24px] grid gap-3 sm:gap-3.5 card-deal">
      <span className="pointer-events-none absolute inset-1.5 border border-[#3e3328] rounded-[2px]" aria-hidden="true" />
      <div className="flex justify-between gap-2 font-ui text-[12px] text-gold-dim"><span>{kind ?? card.kind ?? ""}</span><span>{REGION_NAME[s.faction]}</span></div>
      <HeaderArt card={card} faction={s.faction} />

      <h2 className="font-display text-[clamp(22px,4.5vw,32px)] leading-tight">{card.title}</h2>
      <p className="m-0 max-w-[62ch] text-[16px] leading-[1.7] sm:text-[18px] sm:leading-[1.8] font-medium text-[#ece2c8]">{card.text}</p>
      <div className="grid gap-2.5">{card.choices.map((c, i) => <ChoiceButton key={i} s={s} choice={c} onPick={() => onPick(i)} disabled={disabled} />)}</div>
      {children}
    </article>
  );
}
