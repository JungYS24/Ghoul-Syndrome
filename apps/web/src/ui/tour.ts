// 첫 3턴 온보딩 — 어떤 턴에 어떤 말풍선을 띄울지 정하는 순수 로직
export type TipId = "gauges" | "dice" | "infection" | "actions" | "seasons";

/** 1턴: 게이지·판정·감염도 3단계 안내, 2턴: 행동권, 3턴: 계절 보정 */
export function tipsForTurn(turn: number): TipId[] {
  if (turn === 1) return ["gauges", "dice", "infection"];
  if (turn === 2) return ["actions"];
  if (turn === 3) return ["seasons"];
  return [];
}
/** 말풍선이 가리키는 대시보드 영역(data-tour) */
export const TIP_TARGET: Partial<Record<TipId, string>> = { gauges: "gauges", infection: "infection" };

export const ONBOARDING_OFF_KEY = "guul-onboarding-off";
export function onboardingOff(storage: Pick<Storage, "getItem"> | null): boolean {
  try { return storage?.getItem(ONBOARDING_OFF_KEY) === "1"; } catch { return false; }
}
export function setOnboardingOff(storage: Pick<Storage, "setItem"> | null): void {
  try { storage?.setItem(ONBOARDING_OFF_KEY, "1"); } catch { /* 저장 불가(사생활 보호 모드 등) */ }
}
