// 실시간 모드: 시간이 흐르고 제한시간 안에 선택. 배속·일시정지·자동(관전).
// 이 컴포넌트 하나가 클록 구동 + 상단 컨트롤 + 카운트다운 바를 겸합니다. 턴제에는 렌더되지 않습니다.
import { useEffect, useRef, useState } from "react";
import { actionsFor, canAfford, npcVisit, successChance, type Choice, type GameState } from "@guul/engine";
import { content, useGame } from "../store/store";

// 단계별 제한시간(ms, 1배속). 배속으로 나눠집니다.
const BUDGET: Record<string, number> = { start: 2500, event: 7000, action: 10000, end: 4000, npc: 12000 };
const AUTO_MS = 1100; // 자동(관전) 단계 간격(1배속)
const SPEEDS = [1, 2, 5, 10];

function bestChoice(s: GameState, choices: Choice[]): number {
  let bi = 0, best = -1;
  choices.forEach((c, i) => { if (!canAfford(s, c)) return; const p = successChance(s, c); if (p > best) { best = p; bi = i; } });
  return bi;
}
// 자동: 성공률이 가장 높은 (행동, 선택지) 쌍. 없으면 null.
function bestAction(s: GameState): { id: string; i: number } | null {
  let pick: { id: string; i: number } | null = null, best = -1;
  for (const a of actionsFor(s, content)) {
    a.card.choices.forEach((c, i) => { if (!canAfford(s, c)) return; const p = successChance(s, c); if (p > best) { best = p; pick = { id: a.id, i }; } });
  }
  return pick;
}

export function RealtimeBar() {
  const realtime = useGame((z) => z.realtime);
  const speed = useGame((z) => z.speed);
  const paused = useGame((z) => z.paused);
  const auto = useGame((z) => z.auto);
  const setSpeed = useGame((z) => z.setSpeed);
  const togglePause = useGame((z) => z.togglePause);
  const toggleAuto = useGame((z) => z.toggleAuto);
  const [remain, setRemain] = useState(1);
  const keyRef = useRef("");
  const remainMsRef = useRef(1);
  const budgetRef = useRef(1);
  const lastRef = useRef(0);

  useEffect(() => {
    if (!realtime) return;
    let raf = 0;
    lastRef.current = performance.now();
    const loop = () => {
      const now = performance.now();
      const dt = now - lastRef.current; lastRef.current = now;
      const st = useGame.getState();
      const s = st.state;
      const active = !!s && st.realtime && st.screen === "game" && !s.ended && !st.paused && !st.dice && !(s.phase === "action" && st.openAction);
      if (active && s) {
        const npc = s.phase === "end" ? npcVisit(s) : null;
        const budgetKey = s.phase === "end" && npc ? "npc" : s.phase;
        const base = BUDGET[budgetKey] ?? 5000;
        const budget = (st.auto ? Math.min(base, AUTO_MS) : base) / st.speed;
        const key = `${s.turn}:${s.phase}:${s.eventIdx}:${npc ? 1 : 0}:${st.auto ? "a" : "m"}:${st.speed}`;
        if (key !== keyRef.current) { keyRef.current = key; remainMsRef.current = budget; budgetRef.current = budget; }
        else remainMsRef.current -= dt; // 활성일 때만 감소 → 일시정지/모달 중엔 멈춤
        setRemain(Math.max(0, Math.min(1, remainMsRef.current / budgetRef.current)));
        if (remainMsRef.current <= 0) { resolve(st, s, npc, st.auto); keyRef.current = ""; }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [realtime]);

  // flash 자동 소거
  const flash = useGame((z) => z.flash);
  const clearFlash = useGame((z) => z.clearFlash);
  useEffect(() => { if (!flash) return; const t = window.setTimeout(clearFlash, Math.max(500, 800 / speed)); return () => clearTimeout(t); }, [flash, clearFlash, speed]);

  if (!realtime) return null;
  return (
    <>
      <div className="rt-bar sticky top-0 z-30 flex items-center gap-1.5 flex-wrap bg-panel border border-line2 rounded px-2.5 py-1.5 mb-2" data-testid="rt-bar">
        <button className="btn !px-2.5 !py-1 !text-[13px]" onClick={togglePause} aria-pressed={paused}>{paused ? "▶ 재생" : "⏸ 일시정지"}</button>
        <span className="font-ui text-[12px] text-faint ml-1">배속</span>
        {SPEEDS.map((n) => (
          <button key={n} className={`px-2 py-1 rounded-[2px] border font-ui text-[12px] tabular-nums ${speed === n ? "border-gold text-gold bg-[#2a2216]" : "border-line text-muted"}`}
            aria-pressed={speed === n} onClick={() => setSpeed(n)}>{n}×</button>
        ))}
        <button className={`ml-auto px-2 py-1 rounded-[2px] border font-ui text-[12px] ${auto ? "border-gold text-gold bg-[#2a2216]" : "border-line text-muted"}`}
          aria-pressed={auto} onClick={toggleAuto}>자동{auto ? " 켜짐" : ""}</button>
      </div>
      <div className="h-1 -mt-1 mb-2 bg-[#100d0b] border border-line rounded-[1px] overflow-hidden" aria-hidden="true">
        <i className={`block h-full ${remain < 0.3 ? "bg-blood" : "bg-gold"}`} style={{ width: `${Math.round(remain * 100)}%`, transition: paused ? "none" : "width 0.1s linear" }} />
      </div>
      {flash && <FlashToast grade={flash.grade} tone={flash.tone} />}
    </>
  );
}

const TONE_COLOR: Record<string, string> = {
  crit: "text-gold", great: "text-gold", success: "text-frost", partial: "text-ink",
  fail: "text-[#d98a74]", fumble: "text-blood", after: "text-blood",
};
function FlashToast({ grade, tone }: { grade: string; tone: string }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-24 z-40 grid place-items-center" aria-live="polite">
      <div className={`quick-pop font-display text-[34px] px-5 py-2 border border-line2 rounded ${TONE_COLOR[tone] ?? "text-ink"}`} style={{ background: "rgba(26,21,18,.92)" }}>{grade}</div>
    </div>
  );
}

// 제한시간 종료/자동 시 단계 처리
function resolve(st: ReturnType<typeof useGame.getState>, s: GameState, npc: ReturnType<typeof npcVisit>, auto: boolean) {
  switch (s.phase) {
    case "start": st.rtGoEvents(); break;
    case "event": {
      const card = s.events[s.eventIdx];
      if (!card) { st.rtGoEvents(); break; }
      if (auto) st.rtEvent(bestChoice(s, card.choices)); else st.rtSkip();
      break;
    }
    case "action": {
      if (auto && s.ap > 0) { const b = bestAction(s); if (b) { st.rtAction(b.id, b.i); break; } }
      st.rtFinishTurn();
      break;
    }
    case "end": {
      if (npc) { const idx = auto ? bestChoice(s, npc.card.choices) : npc.card.choices.length - 1; st.rtNpc(idx); }
      else st.rtAdvance();
      break;
    }
    default: break;
  }
}
