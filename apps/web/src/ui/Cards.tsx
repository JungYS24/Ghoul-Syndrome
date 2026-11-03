import {
  FACTIONS, REGION_NAME, canAfford, checkModifiers, labelOf, mapKey, successChance,
  type Card, type Choice, type EffectKey, type GameState,
} from "@guul/engine";
import { Illus } from "../art/Art";
import { HEADER_IDS, headerUrl } from "../art/headers";

// 헤더 일러스트: 제미나이 시트에서 자른 이미지가 있으면 쓰고, 없으면 SVG 심볼 조합으로 폴백
function HeaderArt({ card, faction }: { card: Card; faction: GameState["faction"] }) {
  if (HEADER_IDS.has(card.id)) {
    return (
      <img src={headerUrl(card.id)} alt="" loading="lazy" width={96} height={96}
        className="w-24 h-24 rounded-[3px] border border-line2 object-cover self-center justify-self-start shadow-[0_6px_16px_-8px_#000]" />
    );
  }
  return card.art ? <div className="h-20 -mt-1 self-center justify-self-start w-28 opacity-95"><Illus keys={card.art} faction={faction} accent /></div> : null;
}

// 효과 미리보기 칩
function isBad(s: GameState, k: EffectKey): boolean {
  if (k === "infection" || k === "wrath" || k === "voodooPower") return true;
  if (k === "neutral") return s.faction !== "voodoo";
  return false;
}
function fmt(k: EffectKey, v: number) {
  const unit = k === "pop" || k === "army" ? "만" : "";
  const n = k === "pop" || k === "army" ? Math.abs(v).toFixed(1) : String(Math.abs(Math.round(v)));
  return (v > 0 ? "+" : "−") + n + unit;
}
function Chips({ s, choice, target }: { s: GameState; choice: Choice; target?: string }) {
  const chips: { t: string; good: boolean; fail?: boolean }[] = [];
  const push = (eff: Choice["effects"], fail: boolean) => {
    for (const [rk, v0] of Object.entries(eff ?? {}) as [EffectKey, number][]) {
      if (rk === "relTo") { const t = choice.target ?? (target as "arkandal" | "iruth" | undefined); if (s.faction === "voodoo") continue; chips.push({ t: `${t ? FACTIONS[t as "arkandal"].short : ""} 관계 ${fmt("relTo", v0)}`, good: v0 > 0, fail }); continue; }
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
  const m = checkModifiers(s, choice);
  const sign = (n: number) => (n >= 0 ? "+" : "−") + Math.abs(n);
  return (
    <button onClick={onPick} disabled={disabled || !afford}
      className="text-left bg-[#17130f] border border-line rounded-[3px] p-3 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5 items-center hover:border-gold hover:bg-[#1d1812] transition-colors disabled:opacity-45 disabled:cursor-not-allowed">
      <span className="font-body text-[16px] font-bold col-start-1">{choice.label}</span>
      {choice.art && <span className="row-span-2 col-start-2 w-12 h-12 shrink-0"><Illus keys={choice.art} faction={s.faction} /></span>}
      <span className="col-start-1 grid gap-1.5">
        <span className="font-ui text-[12px] text-muted flex flex-wrap gap-x-2.5 gap-y-0.5">
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
    <article className="relative bg-gradient-to-b from-[#2a231b] to-[#211b15] border border-line2 rounded p-[22px_22px_20px] grid gap-3.5 shadow-[0_18px_40px_-24px_#000] card-deal">
      <span className="pointer-events-none absolute inset-1.5 border border-[#3e3328] rounded-[2px]" aria-hidden="true" />
      <div className="flex justify-between gap-2 font-ui text-[12px] text-gold-dim"><span>{kind ?? card.kind ?? ""}</span><span>{REGION_NAME[s.faction]}</span></div>
      <HeaderArt card={card} faction={s.faction} />

      <h2 className="font-display text-[clamp(24px,4.5vw,32px)] leading-tight">{card.title}</h2>
      <p className="m-0 max-w-[62ch] text-[#d9cdb6]">{card.text}</p>
      <div className="grid gap-2.5">{card.choices.map((c, i) => <ChoiceButton key={i} s={s} choice={c} onPick={() => onPick(i)} disabled={disabled} />)}</div>
      {children}
    </article>
  );
}
