import gradeData from "./data/grades.json";
import { CDF_5D20 } from "./generated/cdf5d20";
import type { Grade } from "./types";
import type { Rng } from "./rng";

export const GRADES: Grade[] = gradeData.grades as Grade[];
export const MULT_ANCHORS: [number, number][] = gradeData.multAnchors as [number, number][];
export const ON_FAIL_BELOW: number = gradeData.onFailBelow;
export const AFTERMATH_AT_OR_BELOW: number = gradeData.aftermathAtOrBelow;
export const SUCCESS_AT_LEAST: number = gradeData.successAtLeast;
export const DICE_COUNT = 5;
export const DICE_FACES = 20;

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** 5d20 굴림 — 애니메이션 전에 엔진이 확정합니다. */
export function roll5d20(rng: Rng): number[] {
  return Array.from({ length: DICE_COUNT }, () => rng.int(1, DICE_FACES));
}

/** P(5d20 합 ≤ v) */
export function cdf(v: number): number {
  if (v < 5) return 0;
  if (v >= 100) return 1;
  return CDF_5D20[Math.floor(v)] ?? 1;
}
/** 최종값 → 백분위 rank(1~100). 합 분포가 종 모양이라 평균 근처가 rank 50 부근이 됩니다. */
export function rankOf(final: number): number {
  return clamp(Math.round(cdf(final) * 100), 1, 100);
}
/** rank → 효과 배율 (앵커 선형 보간) */
export function multOfRank(rank: number): number {
  const r = clamp(rank, 1, 100);
  for (let i = 0; i < MULT_ANCHORS.length - 1; i++) {
    const [a, va] = MULT_ANCHORS[i]!;
    const [b, vb] = MULT_ANCHORS[i + 1]!;
    if (r >= a && r <= b) {
      const t = b === a ? 0 : (r - a) / (b - a);
      return Math.round((va + (vb - va) * t) * 1000) / 1000;
    }
  }
  return 1;
}
export function gradeOf(final: number, grades: Grade[] = GRADES): Grade {
  for (const g of grades) if (final >= g.min) return g;
  return grades[grades.length - 1]!;
}
/** 보정값 m 일 때 최종값이 threshold 이상일 확률(%) */
export function chanceAtLeast(m: number, threshold = SUCCESS_AT_LEAST): number {
  // final = clamp(sum + m, 1, 100) ≥ threshold ⇔ sum ≥ threshold − m (threshold ≥ 1)
  const need = threshold - m;
  if (need <= 5) return 100;
  if (need > 100) return 0;
  return Math.round((1 - cdf(need - 1)) * 100);
}
export interface DiceResult { dice: number[]; sum: number; final: number; rank: number; mult: number; grade: Grade }
export function judge(dice: number[], modifier: number): DiceResult {
  const sum = dice.reduce((a, b) => a + b, 0);
  const final = clamp(sum + modifier, 1, 100);
  const rank = rankOf(final);
  return { dice, sum, final, rank, mult: multOfRank(rank), grade: gradeOf(final) };
}
