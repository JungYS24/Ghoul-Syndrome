import { describe, expect, it } from "vitest";
import {
  DIFFICULTIES, ENDINGS, applyEffects, checkDefeat, checkVictory, createRng, endingsFor, epilogueOf, finalScore, isDifficulty, makeEnding,
  migrateState, newGame, resolveChoice, startTurn, endTurn, type Card, type GameContent,
} from "../src";

const content: GameContent = { cards: [{ id: "c", faction: "common", title: "x", text: "", choices: [{ label: "x", check: { stat: "order" }, effects: {} }] }], situational: [], collapse: [], fixed: {}, actions: [], decrees: [] };

describe("난이도", () => {
  it("보통이 기본이고, 배율이 단계마다 커진다", () => {
    expect(newGame("arkandal", 1).difficulty).toBe("normal");
    expect(DIFFICULTIES.normal).toMatchObject({ spread: 1, wrath: 1, pressure: 1, aiDefense: 1, aiProgress: 1 });
    for (const k of ["spread", "wrath", "pressure", "aiDefense", "aiProgress"] as const) {
      expect(DIFFICULTIES.hard[k]).toBeGreaterThan(DIFFICULTIES.normal[k]);
      expect(DIFFICULTIES.hell[k]).toBeGreaterThan(DIFFICULTIES.hard[k]);
    }
    expect(isDifficulty("hell")).toBe(true); expect(isDifficulty("easy")).toBe(false);
  });
  it("기본 확산량이 배율만큼 커진다", () => {
    const inf = (d: "normal" | "hard" | "hell") => startTurn(newGame("arkandal", 5, { difficulty: d }), content).infection.arkandal;
    expect(inf("hard")).toBeGreaterThanOrEqual(inf("normal"));
    expect(inf("hell")).toBeGreaterThan(inf("normal"));
  });
  it("오르는 진노만 배율을 받는다", () => {
    const s = newGame("arkandal", 1, { difficulty: "hell" });
    applyEffects(s, { wrath: 10 }, null); expect(s.wrath).toBe(15);
    applyEffects(s, { wrath: -4 }, null); expect(s.wrath).toBe(11);
  });
  it("AI 부두교 압박이 커진다 (같은 시드에서 우리 땅+이웃+중립지 누적 감염)", () => {
    const total = (d: "normal" | "hell") => {
      let s = { ...newGame("iruth", 3, { difficulty: d }), phase: "action" as const };
      for (let i = 0; i < 8; i++) s = { ...endTurn(s, content), phase: "action", turn: s.turn + 1 };
      return s.infection.iruth + s.infection.arkandal + s.infection.neutral;
    };
    expect(total("hell")).toBeGreaterThan(total("normal"));
  });
  it("이전 저장은 보통으로", () => {
    const old = JSON.parse(JSON.stringify(newGame("voodoo", 1))) as Record<string, unknown>;
    delete old.difficulty; delete old.tally;
    const m = migrateState(old);
    expect(m.difficulty).toBe("normal");
    expect(m.tally).toEqual({ rolls: 0, great: 0, fumble: 0 });
  });
});

