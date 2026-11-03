// 밸런스 시뮬레이션: 세력당 N회 자동 플레이. 승률 목표 30~45%.
// 휴리스틱 정책(그럭저럭 합리적인 플레이어)으로 돌립니다. 완벽한 플레이가 아닙니다.
import {
  actionsFor, createRng, endTurn, newGame, nextTurn, openEvents, resolveAction, resolveEvent, startTurn,
  ci, canAfford, foodUseOf, preyUse, type ActionDef, type Choice, type FactionId, type GameState, type Rng,
} from "../packages/engine/src/index";
import { content } from "../packages/content/src/index";

function pickChoice(s: GameState, choices: Choice[], rng: Rng): number {
  // 감당 가능한 선택지 중, 간단한 점수로 고름
  const idxs = choices.map((_, i) => i).filter((i) => canAfford(s, choices[i]!));
  const pool = idxs.length ? idxs : choices.map((_, i) => i);
  // 70% 확률로 "감염/진노를 덜 키우는" 선택지 선호
  if (rng.next() < 0.7) {
    let best = pool[0]!, bestScore = -1e9;
    for (const i of pool) {
      const e = choices[i]!.effects;
      let sc = 0;
      sc -= (e.infection ?? 0) * 1.2 + (e.wrath ?? 0) * 0.8;
      sc += (e.research ?? 0) + (e.wall ?? 0) + (e.food ?? 0) * 0.2 + (e.silver ?? 0) * 0.1;
      if (s.faction === "voodoo") {
        sc += (e.target ?? 0) + (e.neutral ?? 0);
        if (s.gauges.faith < 45) sc += (e.faith ?? 0) * 2;   // 신앙 낮으면 신앙 올리는 선택지
        if (s.gauges.control < 45) sc += (e.control ?? 0) * 1.5;
        sc -= (e.stealth && e.stealth < 0 && s.gauges.stealth < 35) ? -e.stealth * 1.2 : 0;
      }
      sc += rng.next() * 4;
      if (sc > bestScore) { bestScore = sc; best = i; }
    }
    return best;
  }
  return pool[Math.floor(rng.next() * pool.length)]!;
}

function chooseAction(s: GameState, acts: ActionDef[], rng: Rng): ActionDef {
  const by = (id: string) => acts.find((a) => a.id === id);
  const need: string[] = [];
  const inf = s.infection[s.faction];
  if (s.faction !== "voodoo") {
    if (s.res.food < foodUseOf(s) * 3) need.push("trade");
    if (inf > 52) need.push("quarantine", "quarantine_iru");
    if (s.wrath > 60) need.push("ritual");
    if (s.faction === "arkandal") need.push("wall", "quarantine", "research");
    if (s.faction === "iruth") need.push("research", "research", "quarantine_iru", "trade");
    need.push("ritual", "diplomacy");
  } else {
    if (s.gauges.faith < 40) need.push("ritual", "ritual");
    if (s.res.prey < preyUse(s.res.army) * 3) need.push("ritual");
    if (s.gauges.control < 45) need.push("ritual");
    if (s.gauges.stealth < 30) need.push("conceal", "conceal");
    // 확산 행동 위주
    need.push("spread_envoy", "spread_smuggle", "spread_liberate", "spread_envoy", "spread_smuggle");
  }
  for (const id of need) { const a = by(id); if (a) return a; }
  return acts[Math.floor(rng.next() * acts.length)]!;
}

function pickTarget(s: GameState): "arkandal" | "iruth" | "neutral" {
  // CI = (아르칸달 + 아이루스 + 중립지)/3 → 가장 낮은 지역을 올림
  const cand: ("arkandal" | "iruth" | "neutral")[] = ["arkandal", "iruth", "neutral"];
  return cand.reduce((lo, r) => (s.infection[r] < s.infection[lo] ? r : lo), cand[0]);
}

function playOne(f: FactionId, seed: number): { result: string; turn: number; score: number } {
  let s = startTurn(newGame(f, seed), content);
  const rng = createRng((seed * 2654435761) >>> 0);
  let guard = 0;
  while (!s.ended && guard++ < 1000) {
    if (s.phase === "start") { s = openEvents(s); continue; }
    if (s.phase === "event") {
      const card = s.events[s.eventIdx]!;
      s = resolveEvent(s, pickChoice(s, card.choices, rng)).state;
      continue;
    }
    if (s.phase === "action") {
      if (s.faction === "voodoo") s = { ...s, target: pickTarget(s) };
      if (s.ap > 0) {
        const acts = actionsFor(s, content);
        const a = chooseAction(s, acts, rng);
        s = resolveAction(s, content, a.id, pickChoice(s, a.card.choices, rng)).state;
      } else s = endTurn(s);
      continue;
    }
    if (s.phase === "end") { s = nextTurn(s, content); continue; }
    break;
  }
  const e = s.ended;
  const result = !e ? "미결(오류)" : e.type === "victory" ? "승리" : e.type === "survive" ? `생존 ${e.grade}` : `패배:${e.title}`;
  return { result, turn: s.turn, score: e?.score ?? 0 };
}

const N = Number(process.argv[2] ?? 1000);
const factions: FactionId[] = ["arkandal", "iruth", "voodoo"];
console.log(`세력당 ${N}회 자동 플레이 (휴리스틱 정책)\n`);
for (const f of factions) {
  const tally: Record<string, number> = {};
  let win = 0, totalTurn = 0;
  for (let i = 0; i < N; i++) {
    const r = playOne(f, i * 7919 + 101);
    tally[r.result] = (tally[r.result] ?? 0) + 1;
    totalTurn += r.turn;
    if (r.result === "승리") win++;
  }
  const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  console.log(`[${f}] 승리 ${(win / N * 100).toFixed(1)}% · 평균 ${(totalTurn / N).toFixed(1)}턴`);
  for (const [k, v] of sorted) console.log(`   ${String(v).padStart(4)}  ${(v / N * 100).toFixed(1).padStart(5)}%  ${k}`);
  console.log();
}
