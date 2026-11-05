import { describe, expect, it } from "vitest";
import { choiceImpact, impactSize, newGame, type Choice } from "../src";

describe("선택지 영향 미리보기", () => {
  it("규모는 3단계로 묶고 숫자는 돌려주지 않는다", () => {
    expect(impactSize("morale", 3)).toBe(1);
    expect(impactSize("morale", -8)).toBe(2);
    expect(impactSize("infection", 15)).toBe(3);
    expect(impactSize("pop", 0.3)).toBe(1);
    expect(impactSize("army", -1.5)).toBe(3);
  });
  it("현재 세력 키로 매핑하고, onFail 도 포함하되 큰 쪽을 쓴다", () => {
    const c: Choice = { label: "x", check: { stat: "order" }, effects: { morale: 3, silver: -4, prey: 5 }, onFail: { morale: -12, order: -2 } };
    const ark = choiceImpact(newGame("arkandal", 1), c);
    expect(ark).toEqual(expect.arrayContaining([{ key: "morale", size: 3 }, { key: "silver", size: 1 }, { key: "order", size: 1 }]));
    expect(ark.find((d) => d.key === "prey")).toBeUndefined(); // 부두교 전용 자원은 빠짐
    const vd = choiceImpact(newGame("voodoo", 1), c);
    expect(vd.map((d) => d.key).sort()).toEqual(["control", "faith", "prey", "silver"]);
  });
  it("관계 효과는 rel 하나로 묶고, 0 은 무시한다", () => {
    const c: Choice = { label: "x", check: { stat: "legit" }, effects: { relTo: 6, rel: 2, wrath: 0 }, target: "iruth" };
    expect(choiceImpact(newGame("arkandal", 1), c)).toEqual([{ key: "rel", size: 2 }]);
  });
  it("입력 state 를 바꾸지 않는다", () => {
    const s = newGame("iruth", 3); const snap = JSON.stringify(s);
    choiceImpact(s, { label: "x", check: { stat: "order" }, effects: { infection: -5 } });
    expect(JSON.stringify(s)).toBe(snap);
  });
});
