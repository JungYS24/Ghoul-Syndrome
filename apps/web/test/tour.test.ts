import { describe, expect, it } from "vitest";
import { onboardingOff, setOnboardingOff, tipsForTurn } from "../src/ui/tour";

describe("온보딩", () => {
  it("첫 턴에 게이지·판정·감염도, 2~3턴에 한 장씩, 그 뒤는 없음", () => {
    expect(tipsForTurn(1)).toEqual(["gauges", "dice", "infection"]);
    expect(tipsForTurn(2)).toHaveLength(1);
    expect(tipsForTurn(3)).toHaveLength(1);
    expect(tipsForTurn(4)).toEqual([]);
  });
  it("다시 보지 않기 저장 (저장소가 없거나 던져도 안전)", () => {
    const m = new Map<string, string>();
    const st = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
    expect(onboardingOff(st)).toBe(false);
    setOnboardingOff(st);
    expect(onboardingOff(st)).toBe(true);
    expect(onboardingOff(null)).toBe(false);
    expect(onboardingOff({ getItem: () => { throw new Error("blocked"); } })).toBe(false);
  });
});
