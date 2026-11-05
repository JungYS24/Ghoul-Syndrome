import { useCallback, useEffect, useRef, useState } from "react";
import { D20 } from "./D20";
import { buzz, chime, doom, rattle, thud, tick } from "../audio/sfx";
import "./dice.css";

export interface DiceRollView {
  dice: number[];
  sum: number;
  modifier: number;
  final: number;
  gradeName: string;
  tone: "crit" | "great" | "success" | "partial" | "fail" | "fumble" | "after";
  mult?: number;
}
type Phase = "ready" | "rolling" | "counting" | "done";
const FIRST_STOP = 1200, STOP_GAP = 250, FACE_MS = 60, COUNT_MS = 550;

export const TONE_COLOR: Record<DiceRollView["tone"], string> = {
  crit: "#ecc977", great: "#cfa752", success: "#8fb6c6", partial: "#c8b48a", fail: "#d98a74", fumble: "#c4553c", after: "#e0402b",
};
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

interface Props {
  roll: DiceRollView;
  /** 열리자마자 굴릴지 (기본: 사용자가 던질 때까지 대기) */
  autoRoll?: boolean;
  onDone?: () => void;
  /** 결과 아래에 붙일 내용(효과 칩 등) */
  children?: React.ReactNode;
  title?: string;
}

