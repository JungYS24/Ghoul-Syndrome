// 스와이프 판정 — 포인터 이동량만으로 어느 선택지로 기울었는지 정하는 순수 함수.
// 좌 = 선택지 A(0), 우 = 선택지 B(1), 위 = 선택지 C(2, 선택지가 3개일 때만).

export type SwipeDir = "left" | "right" | "up";
export interface SwipeDecision { dir: SwipeDir | null; index: number | null; progress: number; committed: boolean }

/** 손가락 떨림으로 방향이 정해지지 않도록 하는 최소 이동량(px) */
export const SWIPE_DEADZONE = 12;

/** 카드 너비에 맞춘 확정 임계 거리: 너비의 28%, 90~150px */
export function swipeThreshold(width: number): number {
  return Math.max(90, Math.min(150, width * 0.28));
}

export function swipeDecision(dx: number, dy: number, choiceCount: number, threshold: number): SwipeDecision {
  const none: SwipeDecision = { dir: null, index: null, progress: 0, committed: false };
  if (choiceCount <= 0) return none;
  const up = choiceCount >= 3 && dy < 0 && -dy > Math.abs(dx);
  if (up) {
    if (-dy < SWIPE_DEADZONE) return none;
    const progress = Math.min(1, -dy / threshold);
    return { dir: "up", index: 2, progress, committed: -dy >= threshold };
  }
  if (Math.abs(dx) < SWIPE_DEADZONE) return none;
  const dir: SwipeDir = dx < 0 ? "left" : "right";
  const index = dir === "left" || choiceCount === 1 ? 0 : 1;
  const progress = Math.min(1, Math.abs(dx) / threshold);
  return { dir, index, progress, committed: Math.abs(dx) >= threshold };
}

/** 키보드: ← A, → B, ↑ C. 해당 선택지가 없으면 null */
export function keyToChoice(key: string, choiceCount: number): number | null {
  if (key === "ArrowLeft") return choiceCount >= 1 ? 0 : null;
  if (key === "ArrowRight") return choiceCount >= 2 ? 1 : choiceCount === 1 ? 0 : null;
  if (key === "ArrowUp") return choiceCount >= 3 ? 2 : null;
  return null;
}
