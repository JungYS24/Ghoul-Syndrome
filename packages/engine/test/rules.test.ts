import { describe, expect, it } from "vitest";
import { baseSpread, continentalInfection, foodUse, infectionDelta, popLoss, preyUse, seasonMod, production, abilityModifier } from "../src";

describe("식량 소비", () => {
  it("(인구 + 병력) ÷ 10", () => {
    expect(foodUse("arkandal", 140, 8)).toBeCloseTo(14.8);
    expect(foodUse("iruth", 85, 3)).toBeCloseTo(8.8);
  });
  it("부두교는 신도 ÷ 10 식량, 구울 무리 ÷ 10 먹이", () => {
    expect(foodUse("voodoo", 40, 12)).toBeCloseTo(4);
    expect(preyUse(12)).toBeCloseTo(1.2);
  });
});

describe("감염도 공식", () => {
  it("계절 보정", () => {
    expect(seasonMod("arkandal", "spring")).toBe(0);
    expect(seasonMod("arkandal", "summer")).toBe(4);
    expect(seasonMod("arkandal", "autumn")).toBe(2);
    expect(seasonMod("arkandal", "winter")).toBe(-6);
    expect(seasonMod("iruth", "winter")).toBe(-9);
  });
  it("기본 확산", () => {
    expect(baseSpread("iruth", 50)).toBeCloseTo(3.5);
    expect(baseSpread("arkandal", 50, { wall: 0 })).toBeCloseTo(4.5);
    expect(baseSpread("arkandal", 50, { wall: 70 })).toBeCloseTo(2.25);
    expect(baseSpread("voodoo", 50, { control: 30 })).toBeCloseTo(5.5);
  });
  it("변화 = 기본 + 계절 + 사건 − 방역", () => expect(infectionDelta(3.5, 4, 2, 7)).toBeCloseTo(2.5));
  it("인구 손실 = 인구 × 감염도/100 × 5% (감염도 60이면 3%)", () => {
    expect(popLoss(100, 60)).toBeCloseTo(3);
    expect(popLoss(140, 28)).toBeCloseTo(1.96);
  });
  it("CI", () => expect(continentalInfection({ arkandal: 90, iruth: 80, neutral: 85, voodoo: 0 })).toBe(85));
});

describe("생산·능력치", () => {
  it("능력치 보정", () => { expect(abilityModifier(50)).toBe(0); expect(abilityModifier(100)).toBe(10); expect(abilityModifier(0)).toBe(-10); expect(abilityModifier(63)).toBe(3); });
  it("생산 = 인구 × 배분 × 효율", () => {
    const p = production("arkandal", 140, 8, "balance", 10, 0);
    expect(p.food).toBeCloseTo(21);
    expect(p.upkeep).toBeCloseTo(4);
    const q = production("arkandal", 140, 8, "balance", 70, 100);
    expect(q.food).toBeCloseTo(21 * 0.8 * 0.5, 1);
  });
});
