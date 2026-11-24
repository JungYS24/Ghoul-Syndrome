import { describe, expect, it } from "vitest";
import { outcomeLine, outcomeTier } from "../src/outcomes";

describe("결과 문장", () => {
  it("최종값을 등급표 경계에 맞춰 다섯 구간으로 나눈다", () => {
    expect(outcomeTier(95)).toBe("great");
    expect(outcomeTier(83)).toBe("great");
    expect(outcomeTier(75)).toBe("success");
    expect(outcomeTier(60)).toBe("weak");
    expect(outcomeTier(50)).toBe("weak");
    expect(outcomeTier(45)).toBe("partial");
    expect(outcomeTier(39)).toBe("fail");
    expect(outcomeTier(1)).toBe("fail");
  });
  it("선택지 문장이 있으면 쓰고 없으면 기본 문장", () => {
    const outcomes = { great: "g", success: "s", weak: "w", partial: "p", fail: "f" };
    expect(outcomeLine({ outcomes }, 62)).toBe("w");
    expect(outcomeLine({}, 20)).toMatch(/습니다\.$/);
  });
});
