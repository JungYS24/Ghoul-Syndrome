import { describe, expect, it } from "vitest";
import { applyEffects, createRng, newGame, resolveChoice, type Card, type GameContent, startTurn, openEvents, endTurn, resolveEvent } from "../src";

const card: Card = {
  id: "t", faction: "arkandal", title: "감염된 국경 수비대", text: "",
  choices: [{ label: "봉쇄", check: { stat: "order" }, effects: { infection: -15, army: -0.3, wrath: 10 }, onFail: { army: -0.8, order: -10 } }],
};
const content: GameContent = { cards: [card, { ...card, id: "c", faction: "common" }], situational: [], collapse: [], fixed: {}, actions: [] };

describe("resolveChoice", () => {
  it("입력 state 를 바꾸지 않고, 같은 시드면 같은 결과", () => {
    const s = newGame("arkandal", 42);
    const snap = JSON.stringify(s);
    const a = resolveChoice(s, card, card.choices[0]!, createRng(7));
    const b = resolveChoice(s, card, card.choices[0]!, createRng(7));
    expect(JSON.stringify(s)).toBe(snap);
    expect(a.outcome).toEqual(b.outcome);
    expect(a.outcome.dice).toHaveLength(5);
    expect(a.outcome.final).toBe(Math.max(1, Math.min(100, a.outcome.sum + a.outcome.statMod + a.outcome.choiceMod + a.outcome.stateMod)));
  });
  it("최종값 40 미만이면 onFail 추가", () => {
    let seen = false;
    for (let seed = 1; seed < 400 && !seen; seed++) {
      const r = resolveChoice(newGame("arkandal", 1), card, card.choices[0]!, createRng(seed));
      if (r.outcome.final < 40) { expect(r.outcome.failApplied.length).toBeGreaterThan(0); seen = true; }
      else expect(r.outcome.failApplied).toHaveLength(0);
    }
    expect(seen).toBe(true);
  });
});

describe("효과", () => {
  it("배율: 이로움 ×m, 해로움 ×(2−m), 비용 고정", () => {
    const s = newGame("arkandal", 1);
    s.infection.arkandal = 50; s.res.silver = 50;
    applyEffects(s, { infection: -10, wrath: 10, silver: -4 }, 1.5);
    expect(s.infection.arkandal).toBe(35);
    expect(s.wrath).toBe(5);
    expect(s.res.silver).toBe(46);
  });
  it("부두교 withSuccess 은닉은 성공할수록 더 깎인다", () => {
    const s = newGame("voodoo", 1); s.target = "iruth";
    const before = s.infection.iruth;
    applyEffects(s, { target: 12, stealth: -8 }, 1.5, { withSuccess: ["stealth"] });
    expect(s.infection.iruth).toBe(before + 18);
    expect(s.gauges.stealth).toBe(60 - 12);
  });
  it("공통 카드 게이지는 부두교에서 매핑", () => {
    const s = newGame("voodoo", 1);
    applyEffects(s, { morale: 5, order: -5 }, null);
    expect(s.gauges.faith).toBe(65); expect(s.gauges.control).toBe(50);
  });
});

describe("턴 진행", () => {
  it("시작 결산: 식량 소비와 감염도 갱신", () => {
    const s = startTurn(newGame("arkandal", 9), content);
    expect(s.phase).toBe("start");
    expect(s.res.food).toBeCloseTo(90 - 14.8, 1);
    expect(s.infection.arkandal).toBe(28 + Math.round((1.5 + 28 * 0.04 + 1) * 1 + 0));
    expect(s.events.length).toBeGreaterThanOrEqual(2);
  });
  it("같은 시드의 게임은 끝까지 같다 (리플레이)", () => {
    const run = () => {
      let s = openEvents(startTurn(newGame("iruth", 2026), content));
      while (s.phase === "event") s = resolveEvent(s, 0).state;
      return endTurn(s);
    };
    expect(JSON.stringify(run())).toBe(JSON.stringify(run()));
  });
});
