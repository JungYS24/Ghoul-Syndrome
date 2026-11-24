// 실시간 판정 주사위: 20면체가 굴러가며 0~100 숫자가 바뀌다가 판정값(최종값)에 멈춥니다.
// 판정은 엔진이 이미 확정했고(최종값 = 주사위 + 보정, 1~100), 여기서는 그 값을 보여 줄 뿐입니다.
// 최종값이 SUCCESS_AT_LEAST 이상이면 성공 — 등급표 구간이 결과를 정합니다.
import { useEffect, useState } from "react";
import { SUCCESS_AT_LEAST, type GameState, type RollOutcome } from "@guul/engine";
import { useGame } from "../store/store";
import { chip } from "./DiceOverlay";

const ROLL_MS = 1300;
// 종이 위 등급 글씨(진하게)
const INK: Record<string, string> = { crit: "#8a6212", great: "#8a6212", success: "#2f5d6e", partial: "#4a3b2a", fail: "#9a3b2a", fumble: "#7a1a14", after: "#7a1a14" };
const TONE: Record<string, string> = { crit: "#e8c35a", great: "#e8c35a", success: "#8fc3d6", partial: "#e6dcc6", fail: "#d98a74", fumble: "#c0483a", after: "#c0483a" };

// 정면에서 본 20면체: 바깥 육각형 + 가운데 위로 선 삼각형
const R = 100;
const HEX = [-90, -30, 30, 90, 150, 210].map((a) => [Math.cos((a * Math.PI) / 180) * R, Math.sin((a * Math.PI) / 180) * R] as const);
const TRI = [[0, -0.5 * R], [-0.6 * R, 0.4 * R], [0.6 * R, 0.4 * R]] as const;
// 삼각형 꼭짓점 → 이어지는 육각형 꼭짓점
const SPOKES: [number, number][] = [[0, 0], [0, 5], [0, 1], [1, 5], [1, 4], [1, 3], [2, 1], [2, 2], [2, 3]];
const pts = (a: readonly (readonly [number, number])[]) => a.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

export function D20({ value, rolling, color }: { value: number; rolling: boolean; color: string }) {
  return (
    <svg viewBox="-110 -110 220 220" className={`w-[150px] h-[150px] ${rolling ? "d20-spin" : "d20-land"}`} aria-hidden="true">
      <polygon points={pts(HEX)} fill="#2a2119" stroke="#d8c39a" strokeWidth="4" strokeLinejoin="round" />
      {/* 옆면 음영 */}
      <polygon points={pts([HEX[0]!, TRI[0], HEX[5]!])} fill="#3a2e22" />
      <polygon points={pts([HEX[0]!, TRI[0], HEX[1]!])} fill="#33281e" />
      <polygon points={pts([HEX[3]!, TRI[1], TRI[2]])} fill="#1f1812" />
      <polygon points={pts([HEX[4]!, TRI[1], HEX[3]!])} fill="#251d16" />
      <polygon points={pts([HEX[2]!, TRI[2], HEX[3]!])} fill="#251d16" />
      <polygon points={pts(TRI)} fill="#4a3a28" stroke="#d8c39a" strokeWidth="3" strokeLinejoin="round" />
      {SPOKES.map(([t, h], i) => <line key={i} x1={TRI[t]![0]} y1={TRI[t]![1]} x2={HEX[h]![0]} y2={HEX[h]![1]} stroke="#d8c39a" strokeWidth="2" opacity=".7" />)}
      <text x="0" y="16" textAnchor="middle" fontSize={value >= 100 ? 38 : 46} className="font-display tabular-nums" fill={rolling ? "#f3ead6" : color} stroke="#120e0a" strokeWidth="5" paintOrder="stroke">{value}</text>
    </svg>
  );
}

export function RealtimeRoll({ s }: { s: GameState }) {
  const roll = useGame((z) => z.rtRoll)!;
  const clearRoll = useGame((z) => z.clearRoll);
  const auto = useGame((z) => z.auto);
  const o: RollOutcome = roll.outcome;
  const [face, setFace] = useState(() => Math.floor(Math.random() * 101));
  const [done, setDone] = useState(false);
  useEffect(() => {
    const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ms = reduce ? 0 : auto ? ROLL_MS / 2 : ROLL_MS;
    const iv = window.setInterval(() => setFace(Math.floor(Math.random() * 101)), 70);
    const stop = window.setTimeout(() => { window.clearInterval(iv); setFace(o.final); setDone(true); }, ms);
    return () => { window.clearInterval(iv); window.clearTimeout(stop); };
  }, [o.final, auto]);
  // 결과를 잠깐 보여 준 뒤 자동으로 닫힘 (클릭하면 바로)
  useEffect(() => {
    if (!done) return;
    const t = window.setTimeout(clearRoll, auto ? 700 : 2600);
    return () => window.clearTimeout(t);
  }, [done, auto, clearRoll]);

  const mod = o.statMod + o.choiceMod + o.stateMod + (o.boostMod ?? 0);
  const color = TONE[o.grade.tone] ?? "#e6dcc6";
  const chips = [...o.applied.map((a) => chip(s, a, false)), ...o.failApplied.map((a) => chip(s, a, true))];
  return (
    <section className="rt-banner letter relative p-4 grid gap-2 justify-items-center text-center" aria-live="polite" aria-label="판정 주사위" data-testid="rt-roll"
      onClick={done ? clearRoll : undefined} style={done ? { cursor: "pointer" } : undefined}>
      <span className="pointer-events-none absolute inset-1.5 border border-[#3e3328] rounded-[2px]" aria-hidden="true" />
      <span className="font-ui text-[11px] text-gold-dim">판정</span>
      <h2 className="font-display text-[22px] leading-tight m-0">{roll.title}</h2>
      <p className="m-0 font-ui text-[13px] text-[#5b4a36]">{roll.label}</p>
      <D20 value={face} rolling={!done} color={color} />
      <div className="font-ui text-[12px] text-[#5b4a36] tabular-nums min-h-[18px]">
        {done ? <>주사위 {o.sum} {mod >= 0 ? "+" : "−"} 보정 {Math.abs(mod)} = <b>{o.final}</b> · 성공 기준 {SUCCESS_AT_LEAST} 이상</> : "주사위를 굴리는 중…"}
      </div>
      {done && (
        <div className="grid gap-2 justify-items-center quick-pop">
          <b className="font-display text-[30px] leading-none" style={{ color: INK[o.grade.tone] ?? "#4a3b2a" }}>{o.grade.name}</b>
          <div className="flex flex-wrap gap-1 justify-center max-w-[420px]">{chips.length ? chips : <span className="chip border-line text-muted">변화 없음</span>}</div>
          <span className="font-ui text-[11px] text-faint">눌러서 닫기</span>
        </div>
      )}
    </section>
  );
}
