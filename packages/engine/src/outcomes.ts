// 판정 결과 한 문장 — 사건 기록에 "사건 — 등급" 다음 줄로 붙습니다.
// 선택지마다 결과 구간 5개(대성공·성공·미온적 성공·반쪽 성공·실패)의 문장을 카드 데이터에 둡니다.
import type { Choice, Outcomes } from "./types";

export type OutcomeTier = keyof Outcomes;
export const OUTCOME_TIERS: OutcomeTier[] = ["great", "success", "weak", "partial", "fail"];

/** 최종값 → 결과 구간 (등급표 경계와 맞춤: 83↑ 대성공 계열, 70↑ 성공, 50↑ 미온적·그래도 성공, 40↑ 애매·반쪽, 그 아래 실패) */
export function outcomeTier(final: number): OutcomeTier {
  if (final >= 83) return "great";
  if (final >= 70) return "success";
  if (final >= 50) return "weak";
  if (final >= 40) return "partial";
  return "fail";
}

const FALLBACK: Outcomes = {
  great: "모든 일이 뜻한 대로 풀려, 백성들이 그 이름을 칭송했습니다.",
  success: "일은 계획대로 마무리되었습니다.",
  weak: "일은 이루어졌으나 개운치 않은 뒷맛이 남았습니다.",
  partial: "절반의 성과를 얻었지만 그만큼의 대가도 치렀습니다.",
  fail: "일이 틀어져 손실만 남았습니다.",
};

export function outcomeLine(choice: Pick<Choice, "outcomes"> | undefined, final: number): string {
  const t = outcomeTier(final);
  return choice?.outcomes?.[t] ?? FALLBACK[t];
}
