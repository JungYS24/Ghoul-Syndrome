import { describe, expect, it } from "vitest";
import { AUTO_MS, DEADLINE_MS, clockFrozen, deadlineMs, isPlayMode } from "../src/store/rtClock";

describe("실시간 시간 규칙", () => {
  it("사람의 제한시간은 배속과 무관, 자동 진행만 배속을 따른다", () => {
    for (const sp of [1, 2, 5, 10]) expect(deadlineMs(false, sp)).toBe(DEADLINE_MS);
    expect(deadlineMs(true, 1)).toBe(AUTO_MS);
    expect(deadlineMs(true, 10)).toBe(AUTO_MS / 10);
    expect(deadlineMs(true, 0)).toBe(AUTO_MS);
  });
  it("일시정지·주사위·시트가 열리면 시계가 멈춘다", () => {
    expect(clockFrozen({ paused: false, dice: null, modalOpen: false })).toBe(false);
    expect(clockFrozen({ paused: true, dice: null, modalOpen: false })).toBe(true);
    expect(clockFrozen({ paused: false, dice: {}, modalOpen: false })).toBe(true);
    expect(clockFrozen({ paused: false, dice: null, modalOpen: true })).toBe(true);
  });
  it("저장된 모드 값 검사", () => {
    expect(isPlayMode("realtime")).toBe(true); expect(isPlayMode("turn")).toBe(true);
    expect(isPlayMode(undefined)).toBe(false); expect(isPlayMode("rt")).toBe(false);
  });
});
