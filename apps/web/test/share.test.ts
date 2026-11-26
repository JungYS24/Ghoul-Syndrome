import { describe, expect, it } from "vitest";
import { addEnding, migrateBook, parseShare, shareUrl } from "../src/store/share";

describe("시드 공유 링크", () => {
  it("?seed=&d=&f= 를 읽고, 잘못된 값은 버린다", () => {
    expect(parseShare("?seed=123456&d=brutal&f=voodoo")).toEqual({ seed: 123456, difficulty: "brutal", faction: "voodoo" });
    expect(parseShare("?seed=5&d=hell")).toEqual({ seed: 5 });
    expect(parseShare("?seed=12ab&d=easy&f=elf")).toEqual({});
    expect(parseShare("?seed=99999999999")).toEqual({});
    expect(parseShare("")).toEqual({});
  });
  it("링크를 만들고 다시 읽으면 같은 값 (기본 난이도는 생략)", () => {
    const url = shareUrl("https://x.dev/game/?old=1#top", { seed: 42, difficulty: "base", faction: "iruth" });
    expect(url).toBe("https://x.dev/game/?seed=42&f=iruth");
    const hard = shareUrl("https://x.dev/", { seed: 7, difficulty: "brutal", faction: "arkandal" });
    expect(parseShare(new URL(hard).search)).toEqual({ seed: 7, difficulty: "brutal", faction: "arkandal" });
  });
});

describe("엔딩 달성 기록", () => {
  it("처음 달성과 반복 달성을 누적하고, 입력은 바꾸지 않는다", () => {
    const b0 = {};
    const b1 = addEnding(b0, { id: "v-iruth-cure" }, { faction: "iruth", difficulty: "base" }, "t1");
    expect(b0).toEqual({});
    expect(b1["v-iruth-cure"]).toEqual({ count: 1, first: "t1", last: "t1", factions: ["iruth"], bestDifficulty: "base" });
    const b2 = addEnding(b1, { id: "v-iruth-cure" }, { faction: "iruth", difficulty: "brutal" }, "t2");
    expect(b2["v-iruth-cure"]).toMatchObject({ count: 2, first: "t1", last: "t2", bestDifficulty: "brutal" });
    const b3 = addEnding(b2, { id: "v-iruth-cure" }, { faction: "iruth", difficulty: "base" }, "t3");
    expect(b3["v-iruth-cure"]!.bestDifficulty).toBe("brutal");
  });
  it("예전 기록의 난이도 값을 새 값으로 바꾼다", () => {
    const old = { a: { count: 1, first: "t", last: "t", factions: ["iruth"], bestDifficulty: "hell" }, b: { count: 2, first: "t", last: "t", factions: ["voodoo"], bestDifficulty: "normal" } } as unknown as Parameters<typeof migrateBook>[0];
    const m = migrateBook(old);
    expect(m.a!.bestDifficulty).toBe("brutal");
    expect(m.b!.bestDifficulty).toBe("base");
  });
});