export function DiceRoller({ roll, autoRoll, onDone, children, title }: Props) {
  const n = roll.dice.length;
  const [phase, setPhase] = useState<Phase>("ready");
  const [faces, setFaces] = useState<number[]>(() => roll.dice.map((_, i) => ((i * 7) % 20) + 1));
  const [landed, setLanded] = useState<boolean[]>(() => roll.dice.map(() => false));
  const [shown, setShown] = useState<number | null>(null);
  const [showFinal, setShowFinal] = useState(false);
  const timers = useRef<number[]>([]);
  const landedRef = useRef<boolean[]>(roll.dice.map(() => false));
  const reduced = reducedMotion();

  const clearTimers = () => { timers.current.forEach((t) => { clearTimeout(t); clearInterval(t); }); timers.current = []; };
  useEffect(() => clearTimers, []);

  const reveal = useCallback(() => {
    clearTimers();
    setFaces(roll.dice); setLanded(roll.dice.map(() => true));
    setShown(roll.final); setShowFinal(true); setPhase("done");
    if (roll.tone === "crit" || roll.tone === "great") chime();
    if (roll.tone === "fumble" || roll.tone === "after") { doom(); buzz(40); }
  }, [roll]);

  const startCount = useCallback(() => {
    setPhase("counting");
    const t0 = performance.now();
    const iv = window.setInterval(() => {
      const p = Math.min(1, (performance.now() - t0) / COUNT_MS);
      setShown(Math.round(roll.sum * (1 - Math.pow(1 - p, 3))));
      if (p >= 1) {
        clearInterval(iv);
        const t = window.setTimeout(() => { setShown(roll.final); setShowFinal(true); setPhase("done");
          if (roll.tone === "crit" || roll.tone === "great") chime();
          if (roll.tone === "fumble" || roll.tone === "after") { doom(); buzz(40); }
        }, roll.modifier ? 420 : 160);
        timers.current.push(t);
      }
    }, 30);
    timers.current.push(iv);
  }, [roll]);

  const throwDice = useCallback(() => {
    if (phase !== "ready") return;
    if (reduced) { reveal(); return; }
    setPhase("rolling"); rattle();
    const iv = window.setInterval(() => {
      setFaces((f) => f.map((v, i) => (landedRef.current[i] ? v : 1 + Math.floor(Math.random() * 20))));
    }, FACE_MS);
    timers.current.push(iv);
    roll.dice.forEach((v, i) => {
      const t = window.setTimeout(() => {
        landedRef.current[i] = true;
        setLanded((l) => l.map((x, j) => (j === i ? true : x)));
        setFaces((f) => f.map((x, j) => (j === i ? v : x)));
        thud(0.7 + v / 40); buzz(10);
        if (i === n - 1) { clearInterval(iv); const t2 = window.setTimeout(startCount, 260); timers.current.push(t2); }
      }, FIRST_STOP + STOP_GAP * i);
      timers.current.push(t);
    });
  }, [phase, reduced, reveal, roll, n, startCount]);

  useEffect(() => { if (autoRoll) { const t = window.setTimeout(throwDice, 150); return () => clearTimeout(t); } }, [autoRoll]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (phase === "counting" && shown !== null && shown % 7 === 0) tick(); }, [shown, phase]);

  const onTap = () => { if (phase === "rolling" || phase === "counting") reveal(); else if (phase === "ready") throwDice(); };

  const color = TONE_COLOR[roll.tone];
  const big = roll.tone === "crit" || roll.tone === "great";
  const bad = roll.tone === "fumble" || roll.tone === "after";
  const fx = phase === "done" && !reduced;
  const sign = (v: number) => (v >= 0 ? `+ ${v}` : `− ${Math.abs(v)}`);

  return (
    <div className={`dice-stage ${fx && bad ? "fx-shake" : ""} ${reduced ? "reduced" : ""}`}>
      {fx && big && <div className="fx-flash" aria-hidden="true" />}
      {fx && bad && <div className="fx-red" aria-hidden="true" />}
      {fx && big && <Particles color={color} />}
      {title && <div className="font-ui text-[12px] tracking-[0.12em] text-gold-dim text-center">{title}</div>}

      {/* 최종 숫자 — 주사위 위쪽에 크게 */}
      <div className="text-center min-h-[150px] grid content-center" aria-live="polite">
        <div className="font-display leading-none tabular-nums transition-colors duration-300"
          style={{ fontSize: "clamp(88px, 24vw, 140px)", color: showFinal ? color : "#ebe0cb", textShadow: showFinal && big ? `0 0 28px ${color}88` : "none" }}>
          {shown ?? (phase === "ready" ? "5d20" : "··")}
        </div>
        <div className="font-ui text-[13px] text-muted h-5 mt-1">
          {(phase === "counting" || phase === "done") && <>합 <b className="text-ink">{roll.sum}</b> {sign(roll.modifier)} (보정) = <b className="text-ink">{roll.final}</b></>}
        </div>
        <div className="font-display text-[34px] font-bold leading-tight h-11 transition-opacity duration-300"
          style={{ color, opacity: showFinal ? 1 : 0, textShadow: showFinal ? `0 1px 3px #000, 0 0 22px ${color}55` : "none" }}>{roll.gradeName}</div>
        {roll.mult !== undefined && <div className="font-ui text-[12px] text-muted h-4" style={{ opacity: showFinal ? 1 : 0 }}>효과 배율 ×{roll.mult.toFixed(2)}</div>}
      </div>

      {/* 주사위 판 */}
      <div className="dice-tray select-none touch-none" role="button" tabIndex={0} aria-label={phase === "ready" ? "주사위 던지기" : "결과 바로 보기"}
        onClick={onTap} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onTap(); } }}>
        {roll.dice.map((v, i) => (
          <div key={i} className={`die-slot ${phase === "rolling" && !landed[i] ? "is-rolling" : ""} ${landed[i] && phase !== "ready" ? "is-landed" : ""} ${phase === "ready" ? "is-ready" : ""}`}
            style={{ ["--i" as string]: i, ["--dir" as string]: i % 2 ? -1 : 1, ["--spin" as string]: `${(i % 2 ? -1 : 1) * (720 + i * 180)}deg` }}>
            <div className="die-tumbler">
              <D20 value={faces[i] ?? v} state={landed[i] ? "landed" : phase === "rolling" ? "rolling" : "idle"} highlight={landed[i] && phase !== "ready" ? (v === 20 ? "max" : v === 1 ? "min" : null) : null} />
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-3">
        {phase === "ready" && (
          <>
            <button className="btn-gold" onClick={throwDice} autoFocus>주사위 굴리기</button>
          </>
        )}
        {(phase === "rolling" || phase === "counting") && <span className="font-ui text-[12px] text-faint">탭하면 바로 결과를 봅니다</span>}
        {phase === "done" && (
          <>
            {children}
            {onDone && <button className="btn-gold" onClick={onDone} autoFocus>계속</button>}
          </>
        )}
      </div>
    </div>
  );
}

function Particles({ color }: { color: string }) {
  const [ps] = useState(() => Array.from({ length: 28 }, (_, i) => ({
    a: (i / 28) * Math.PI * 2 + Math.random() * 0.3, d: 90 + Math.random() * 150, s: 4 + Math.random() * 6, delay: Math.random() * 120,
  })));
  return (
    <div className="fx-particles" aria-hidden="true">
      {ps.map((p, i) => (
        <span key={i} style={{ background: i % 3 ? color : "#fff3c8", width: p.s, height: p.s, animationDelay: `${p.delay}ms`,
          ["--dx" as string]: `${Math.cos(p.a) * p.d}px`, ["--dy" as string]: `${Math.sin(p.a) * p.d - 40}px` }} />
      ))}
    </div>
  );
}
