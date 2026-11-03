// 수치 공식 — 테스트가 직접 검증하는 순수 함수들
import { FACTIONS, PRESETS, SEASON_MOD } from "./factions";
import type { FactionId, GameState, PresetId, RegionId, Season } from "./types";

/** 식량 소비: (인구 + 병력) ÷ 10. 부두교는 신도 ÷ 10 만 식량에서. */
export function foodUse(faction: FactionId, pop: number, army: number): number {
  return faction === "voodoo" ? pop / 10 : (pop + army) / 10;
}
/** 부두교 먹이 소비: 구울 무리 ÷ 10 */
export function preyUse(army: number): number { return army / 10; }

/** 기본 확산 (계절·사건·방역 제외) */
export function baseSpread(faction: FactionId | "neutral", infection: number, opts: { wall?: number; control?: number } = {}): number {
  let b = 1.5 + infection * 0.04;
  if (faction === "arkandal") b = (b + 1) * (1 - (opts.wall ?? 0) / 140); // 병영 밀집 +1, 방벽이 확산을 줄임
  if (faction === "voodoo" && opts.control !== undefined) { if (opts.control < 40) b += 2; else if (opts.control >= 70) b -= 1; }
  if (faction === "neutral") b = 0.8 + infection * 0.02;
  return b;
}
/** 계절 보정 (아이루스는 겨울 추가 −3) */
export function seasonMod(region: RegionId, season: Season): number {
  let m = SEASON_MOD[season];
  if (region === "iruth" && season === "winter") m -= 3;
  if (region === "neutral") m = m * 0.5;
  return m;
}
/** 매 턴 감염도 변화 = 기본 확산 + 계절 보정 + 사건 − 방역 */
export function infectionDelta(base: number, season: number, events = 0, quarantine = 0): number {
  return base + season + events - quarantine;
}
/** 인구 손실/턴 = 인구 × 감염도/100 × 5% */
export function popLoss(pop: number, infection: number): number { return pop * (infection / 100) * 0.05; }

/** 대륙 감염 진척 CI = (아르칸달 + 아이루스 + 중립지) ÷ 3 */
export function continentalInfection(inf: Record<RegionId, number>): number {
  return Math.round(((inf.arkandal + inf.iruth + inf.neutral) / 3) * 10) / 10;
}

/** 진노 단계별 생산 배율 */
export function wrathProdMod(wrath: number): number {
  return wrath >= 100 ? 0.5 : wrath >= 90 ? 0.7 : wrath >= 60 ? 0.85 : wrath >= 30 ? 0.95 : 1;
}
/** 감염도 구간별 식량 생산 배율 */
export function infectionFoodMod(inf: number): number { return inf >= 61 ? 0.8 : inf >= 31 ? 0.9 : 1; }

export interface Production { food: number; silver: number; strat: number; upkeep: number }
/** 일반결산: 인구 × 배분 × 효율 계수 */
export function production(faction: FactionId, pop: number, army: number, preset: PresetId, infection: number, wrath: number): Production {
  const P = PRESETS[preset], F = FACTIONS[faction], wm = wrathProdMod(wrath);
  const food = pop * P.agri * F.eff.agri * infectionFoodMod(infection) * wm;
  let silver = pop * P.comm * F.eff.comm * 0.25 * wm;
  if (faction === "iruth") silver += 2 + pop * 0.02; // 황금 저울: 환전·검역 수수료
  const upkeep = faction === "voodoo" ? 0 : army * 0.5;
  const strat = pop * P.mine * F.eff.mine * 0.15 * wm;
  return { food: r1(food), silver: r1(silver - upkeep), strat: r1(strat), upkeep: r1(upkeep) };
}
export const r1 = (v: number) => Math.round(v * 10) / 10;

/** 판정 상태 보정: 감염도 61 이상 −5, 진노 100 −5 */
export function stateModifier(s: Pick<GameState, "faction" | "infection" | "wrath">): number {
  let m = 0;
  if (s.infection[s.faction] >= 61) m -= 5;
  if (s.wrath >= 100) m -= 5;
  return m;
}
/** 능력치 보정: (게이지 − 50) ÷ 5, 반올림 (−10 ~ +10) */
export function abilityModifier(gauge: number): number { return Math.round((gauge - 50) / 5); }
