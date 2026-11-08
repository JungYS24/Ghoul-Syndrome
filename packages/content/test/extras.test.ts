import { describe, expect, it } from "vitest";
import {
  LEGACY_PERKS, STARTER_RELIC, createRng, gaugeInfluences, legacyPointsFor, makeEnding, newGame, openEvents, ownedRelics, relicBlocker, resolveChoice, resolveEvent, startTurn, useRelic,
} from "@guul/engine";
import { content } from "../src";

function inEvent(f: "arkandal" | "iruth" | "voodoo", seed = 3, perks: string[] = []) {
  return openEvents(startTurn(newGame(f, seed, { legacy: perks }), content));
}

describe("유물", () => {
  it("모든 세력 시작 유물이 정의돼 있고 grantRelic 대상이 실제 유물이다", () => {
    const ids = new Set((content.relics ?? []).map((r) => r.id));
    for (const id of Object.values(STARTER_RELIC)) expect(ids.has(id)).toBe(true);
    for (const o of content.opportunities ?? []) for (const c of o.choices) if (c.grantRelic) expect(ids.has(c.grantRelic)).toBe(true);
  });
  it("유물을 쓰면 현재 사건을 넘기고 유물이 사라진다", () => {
    const s0 = inEvent("arkandal", 3, ["blessing"]);
    expect(s0.relics).toEqual(["relic-seal"]);
    expect(ownedRelics(s0, content)).toHaveLength(1);
    const r = useRelic(s0, content, "relic-seal");
    expect(r.state.relics).toEqual([]);
    expect(r.state.eventIdx).toBe(s0.eventIdx + 1);
    expect(s0.relics).toEqual(["relic-seal"]); // 입력 불변
    expect(() => useRelic(r.state, content, "relic-seal")).toThrow();
  });
  it("가지고 있지 않거나 사건 단계가 아니면 쓸 수 없다", () => {
    const s = inEvent("iruth");
    expect(relicBlocker(s, "relic-ledger")).toMatch(/가지고/);
    expect(relicBlocker({ ...s, phase: "action", relics: ["relic-ledger"] }, "relic-ledger")).toMatch(/사건 단계/);
  });
  it("판정이 실패가 아니면 grantRelic 유물을 얻는다", () => {
    const card = (content.opportunities ?? []).find((o) => o.choices.some((c) => c.grantRelic))!;
    const choice = card.choices.find((c) => c.grantRelic)!;
    let got = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const s = newGame("arkandal", seed);
      const r = resolveChoice(s, card, choice, createRng(seed));
      if (r.outcome.final >= 40) { expect(r.state.relics).toContain(choice.grantRelic); got++; } else expect(r.state.relics).toEqual([]);
    }
    expect(got).toBeGreaterThan(0);
  });
});

describe("역사의 유산", () => {
  it("엔딩 유형·난이도로 점수를 계산한다", () => {
    const v = newGame("arkandal", 1); v.ended = makeEnding("v-arkandal-wall");
    expect(legacyPointsFor(v)).toBe(3);
    v.difficulty = "hell"; expect(legacyPointsFor(v)).toBe(5);
    const d = newGame("arkandal", 1); d.turn = 25; d.ended = makeEnding("d-morale");
    expect(legacyPointsFor(d)).toBe(3);
    expect(legacyPointsFor(newGame("arkandal", 1))).toBe(0);
  });
  it("산 보너스가 시작 상태에 반영되고 모르는 id는 무시한다", () => {
    const base = newGame("iruth", 5), s = newGame("iruth", 5, { legacy: ["granary", "will", "staff", "nope"] });
    expect(s.legacy).toEqual(["granary", "will", "staff"]);
    expect(s.res.silver).toBe(base.res.silver + 15);
    expect(s.gauges.morale).toBe(Math.min(100, base.gauges.morale + 3));
    expect(s.ap).toBe(3);
    expect(LEGACY_PERKS.length).toBe(4);
  });
  it("보너스가 없으면 기존 판과 완전히 같다", () => {
    expect(newGame("voodoo", 9, { legacy: [] })).toEqual(newGame("voodoo", 9));
  });
});

describe("게이지 영향 설명", () => {
  it("규칙이 지금 적용 중인지 표시한다", () => {
    const s = newGame("arkandal", 1);
    s.infection.arkandal = 70; s.res.silver = 0;
    expect(gaugeInfluences(s, "order", content).find((x) => /창궐/.test(x.text))!.active).toBe(true);
    expect(gaugeInfluences(s, "finance", content).find((x) => /실링 0/.test(x.text))!.active).toBe(true);
    s.infection.arkandal = 10;
    expect(gaugeInfluences(s, "order", content)[0]!.active).toBe(false);
  });
  it("공포한 법령 효과를 포함한다", () => {
    const d = content.decrees.find((x) => x.faction === "arkandal" && Object.keys(x.effects).some((k) => ["morale", "order", "finance", "legit"].includes(k)))!;
    const key = (Object.keys(d.effects).find((k) => ["morale", "order", "finance", "legit"].includes(k)))! as "morale";
    const s = newGame("arkandal", 1); s.decrees.push({ id: d.id, since: 1 });
    expect(gaugeInfluences(s, key, content).some((x) => x.text.includes(d.name))).toBe(true);
  });
});
