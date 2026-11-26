import { describe, expect, it } from "vitest";
import { newGame, startTurn, suggestPlays, type FactionId, type GameState } from "@guul/engine";
import { content } from "../src";

const atAction = (f: FactionId, tweak?: (s: GameState) => void) => {
  const s: GameState = { ...startTurn(newGame(f, 7), content), phase: "action" };
  tweak?.(s);
  return s;
};

describe("행동 단계 추천 4가지", () => {
  it("세력마다 행동·법령을 섞어 최대 4개, 법령은 2개까지, 중복 없음", () => {
    for (const f of ["arkandal", "iruth", "voodoo"] as FactionId[]) {
      const p = suggestPlays(atAction(f), content);
      expect(p.length).toBe(4);
      expect(new Set(p.map((x) => x.kind + x.id)).size).toBe(4);
      expect(p.filter((x) => x.kind === "decree").length).toBeLessThanOrEqual(2);
    }
  });
  it("같은 상태면 같은 추천 (화면이 깜박이지 않음)", () => {
    const s = atAction("iruth");
    expect(suggestPlays(s, content)).toEqual(suggestPlays(s, content));
  });
  it("상황을 반영: 감염이 심하면 방역 계열, 식량이 바닥이면 무역이 올라온다", () => {
    const sick = suggestPlays(atAction("arkandal", (s) => { s.infection.arkandal = 85; }), content).map((p) => p.id);
    expect(sick.some((id) => ["quarantine", "purify", "ark-border-pyre", "ark-curfew"].includes(id))).toBe(true);
    const hungry = suggestPlays(atAction("iruth", (s) => { s.res.food = 2; s.res.silver = 80; }), content).map((p) => p.id);
    expect(hungry.some((id) => id === "trade" || id === "iru-grain-import")).toBe(true);
  });
  it("행동권이 없거나 행동 단계가 아니면 비어 있다", () => {
    expect(suggestPlays(atAction("voodoo", (s) => { s.ap = 0; }), content)).toEqual([]);
    expect(suggestPlays({ ...atAction("voodoo"), phase: "event" }, content)).toEqual([]);
  });
});
