import { describe, expect, it } from "vitest";
import {
  MAX_DECREES, decreesFor, enactBlocker, enactDecree, endTurn, migrateState, newGame, repealDecree, settleDecrees,
  type Decree, type GameContent, type GameState,
} from "../src";

const D = (id: string, extra: Partial<Decree> = {}): Decree => ({ id, faction: "arkandal", name: id, desc: "", icon: "bell", effects: {}, upkeep: {}, ...extra });
const content: Pick<GameContent, "decrees"> = {
  decrees: [
    D("levy", { effects: { army: 0.5, morale: -2 }, upkeep: { food: 3 } }),
    D("pyre", { effects: { infection: -2 }, upkeep: { silver: 2 }, wrath: 2, repealWhen: { wrath: { min: 90 } }, repealText: "파문" }),
    D("a"), D("b"),
    D("rich", { upkeep: { silver: 999 } }),
    D("gated", { requires: { turn: { min: 5 } } }),
    { ...D("iru"), faction: "iruth" },
  ],
};
const inAction = (s: GameState): GameState => ({ ...s, phase: "action", ap: 3 });

describe("법령 공포·철회", () => {
  it("행동권 1개로 공포하고, 입력 state 는 그대로", () => {
    const s0 = inAction(newGame("arkandal", 1));
    const snap = JSON.stringify(s0);
    const s1 = enactDecree(s0, content, "levy");
    expect(JSON.stringify(s0)).toBe(snap);
    expect(s1.ap).toBe(2);
    expect(s1.decrees).toEqual([{ id: "levy", since: 1 }]);
    expect(s1.flags).toContain("decree:levy");
    expect(s1.decreeHistory).toEqual(["levy"]);
  });
  it("동시에 최대 3개", () => {
    let s = { ...inAction(newGame("arkandal", 1)), ap: 9 };
    for (const id of ["levy", "pyre", "a"]) s = enactDecree(s, content, id);
    expect(s.decrees).toHaveLength(MAX_DECREES);
    expect(() => enactDecree(s, content, "b")).toThrow(/3개/);
  });
  it("행동권·세력·조건·유지비·중복을 검사", () => {
    const s = inAction(newGame("arkandal", 1));
    const get = (id: string) => content.decrees.find((d) => d.id === id)!;
    expect(enactBlocker({ ...s, ap: 0 }, get("levy"))).toMatch(/행동권/);
    expect(enactBlocker(s, get("iru"))).toMatch(/세력/);
    expect(enactBlocker(s, get("gated"))).toMatch(/조건/);
    expect(enactBlocker(s, get("rich"))).toMatch(/부족/);
    expect(enactBlocker({ ...s, phase: "event" }, get("levy"))).toMatch(/행동 단계/);
    expect(enactBlocker(enactDecree(s, content, "levy"), get("levy"))).toMatch(/이미/);
    expect(decreesFor(s, content).map((d) => d.id)).not.toContain("iru");
  });
  it("철회도 행동권 1개, 플래그 제거", () => {
    const s1 = enactDecree(inAction(newGame("arkandal", 1)), content, "levy");
    const s2 = repealDecree(s1, content, "levy");
    expect(s2.ap).toBe(1);
    expect(s2.decrees).toEqual([]);
    expect(s2.flags).not.toContain("decree:levy");
    expect(s2.decreeHistory).toEqual(["levy"]);
    expect(() => repealDecree({ ...s1, ap: 0 }, content, "levy")).toThrow(/행동권/);
  });
});

describe("법령 결산", () => {
  it("유지비를 빼고 매 턴 효과와 진노를 적용", () => {
    const s = newGame("arkandal", 1);
    s.decrees = [{ id: "levy", since: 1 }, { id: "pyre", since: 1 }];
    const food = s.res.food, silver = s.res.silver, army = s.res.army, inf = s.infection.arkandal;
    const rep = settleDecrees(s, content);
    expect(s.res.food).toBe(food - 3);
    expect(s.res.silver).toBe(silver - 2);
    expect(s.res.army).toBeCloseTo(army + 0.5);
    expect(s.gauges.morale).toBe(58 - 2);
    expect(s.infection.arkandal).toBe(inf - 2);
    expect(s.wrath).toBe(2);
    expect(rep).toHaveLength(2);
  });
  it("유지비를 못 내면 효과 없이 폐지", () => {
    const s = newGame("arkandal", 1);
    s.decrees = [{ id: "levy", since: 1 }]; s.flags = ["decree:levy"]; s.res.food = 1;
    const rep = settleDecrees(s, content);
    expect(s.decrees).toEqual([]);
    expect(s.flags).toEqual([]);
    expect(s.res.army).toBe(8);
    expect(rep[0]).toMatch(/폐지/);
  });
  it("해제 조건이 맞으면 시행 후 폐지", () => {
    const s = newGame("arkandal", 1);
    s.decrees = [{ id: "pyre", since: 1 }]; s.wrath = 89;
    const rep = settleDecrees(s, content);
    expect(s.wrath).toBe(91);
    expect(s.decrees).toEqual([]);
    expect(rep.join(" ")).toMatch(/파문/);
  });
  it("진노 배율", () => {
    const s = newGame("arkandal", 1); s.decrees = [{ id: "pyre", since: 1 }];
    settleDecrees(s, content, 1.5);
    expect(s.wrath).toBe(3);
  });
  it("endTurn 종료 결산에서 처리된다", () => {
    const s0 = enactDecree(inAction(newGame("arkandal", 7)), content, "levy");
    const s1 = endTurn(s0, content);
    expect(s1.endReport.join(" ")).toMatch(/levy/);
    expect(s1.decrees).toHaveLength(1);
  });
});

describe("저장 이전", () => {
  it("v2 저장에 법령 필드를 채운다", () => {
    const old = JSON.parse(JSON.stringify(newGame("iruth", 1))) as Record<string, unknown>;
    delete old.decrees; delete old.decreeHistory; old.version = 2;
    const s = migrateState(old);
    expect(s.version).toBe(3);
    expect(s.decrees).toEqual([]);
    expect(s.decreeHistory).toEqual([]);
    expect(old.decrees).toBeUndefined();
  });
});
