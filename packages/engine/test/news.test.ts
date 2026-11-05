import { describe, expect, it } from "vitest";
import { NEWS_MAX_LINES, endTurn, josa, newGame, newsLines, type AiFacts, type FactionId } from "../src";

const facts = (over: Partial<AiFacts> = {}): AiFacts => ({
  turn: 4, player: "arkandal", aiDelta: { iruth: -4, neutral: 1 },
  inf: { arkandal: 30, iruth: 20, voodoo: 35, neutral: 41 },
  wallDelta: 0, wall: 0, researchDelta: 0.7, research: 12.4, ...over,
});

describe("대륙 소식 요약", () => {
  it("3줄 이내, 역병 → 다른 세력 → 중립지 순서", () => {
    const l = newsLines(facts({ plague: { region: "arkandal", amount: 3 } }));
    expect(l).toHaveLength(3);
    expect(l[0]).toMatch(/우리 땅에 역병.*\+3/);
    expect(l[1]).toMatch(/^아이루스가 .* 감염도를 4 낮췄습니다 \(20\) · 치료 연구 12$/);
    expect(l[2]).toBe("라벤 폐허(중립지) 감염도 41 (+1)");
  });
  it("방역이 뚫리면 오름, 변화가 작으면 버팀", () => {
    expect(newsLines(facts({ aiDelta: { iruth: 3, neutral: 0 } }))[0]).toMatch(/방역이 뚫려 감염도가 3 올랐습니다/);
    expect(newsLines(facts({ aiDelta: { iruth: -1, neutral: 0 } }))[0]).toMatch(/버티고 있습니다/);
  });
  it("부두교 플레이 시 두 왕국의 방벽·연구 진척을 알린다", () => {
    const l = newsLines(facts({ player: "voodoo", aiDelta: { arkandal: -3, iruth: -2, neutral: -1 }, wallDelta: 2, wall: 18.6 }));
    expect(l).toHaveLength(3);
    expect(l[0]).toMatch(/^아르칸달.*방벽 18$/);
    expect(l[1]).toMatch(/^아이루스.*치료 연구 12$/);
  });
  it("받침에 맞는 조사", () => {
    expect(josa("아르칸달", "이", "가")).toBe("아르칸달이");
    expect(josa("아이루스", "이", "가")).toBe("아이루스가");
    expect(josa("아이루스", "은", "는")).toBe("아이루스는");
  });
  it("난수를 쓰지 않아 같은 사실이면 같은 문장", () => {
    expect(newsLines(facts())).toEqual(newsLines(facts()));
  });
  it.each(["arkandal", "iruth", "voodoo"] as FactionId[])("%s: 매 턴 종료 결산의 소식은 1~3줄", (f) => {
    let s = { ...newGame(f, 11), phase: "action" as const };
    for (let t = 0; t < 12; t++) {
      s = { ...endTurn(s, { decrees: [] }), phase: "action", turn: s.turn + 1 };
      expect(s.aiReport.length).toBeGreaterThan(0);
      expect(s.aiReport.length).toBeLessThanOrEqual(NEWS_MAX_LINES);
    }
  });
});