describe("엔딩 컬렉션", () => {
  it("8종 이상, id·문구가 모두 다르고 세 유형을 다 가진다", () => {
    expect(ENDINGS.length).toBeGreaterThanOrEqual(8);
    expect(new Set(ENDINGS.map((e) => e.id)).size).toBe(ENDINGS.length);
    expect(new Set(ENDINGS.map((e) => e.text)).size).toBe(ENDINGS.length);
    for (const t of ["victory", "defeat", "survive"]) expect(ENDINGS.some((e) => e.type === t)).toBe(true);
    for (const f of ["arkandal", "iruth", "voodoo"] as const) {
      const mine = endingsFor(f);
      expect(mine.some((e) => e.type === "victory")).toBe(true);
      expect(mine.filter((e) => e.type === "defeat").length).toBeGreaterThanOrEqual(4);
    }
  });
  it("승패 판정이 카탈로그 엔딩을 돌려준다", () => {
    const s = newGame("arkandal", 1); s.gauges.morale = 0;
    expect(checkDefeat(s)?.id).toBe("d-morale");
    const v = newGame("voodoo", 1); v.gauges.stealth = 0;
    expect(checkDefeat(v)).toMatchObject({ id: "d-stealth", title: "대토벌" });
    const i = newGame("iruth", 1); i.research = 100;
    expect(checkVictory(i)?.id).toBe("v-iruth-cure");
    const a = newGame("arkandal", 1); a.research = 100;
    expect(checkVictory(a)).toMatchObject({ id: "s-iruth-led", type: "survive" });
    const f = finalScore(newGame("iruth", 1));
    expect(f.id).toBe(`s-${f.grade}`);
    expect(() => makeEnding("nope")).toThrow();
  });
});

describe("맞춤 후기", () => {
  const card: Card = { id: "k", faction: "arkandal", title: "t", text: "", choices: [{ label: "x", check: { stat: "order" }, effects: {} }] };
  it("판정 기록을 센다", () => {
    let s = newGame("arkandal", 1);
    for (let i = 0; i < 30; i++) s = resolveChoice(s, card, card.choices[0]!, createRng(i + 1)).state;
    expect(s.tally.rolls).toBe(30);
    expect(s.tally.great + s.tally.fumble).toBeLessThanOrEqual(30);
  });
  it("1~2문장: 최고 감염도 계절·결말·법령·판정", () => {
    const s = newGame("arkandal", 1);
    s.turn = 12; s.maxInfection = 74;
    s.chronicle = [{ turn: 3, year: 759, season: "가을", text: "", infection: 40, ci: 30 }, { turn: 9, year: 761, season: "봄", text: "", infection: 74, ci: 50 }];
    s.ended = makeEnding("d-morale");
    s.decreeHistory = ["ark-curfew"]; s.tally = { rolls: 31, great: 4, fumble: 2 };
    const t = epilogueOf(s, [{ id: "ark-curfew", name: "계엄 통금령" }]);
    expect(t).toBe("감염도가 74까지 치솟았던 761년 봄을 지나, 아르칸달은 12계절 만에 끝내 무너졌다. 「계엄 통금령」을 공포했고, 31번의 판정에서 대성공 4번, 대실패 2번을 겪었다.");
    expect(t.split(/[.]\s/).length).toBeLessThanOrEqual(2);
  });
  it("법령이 여럿이면 묶어서", () => {
    const s = newGame("iruth", 1); s.ended = makeEnding("v-iruth-cure");
    s.decreeHistory = ["a", "b"]; s.tally = { rolls: 0, great: 0, fumble: 0 };
    expect(epilogueOf(s, [{ id: "a", name: "검역 수수료령" }, { id: "b", name: "항구 봉쇄령" }])).toMatch(/아이루스는 1계절 만에 끝내 승리를 거두었다\. 「검역 수수료령」 등 법령 2개를 공포했고, 주사위는/);
  });
});

import { governanceTitle } from "../src";
describe("통치 성향 칭호", () => {
  it("가장 높은 게이지와 엔딩 유형으로 칭호를 만든다", () => {
    const s = newGame("arkandal", 1);
    s.gauges.order = 95; s.ended = makeEnding("v-arkandal-wall");
    expect(governanceTitle(s).title).toBe("철혈의 구원자");
    s.ended = makeEnding("d-morale");
    expect(governanceTitle(s).title).toBe("철혈의 몰락자");
  });
  it("진노가 높으면 접두어가 붙고, 부두교는 다른 명사를 쓴다", () => {
    const s = newGame("voodoo", 1);
    s.gauges.faith = 99; s.wrath = 95; s.ended = makeEnding("v-voodoo-grace");
    expect(governanceTitle(s).title).toBe("진노를 짊어진 광신의 대사제");
  });
});
