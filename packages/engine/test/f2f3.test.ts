import { describe, it, expect } from "vitest";
import {
  newGame, startTurn, openEvents, resolveEvent, boostOptions, successChance, successChanceWith, endTurn,
  type GameContent, type Card,
} from "../src";

const card: Card = { id: "a", faction: "common", title: "t", body: "b", choices: [{ label: "x", check: { stat: "order" }, effects: { morale: 3 } }, { label: "y", check: { stat: "order", mod: -30 }, effects: { morale: 3 } }] } as unknown as Card;
const content: GameContent = { cards: [card, { ...card, id: "c", faction: "common" }], situational: [], collapse: [], fixed: {}, actions: [], decrees: [] };

describe("F2 보정 투입", () => {
  it("보정이 더해지고 자원이 차감된다", () => {
    const s = openEvents(startTurn(newGame("arkandal", 7), content));
    const choice = s.events[s.eventIdx]!.choices[1]!;
    const opts = boostOptions(s, choice);
    expect(opts.length).toBeGreaterThan(0);
    const b = opts[0]!;
    expect(successChanceWith(s, choice, b.mod)).toBeGreaterThanOrEqual(successChance(s, choice));
    const before = s.res[b.res];
    const { state, outcome } = resolveEvent(s, 1, b);
    expect(state.res[b.res]).toBe(before - b.cost);
    expect(outcome.boostMod).toBe(b.mod);
  });
  it("보정 없이 판정하면 boostMod 0", () => {
    const s = openEvents(startTurn(newGame("iruth", 9), content));
    const { outcome } = resolveEvent(s, 0);
    expect(outcome.boostMod ?? 0).toBe(0);
  });
});

describe("F3 결산 변동", () => {
  it("startTurn/endTurn 이 settleDelta 를 기록한다", () => {
    const s = startTurn(newGame("arkandal", 11), content);
    expect(s.settleDelta).toBeTruthy();
    const e = endTurn(s, content);
    expect(e.settleDelta).toBeTruthy();
  });
});

describe("실시간 skipEvent", () => {
  it("사건을 방치하면 게이지가 깎이고 다음으로 넘어간다", async () => {
    const { skipEvent } = await import("../src");
    const s = openEvents(startTurn(newGame("arkandal", 3), content));
    const idx0 = s.eventIdx; const before = s.gauges.morale;
    const n = skipEvent(s);
    expect(n.gauges.morale).toBeLessThan(before);
    expect(n.eventIdx === idx0 + 1 || n.phase === "action").toBe(true);
  });
});
