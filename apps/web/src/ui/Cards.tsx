import { useCallback, useEffect, useRef, useState } from "react";
import {
  FACTIONS, REGION_NAME, canAfford, checkModifiers, choiceImpact, labelOf, mapKey, successChance,
  type Card, type Choice, type EffectKey, type GameState,
} from "@guul/engine";
import { Illus } from "../art/Art";
import { HEADER_IDS, headerUrl } from "../art/headers";
import { useGame } from "../store/store";
import { keyToChoice, swipeDecision, swipeThreshold, type SwipeDecision } from "./swipe";

// 헤더 일러스트: 제미나이 시트에서 자른 이미지가 있으면 쓰고, 없으면 SVG 심볼 조합으로 폴백
function HeaderArt({ card, faction }: { card: Card; faction: GameState["faction"] }) {
  if (HEADER_IDS.has(card.id)) {
    return (
      <img src={headerUrl(card.id)} alt="" loading="lazy" draggable={false} width={512} height={512}
        className="w-full h-[clamp(190px,48vw,360px)] rounded-[4px] border border-line2 object-cover object-center shadow-[0_10px_28px_-12px_#000]" />
    );
  }
  return card.art ? <div className="w-full h-[clamp(150px,34vw,230px)] grid place-items-center opacity-95"><Illus keys={card.art} faction={faction} accent /></div> : null;
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

const LETTER = ["A", "B", "C", "D"];
const ARROW = ["←", "→", "↑", ""];
const prefersReducedMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function ChoiceButton({ s, choice, index, onPick, disabled, highlight }: { s: GameState; choice: Choice; index: number; onPick: () => void; disabled?: boolean; highlight?: boolean }) {
  const setPreview = useGame((z) => z.setPreview);
  const afford = canAfford(s, choice);
  const m = checkModifiers(s, choice);
  const sign = (n: number) => (n >= 0 ? "+" : "−") + Math.abs(n);
  const show = () => setPreview(choiceImpact(s, choice));
  const hide = () => setPreview(null);
  return (
    <button onClick={onPick} disabled={disabled || !afford} onPointerEnter={(e) => { if (e.pointerType === "mouse") show(); }} onPointerLeave={hide} onFocus={show} onBlur={hide}
      className={`text-left bg-[#17130f] border rounded-[3px] p-3 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5 items-center hover:border-gold hover:bg-[#1d1812] transition-colors disabled:opacity-45 disabled:cursor-not-allowed ${highlight ? "border-gold bg-[#1d1812]" : "border-line"}`}>
      <span className="font-body text-[16px] font-bold col-start-1 flex items-baseline gap-2">
        <span className="font-ui text-[11px] font-medium text-gold-dim border border-line2 rounded-[2px] px-1 shrink-0" aria-label={`선택지 ${LETTER[index]}`}>{ARROW[index]} {LETTER[index]}</span>
        <span>{choice.label}</span>
      </span>
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

const DIR_LABEL = { left: "←", right: "→", up: "↑" } as const;

/**
 * 사건/행동 카드. 카드 앞면(일러스트·제목)을 좌우로 끌면 A/B, 선택지가 3개면 위로 밀어 C.
 * 끄는 동안 해당 선택지가 건드리는 게이지·자원에 점이 뜹니다. 버튼·키보드(← → ↑)도 그대로 씁니다.
 */
export function CardView({ s, card, kind, onPick, disabled, children }: { s: GameState; card: Card; kind?: string; onPick: (i: number) => void; disabled?: boolean; children?: React.ReactNode }) {
  const setPreview = useGame((z) => z.setPreview);
  const diceOpen = useGame((z) => !!z.dice);
  const n = card.choices.length;
  const ref = useRef<HTMLElement>(null);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);
  const [leaving, setLeaving] = useState<SwipeDecision["dir"]>(null);
  const reduced = prefersReducedMotion();
  const locked = !!disabled || diceOpen || leaving !== null;

  const allowed = useCallback((i: number | null) => i !== null && !!card.choices[i] && canAfford(s, card.choices[i]!), [card.choices, s]);
  const decide = (dx: number, dy: number) => swipeDecision(dx, n >= 3 ? dy : 0, n, swipeThreshold(ref.current?.offsetWidth ?? 360));
  const cur = drag ? decide(drag.dx, drag.dy) : null;

  // 카드가 바뀌면 미리보기를 지웁니다
  useEffect(() => () => setPreview(null), [card.id, setPreview]);

  // 키보드: ← A, → B, ↑ C
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (locked || e.altKey || e.ctrlKey || e.metaKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (document.querySelector('[role="dialog"]')) return;
      const i = keyToChoice(e.key, n);
      if (i === null) return;
      e.preventDefault();
      if (allowed(i)) onPick(i);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [locked, n, allowed, onPick]);

  const onDown = (e: React.PointerEvent) => {
    if (locked || (e.pointerType === "mouse" && e.button !== 0)) return;
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* 합성 이벤트 등 캡처 불가 */ }
    setDrag({ dx: 0, dy: 0 });
  };
  const onMove = (e: React.PointerEvent) => {
    const st = start.current; if (!st || st.id !== e.pointerId) return;
    const dx = e.clientX - st.x, dy = e.clientY - st.y;
    setDrag({ dx, dy });
    const d = decide(dx, dy);
    setPreview(d.index !== null ? choiceImpact(s, card.choices[d.index]!) : null);
  };
  const onUp = (e: React.PointerEvent) => {
    const st = start.current; if (!st || st.id !== e.pointerId) return;
    start.current = null;
    const d = decide(e.clientX - st.x, e.clientY - st.y);
    setDrag(null);
    setPreview(null);
    if (!d.committed || !allowed(d.index)) return; // 임계 거리 미만이거나 감당 못 하면 제자리로
    if (reduced) { onPick(d.index!); return; }
    setLeaving(d.dir);
    window.setTimeout(() => { setLeaving(null); onPick(d.index!); }, 200);
  };
  const onCancel = () => { if (!start.current) return; start.current = null; setDrag(null); setPreview(null); };

  // 카드 변형: 끄는 동안 손을 따라오고, 확정되면 날아가고, 아니면 제자리로
  let tx = 0, ty = 0, rot = 0;
  if (drag) { tx = cur?.dir === "up" ? drag.dx * 0.3 : drag.dx; ty = n >= 3 && drag.dy < 0 ? drag.dy : 0; rot = reduced ? 0 : tx / 24; }
  if (leaving && !reduced) { tx = leaving === "left" ? -window.innerWidth : leaving === "right" ? window.innerWidth : 0; ty = leaving === "up" ? -window.innerHeight : 0; rot = leaving === "up" ? 0 : tx / 40; }
  const style: React.CSSProperties = {
    transform: tx || ty || rot ? `translate(${tx}px, ${ty}px) rotate(${rot}deg)` : undefined,
    transition: drag || reduced ? "none" : "transform .2s ease-out",
  };
  const hintIdx = cur?.index ?? null;
  const hintOk = hintIdx !== null && allowed(hintIdx);

  return (
    <article ref={ref} style={style}
      className="swipe-card relative bg-gradient-to-b from-[#2a231b] to-[#211b15] border border-line2 rounded p-[22px_22px_20px] grid gap-3.5 shadow-[0_18px_40px_-24px_#000] card-deal">
      <span className="pointer-events-none absolute inset-1.5 border border-[#3e3328] rounded-[2px]" aria-hidden="true" />
      <div className="flex justify-between gap-2 font-ui text-[12px] text-gold-dim"><span>{kind ?? card.kind ?? ""}</span><span>{REGION_NAME[s.faction]}</span></div>
      <div className={`swipe-face relative grid gap-3.5 ${n >= 3 ? "swipe-3" : ""}`}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onCancel} onLostPointerCapture={onCancel}>
        <HeaderArt card={card} faction={s.faction} />
        {cur && cur.dir && hintIdx !== null && (
          <div className={`pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 max-w-[90%] font-ui text-[13px] px-3 py-1.5 rounded-[3px] border ${hintOk ? (cur.committed ? "bg-gold text-[#1a140c] border-gold" : "bg-[#1a140ccc] text-gold border-gold-dim") : "bg-[#1a140ccc] text-blood border-[#5a3328]"}`}
            style={{ opacity: 0.35 + cur.progress * 0.65 }} role="status">
            {DIR_LABEL[cur.dir]} {LETTER[hintIdx]} · {card.choices[hintIdx]!.label}{!hintOk ? " (자원 부족)" : cur.committed ? " — 놓으면 확정" : ""}
          </div>
        )}
        <h2 className="font-display text-[clamp(24px,4.5vw,32px)] leading-tight">{card.title}</h2>
        <p className="m-0 max-w-[62ch] text-[#d9cdb6]">{card.text}</p>
        <p className="m-0 font-ui text-[11px] text-faint">카드를 {n >= 3 ? "좌·우·위로" : "좌우로"} 밀어 고르거나, 아래 버튼·키보드({n >= 3 ? "← → ↑" : "← →"})를 쓰세요.</p>
      </div>
      <div className="grid gap-2.5">{card.choices.map((c, i) => <ChoiceButton key={i} s={s} choice={c} index={i} highlight={hintIdx === i} onPick={() => onPick(i)} disabled={disabled} />)}</div>
      {children}
    </article>
  );
}
