import { describe, it, expect } from "vitest";
import {
  newGame, startTurn, resolveWarAction, WAR_RAID_ID, WAR_PRESSURE_ID, npcVisit, suggestPlays,
  type GameContent, type Card, type FactionId, type WarState,
} from "../src";

const card: Card = { id: "a", faction: "common", title: "t", text: "b", choices: [{ label: "x", check: { stat: "order" }, effects: {} }] } as unknown as Card;
const content: GameContent = { cards: [card, { ...card, id: "c" }], situational: [], collapse: [], fixed: {}, actions: [], decrees: [], opportunities: [], relics: [], warCards: [] } as unknown as GameContent;

function warState(me: FactionId = "arkandal", enemy: FactionId = "iruth") {
  const s = startTurn(newGame(me, 7), content);
  const war: WarState = { enemy, front: 50, hunt: 0, weary: 0, enemyWeary: 0, since: 1, byUs: true };
  return { ...s, phase: "action" as const, ap: 2, war };
}

describe("전시 행동권 행동", () => {
  it("게릴라 습격 — 병력↓, 행동권 소모", () => {
    const s = warState();
    const { state } = resolveWarAction(s, WAR_RAID_ID, 0);
    expect(state.ap).toBe(s.ap - 1);
    expect(state.res.army).toBeLessThan(s.res.army);
    expect(state.war).toBeTruthy();
  });
  it("정치적 압박 — 실링↓(고정 비용), 행동권 소모", () => {
    const s = warState();
    const { state } = resolveWarAction(s, WAR_PRESSURE_ID, 0);
    expect(state.ap).toBe(s.ap - 1);
    expect(state.res.silver).toBe(s.res.silver - 12);
  });
  it("전쟁 중이 아니면 던진다", () => {
    const s = startTurn(newGame("arkandal", 1), content);
    expect(() => resolveWarAction({ ...s, phase: "action", ap: 2 }, WAR_RAID_ID, 0)).toThrow();
  });
});

describe("적국 세력 NPC 알현", () => {
  it("전쟁 상대 세력 NPC면 전쟁 선택지(war/warPeace)로 바뀐다", () => {
    let found = false;
    for (let seed = 1; seed < 60 && !found; seed++) {
      let s = startTurn(newGame("arkandal", seed), content);
      s = { ...s, turn: 4, phase: "end" as const };
      const peek = npcVisit(s);
      if (!peek || peek.npc.faction === s.faction) continue;
      const enemy = peek.npc.faction;
      const v = npcVisit({ ...s, war: { enemy, front: 50, hunt: 0, weary: 0, enemyWeary: 0, since: 1, byUs: true } })!;
      expect(v.card.title).toContain("적국의 사절");
      expect(v.card.choices.some((c) => (c as { war?: unknown; warPeace?: unknown }).war || (c as { warPeace?: unknown }).warPeace)).toBe(true);
      found = true;
    }
    expect(found).toBe(true);
  });
});

describe("suggestPlays 전시 주입", () => {
  it("전쟁 중이면 일정 확률로 waract 가 섞인다", () => {
    let any = false;
    for (let t = 3; t < 25 && !any; t++) {
      const plays = suggestPlays({ ...warState(), turn: t }, content);
      if (plays.some((p) => p.kind === "waract")) any = true;
    }
    expect(any).toBe(true);
  });
});
