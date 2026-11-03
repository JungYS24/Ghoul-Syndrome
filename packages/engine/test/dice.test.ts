import { describe, expect, it } from "vitest";
import { COUNTS_5D20, CDF_5D20, TOTAL_5D20, computeNdKCounts, createRng, gradeOf, judge, multOfRank, rankOf, roll5d20, chanceAtLeast } from "../src";

describe("5d20 분포표", () => {
  it("생성된 표가 직접 계산한 분포와 같다", () => {
    expect(COUNTS_5D20).toEqual(computeNdKCounts(5, 20));
    expect(COUNTS_5D20.reduce((a, b) => a + b, 0)).toBe(TOTAL_5D20);
    expect(CDF_5D20[100]).toBe(1);
    expect(CDF_5D20[4]).toBe(0);
  });
  it("평균 52.5 근처가 rank 50", () => {
    expect(rankOf(52)).toBe(50);
    expect(rankOf(5)).toBe(1);
    expect(rankOf(100)).toBe(100);
    expect(rankOf(1)).toBe(1);
  });
});

describe("등급 경계", () => {
  const cases: [number, string][] = [
    [100, "경이로운 대성공"], [73, "경이로운 대성공"], [72, "대성공"], [68, "대성공"], [67, "확실한 성공"], [61, "확실한 성공"],
    [60, "성공"], [52, "성공"], [51, "반쪽 성공"], [49, "반쪽 성공"], [48, "실패"], [43, "실패"], [42, "뼈아픈 실패"], [40, "뼈아픈 실패"],
    [39, "대실패"], [30, "대실패"], [29, "후유증을 남긴 대실패"], [1, "후유증을 남긴 대실패"],
  ];
  it.each(cases)("최종값 %i → %s", (v, name) => expect(gradeOf(v).name).toBe(name));
});

describe("배율 보간", () => {
  it("앵커 값 그대로", () => {
    expect(multOfRank(1)).toBeCloseTo(0.30);
    expect(multOfRank(38)).toBeCloseTo(0.63);
    expect(multOfRank(39)).toBeCloseTo(0.70);
    expect(multOfRank(55)).toBeCloseTo(0.95);
    expect(multOfRank(66)).toBeCloseTo(1.11);
    expect(multOfRank(82)).toBeCloseTo(1.35);
    expect(multOfRank(88)).toBeCloseTo(1.45);
    expect(multOfRank(96)).toBeCloseTo(1.50);
    expect(multOfRank(98)).toBeCloseTo(1.57);
    expect(multOfRank(99)).toBeCloseTo(1.60);
    expect(multOfRank(100)).toBeCloseTo(1.60);
  });
  it("사이 값은 선형", () => {
    expect(multOfRank(47)).toBeCloseTo(0.70 + (0.95 - 0.70) * (8 / 16), 3);
    expect(multOfRank(74)).toBeCloseTo(1.11 + (1.35 - 1.11) * (8 / 16), 3);
  });
  it("단조 증가", () => { for (let r = 1; r < 100; r++) expect(multOfRank(r + 1)).toBeGreaterThanOrEqual(multOfRank(r)); });
});

describe("판정", () => {
  it("시드가 같으면 주사위가 같다", () => {
    const a = createRng(1234), b = createRng(1234);
    expect(roll5d20(a)).toEqual(roll5d20(b));
    expect(roll5d20(createRng(1234))).toMatchInlineSnapshot(`
      [
        2,
        15,
        19,
        20,
        1,
      ]
    `);
  });
  it("보정 후 1~100으로 제한", () => {
    expect(judge([1, 1, 1, 1, 1], -20).final).toBe(1);
    expect(judge([20, 20, 20, 20, 20], 15).final).toBe(100);
    expect(judge([10, 10, 10, 10, 12], 3).final).toBe(55);
  });
  it("성공 확률", () => {
    expect(chanceAtLeast(0)).toBe(Math.round((1 - CDF_5D20[48]!) * 100));
    expect(chanceAtLeast(60)).toBe(100);
    expect(chanceAtLeast(-60)).toBe(0);
  });
});
