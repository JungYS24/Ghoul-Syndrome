// 역사의 유산 — 엔딩마다 점수를 모아 영구 보너스를 사는 판 사이 성장 (Cookie Clicker 의 승천 참고).
// 점수는 웹 앱이 IndexedDB 에 보관하고, 새 판을 시작할 때 산 보너스 id 를 newGame 에 넘깁니다.
import type { Ending, FactionId, GameState, GaugeKey } from "./types";

export interface LegacyPerk { id: string; name: string; desc: string; cost: number }
export const LEGACY_PERKS: LegacyPerk[] = [
  { id: "granary", name: "풍족한 곳간", desc: "시작 때 실링 +15, 식량 +10", cost: 3 },
  { id: "will", name: "단련된 의지", desc: "시작 게이지 4개가 모두 +3", cost: 4 },
  { id: "blessing", name: "선대의 가호", desc: "시작 때 세력 유물 1개를 가지고 시작", cost: 5 },
  { id: "staff", name: "숙련된 참모", desc: "첫 계절 행동권 +1 (3개)", cost: 6 },
];
export const STARTER_RELIC: Record<FactionId, string> = { arkandal: "relic-seal", iruth: "relic-ledger", voodoo: "relic-bell" };
const GAUGES: Record<FactionId, GaugeKey[]> = {
  arkandal: ["morale", "order", "finance", "legit"], iruth: ["morale", "order", "finance", "legit"], voodoo: ["faith", "control", "offering", "stealth"],
};

/** 엔딩 하나로 얻는 유산 점수: 승리 3 / 생존 S~D 3~1 / 패배 1(+10턴마다 1), 어려움 +1, 지옥 +2 */
export function legacyPointsFor(s: Pick<GameState, "ended" | "turn" | "difficulty">): number {
  const e: Ending | null = s.ended;
  if (!e) return 0;
  let p = e.type === "victory" ? 3 : e.type === "survive" ? ({ S: 3, A: 3, B: 2, C: 2, D: 1 } as Record<string, number>)[e.grade ?? "B"] ?? 1 : 1 + Math.floor(s.turn / 10);
  if (s.difficulty === "hard") p += 1;
  else if (s.difficulty === "hell") p += 2;
  return p;
}
/** 새 판의 시작 상태에 산 보너스를 적용합니다 (state 를 직접 바꿉니다). */
export function applyLegacy(s: GameState, perks: string[]): void {
  const ids = perks.filter((id) => LEGACY_PERKS.some((p) => p.id === id));
  s.legacy = ids;
  if (ids.includes("granary")) { s.res.silver += 15; s.res.food += 10; }
  if (ids.includes("will")) for (const k of GAUGES[s.faction]) s.gauges[k] = Math.min(100, s.gauges[k] + 3);
  if (ids.includes("blessing")) s.relics.push(STARTER_RELIC[s.faction]);
  if (ids.includes("staff")) s.ap = 3;
}
