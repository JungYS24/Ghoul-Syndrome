import { describe, expect, it } from "vitest";
import {
  branchCard, chainKey, createRng, migrateState, newGame, resolveChoice, scheduleChain, startTurn, takeDueChain,
  type Card, type GameContent, type GameState,
} from "../src";

const tail: Card = {
  id: "tail", faction: "arkandal", title: "탈영병", text: "기본", when: { turn: { min: 99 } }, season: ["winter"],
  choices: [{ label: "기본 A", check: { stat: "order" }, effects: { order: 1 } }, { label: "기본 B", check: { stat: "order" }, effects: { order: 2 } }],
  branches: [
    { prevTones: ["fail", "fumble", "after"], text: "더 나쁨", choices: [{ label: "나쁜 A", check: { stat: "order", mod: -5 }, effects: { order: -3 } }] },
    { prevTones: ["crit", "great"], title: "좋은 소식", choices: [{ label: "좋은 A", check: { stat: "order" }, effects: { order: 5 } }] },
  ],
};
const head: Card = {
  id: "head", faction: "arkandal", title: "위조 명부", text: "",
  choices: [
    { label: "묵인", check: { stat: "order" }, effects: { order: 1 }, followUp: { cardId: "tail", afterTurns: 2 } },
    { label: "처벌", check: { stat: "order" }, effects: { order: 1 } },
  ],
};
const filler: Card = { id: "f", faction: "common", title: "평범", text: "", choices: [{ label: "x", check: { stat: "order" }, effects: {} }] };
const content: GameContent = { cards: [head, tail, { ...filler, id: "fa", faction: "arkandal" }, filler], situational: [], collapse: [], fixed: {}, actions: [], decrees: [] };

describe("연쇄 예약", () => {
  it("followUp 선택지가 N턴 뒤 후속 카드를 예약한다", () => {
    const s = newGame("arkandal", 1);
    const r = resolveChoice(s, head, head.choices[0]!, createRng(5));
    expect(r.state.chains).toEqual([{ cardId: "tail", due: 3, from: "head", fromTitle: "위조 명부", label: "묵인", tone: r.outcome.grade.tone }]);
    expect(r.state.chainsDone).toEqual([chainKey("head", "tail")]);
    expect(s.chains).toEqual([]); // 입력 불변
    expect(resolveChoice(s, head, head.choices[1]!, createRng(5)).state.chains).toEqual([]);
  });
  it("같은 연쇄는 한 판에 한 번만", () => {
    const s = newGame("arkandal", 1);
    expect(scheduleChain(s, head, head.choices[0]!, "success")).not.toBeNull();
    expect(scheduleChain(s, head, head.choices[0]!, "fumble")).toBeNull();
    s.chains = []; // 이미 나온 뒤에도
    expect(scheduleChain(s, head, head.choices[0]!, "success")).toBeNull();
  });
});

describe("후속 카드 갈래", () => {
  it("대실패·실패면 더 나쁜 갈래, 대성공이면 좋은 갈래, 그 외 기본", () => {
    expect(branchCard(tail, "fumble").choices.map((c) => c.label)).toEqual(["나쁜 A"]);
    expect(branchCard(tail, "fumble").text).toBe("더 나쁨");
    expect(branchCard(tail, "fail").text).toBe("더 나쁨");
    expect(branchCard(tail, "crit").title).toBe("좋은 소식");
    expect(branchCard(tail, "great").text).toBe("기본");
    const plain = branchCard(tail, "success");
    expect(plain.choices.map((c) => c.label)).toEqual(["기본 A", "기본 B"]);
    expect(plain.branches).toBeUndefined();
  });
});

describe("연쇄 카드 등장", () => {
  const scheduled = (tone: "fumble" | "success"): GameState => {
    const s = newGame("arkandal", 3);
    scheduleChain(s, head, head.choices[0]!, tone);
    return s;
  };
  it("기한 전에는 안 나오고, 기한이 되면 조건·계절을 무시하고 사건으로 나온다", () => {
    const early = startTurn(scheduled("success"), content);
    expect(early.events.some((c) => c.id === "tail")).toBe(false);
    const s = scheduled("fumble"); s.turn = 3;
    const t = startTurn(s, content);
    const card = t.events.find((c) => c.id === "tail");
    expect(card?.text).toBe("더 나쁨");
    expect(card?.kind).toContain("위조 명부");
    expect(t.chains).toEqual([]);
  });
  it("예약·사용된 꼬리 카드는 무작위로 뽑히지 않는다", () => {
    const s = scheduled("success");
    s.chains = [];
    const pool = { ...content, cards: [tail, filler] };
    for (let i = 0; i < 20; i++) { s.rng = i * 77 + 1; expect(startTurn(s, pool).events.some((c) => c.id === "tail")).toBe(false); }
  });
  it("찾을 수 없는 카드는 버린다", () => {
    const s = newGame("arkandal", 1);
    s.chains = [{ cardId: "nope", due: 1, from: "x", fromTitle: "x", label: "x", tone: "success" }];
    expect(takeDueChain(s, content)).toBeNull();
    expect(s.chains).toEqual([]);
  });
  it("이전 저장에 연쇄 필드를 채운다", () => {
    const old = JSON.parse(JSON.stringify(newGame("arkandal", 1))) as Record<string, unknown>;
    delete old.chains; delete old.chainsDone;
    const m = migrateState(old);
    expect(m.chains).toEqual([]); expect(m.chainsDone).toEqual([]);
  });
});
