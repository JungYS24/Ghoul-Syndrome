// 행동 단계 추천: 행동(액션 카드)과 법령 공포를 한데 모아, 지금 상황에 맞는 것 몇 개만 고릅니다.
// 같은 state 면 항상 같은 결과(난수 대신 턴·행동권으로 만든 해시로 동점을 가름) — 행동권을 쓸 때마다 다시 고릅니다.
import { actionsFor, canAfford, foodUseOf, isBadUp, mapKey } from "./game";
import { decreesFor, enactBlocker } from "./decrees";
import { FACTIONS } from "./factions";
import { WAR_PRESSURE_ID, WAR_RAID_ID, canPrepWar } from "./war";
import type { EffectKey, Effects, GameContent, GameState, GaugeKey } from "./types";

export type Play =
  | { kind: "action"; id: string; score: number }
  | { kind: "decree"; id: string; score: number }
  /** 전쟁 준비 (id = 준비 중인 상대 또는 "") */
  | { kind: "warprep"; id: string; score: number }
  /** 선전포고 (id = 상대). 행동권을 쓰지 않으며 맨 앞에 고정 */
  | { kind: "declare"; id: string; score: number }
  /** 전시 행동권 행동 (게릴라 습격 · 정치적 압박) */
  | { kind: "waract"; id: string; score: number };

const GAUGES: GaugeKey[] = ["morale", "order", "finance", "legit", "faith", "control", "offering", "stealth"];
/** 효과 1단위의 크기 (이 값만큼 움직이면 "1") */
const SCALE: Partial<Record<EffectKey, number>> = {
  infection: 5, target: 5, neutral: 6, wrath: 5, research: 3, wall: 3,
  pop: 0.5, army: 0.5, food: 8, silver: 8, strat: 10, stone: 6, prey: 6,
  rel: 8, relTo: 8, voodooPower: 10,
};

/** 지금 이 수치를 움직이는 것이 얼마나 급한지 (0.1~2) */
export function needOf(s: GameState, k: EffectKey): number {
  const clamp = (v: number) => Math.max(0.1, Math.min(2, v));
  if ((GAUGES as EffectKey[]).includes(k)) return clamp((65 - s.gauges[k as GaugeKey]) / 30);
  switch (k) {
    case "infection": return clamp(0.3 + s.infection[s.faction] / 45);
    case "target": return clamp(1.3 - s.infection[s.target] / 100);
    case "neutral": return clamp(0.9 - s.infection.neutral / 120);
    case "wrath": return clamp(0.15 + s.wrath / 45);
    case "research": return s.faction === "iruth" ? 1.2 : 0.5;
    case "wall": return s.faction === "arkandal" ? 1.2 : 0;
    case "food": return s.res.food < foodUseOf(s) * 3 ? 1.6 : 0.35;
    case "silver": return s.res.silver < 20 ? 1.2 : 0.35;
    case "army": return s.res.army < 3 ? 1 : 0.4;
    case "pop": return 1;
    case "prey": return s.res.prey < 15 ? 1 : 0.3;
    case "rel": case "relTo": {
      const rs = Object.values(s.rel).filter((v): v is number => typeof v === "number");
      const low = rs.length ? Math.min(...rs) : 50;
      return clamp((55 - low) / 30);
    }
    default: return 0.3;
  }
}

/** 효과 묶음의 지금 가치 (+면 이로움) */
export function effectsValue(s: GameState, eff: Effects | undefined): number {
  let v = 0;
  for (const [k0, d] of Object.entries(eff ?? {}) as [EffectKey, number][]) {
    if (!d) continue;
    const k = k0 === "relTo" ? "relTo" : mapKey(s, k0);
    if (!k) continue;
    const good = isBadUp(s, k) ? d < 0 : d > 0;
    v += (good ? 1 : -1) * needOf(s, k) * Math.abs(d) / (SCALE[k] ?? 5);
  }
  return v;
}

function hash(n: number, id: string): number {
  let h = n >>> 0;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 2654435761) >>> 0;
  return (h % 1000) / 1000;
}

/**
 * 지금 행동권으로 할 만한 것 최대 n 개 (행동 + 법령). 법령은 2개까지만 섞습니다.
 * 행동: 감당 가능한 선택지 중 가장 가치 있는 것 기준 / 법령: 매 계절 효과 × 1.5 (오래 가므로)
 */
export function suggestPlays(s: GameState, content: GameContent, n = 4): Play[] {
  if (s.phase !== "action") return [];
  const pinned: Play[] = s.warReady && !s.war ? [{ kind: "declare", id: s.warReady, score: 999 }] : [];
  if (s.ap <= 0) return pinned;
  const salt = s.turn * 31 + s.ap * 7 + s.decrees.length;
  const cands: Play[] = [];
  for (const a of actionsFor(s, content)) {
    const vals = a.card.choices.filter((c) => canAfford(s, c)).map((c) => effectsValue(s, c.effects));
    if (!vals.length) continue;
    cands.push({ kind: "action", id: a.id, score: Math.max(...vals) + hash(salt, a.id) * 0.6 });
  }
  for (const d of decreesFor(s, content)) {
    if (enactBlocker(s, d)) continue;
    cands.push({ kind: "decree", id: d.id, score: effectsValue(s, d.effects) * 1.5 + hash(salt, d.id) * 0.6 - 0.3 });
  }
  // 전쟁 준비 — 가끔 섞임: 병력이 넉넉하거나 관계가 나쁜 세력이 있으면 자주, 준비 중이면 항상
  if (canPrepWar(s)) {
    const strong = s.res.army >= FACTIONS[s.faction].res.army * 1.2;
    const rs = Object.values(s.rel).filter((v): v is number => typeof v === "number");
    const hostile = rs.some((v) => v <= 30) || (s.faction === "voodoo" && s.gauges.control >= 60);
    const score = s.warPrep ? 50 : 0.1 + (strong ? 0.9 : 0) + (hostile ? 0.9 : 0) + hash(salt, "war") * 1.4;
    cands.push({ kind: "warprep", id: s.warPrep?.target ?? "", score });
  }
  // 전시 행동 — 일정 확률로 섞임 (게릴라 습격·정치적 압박)
  if (s.war) {
    for (const id of [WAR_RAID_ID, WAR_PRESSURE_ID]) {
      const roll = hash(salt, id);
      if (roll < 0.6) cands.push({ kind: "waract", id, score: 0.7 + roll * 0.8 });
    }
  }
  cands.sort((x, y) => y.score - x.score);
  const out: Play[] = [...pinned];
  let decrees = 0;
  for (const c of cands) {
    if (out.length >= n) break;
    if (c.kind === "decree") { if (decrees >= 2) continue; decrees++; }
    out.push(c);
  }
  return out;
}
