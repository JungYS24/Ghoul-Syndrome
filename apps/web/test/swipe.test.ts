import { describe, expect, it } from "vitest";
import { keyToChoice, swipeDecision, swipeThreshold } from "../src/ui/swipe";

describe("스와이프 판정", () => {
  it("임계 거리는 카드 너비에 맞추되 90~150px", () => {
    expect(swipeThreshold(200)).toBe(90);
    expect(swipeThreshold(400)).toBeCloseTo(112);
    expect(swipeThreshold(1000)).toBe(150);
  });
  it("좌 = A, 우 = B, 임계 거리 미만이면 확정하지 않는다", () => {
    expect(swipeDecision(-50, 0, 2, 100)).toMatchObject({ dir: "left", index: 0, committed: false });
    expect(swipeDecision(120, 10, 2, 100)).toMatchObject({ dir: "right", index: 1, committed: true });
    expect(swipeDecision(5, 0, 2, 100).index).toBeNull();
  });
  it("선택지 3개일 때만 위로 밀기 = C", () => {
    expect(swipeDecision(10, -130, 3, 100)).toMatchObject({ dir: "up", index: 2, committed: true });
    expect(swipeDecision(10, -130, 2, 100).dir).toBeNull(); // 가로 이동이 데드존 안
    expect(swipeDecision(-40, -130, 2, 100)).toMatchObject({ dir: "left", committed: false });
  });
  it("선택지 1개 카드는 어느 쪽이든 A", () => {
    expect(swipeDecision(150, 0, 1, 100)).toMatchObject({ index: 0, committed: true });
  });
  it("키보드 매핑", () => {
    expect(keyToChoice("ArrowLeft", 2)).toBe(0);
    expect(keyToChoice("ArrowRight", 2)).toBe(1);
    expect(keyToChoice("ArrowUp", 2)).toBeNull();
    expect(keyToChoice("ArrowUp", 3)).toBe(2);
    expect(keyToChoice("Enter", 3)).toBeNull();
  });
});
