import { describe, expect, it } from "vitest";
import { createRng, newGame, startTurn, openEvents, resolveEvent, endTurn, enactDecree, nextTurn, actionsFor, resolveAction, type GameState, type FactionId } from "@guul/engine";
import { content } from "../src";

describe("카드 데이터", () => {
  it("zod 검증을 통과하고 세력별 수량이 맞다", () => {
    const cnt = (f: string) => content.cards.filter((c) => c.faction === f).length;
    expect(cnt("arkandal")).toBeGreaterThanOrEqual(40);
    expect(cnt("iruth")).toBeGreaterThanOrEqual(40);
    expect(cnt("voodoo")).toBeGreaterThanOrEqual(40);
    expect(cnt("common")).toBeGreaterThanOrEqual(40);
    expect(Object.keys(content.fixed).sort()).toEqual(["10", "20", "30", "40"]);
  });
  it("모든 카드 id 가 유일하다", () => {
    const ids = [...content.cards, ...content.situational, ...content.collapse, ...Object.values(content.fixed)].map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

function autoplay(f: FactionId, seed: number): GameState {
  let s = startTurn(newGame(f, seed), content);
  const rng = createRng(seed ^ 0x9e3779b9);
  let guard = 0;
  while (!s.ended && guard++ < 500) {
    if (s.phase === "start") { s = openEvents(s); continue; }
    if (s.phase === "event") { s = resolveEvent(s, Math.floor(rng.next() * (s.events[s.eventIdx]?.choices.length ?? 1))).state; continue; }
    if (s.phase === "action") {
      if (s.ap > 0) { const acts = actionsFor(s, content); const a = acts[Math.floor(rng.next() * acts.length)]!; s = resolveAction(s, content, a.id, Math.floor(rng.next() * a.card.choices.length)).state; }
      else s = endTurn(s, content);
      continue;
    }
    if (s.phase === "end") { s = nextTurn(s, content); continue; }
    break;
  }
  return s;
}

describe("연쇄 사건 데이터", () => {
  const all = [...content.cards, ...content.situational, ...content.collapse, ...Object.values(content.fixed)];
  const links = all.flatMap((c) => c.choices.filter((ch) => ch.followUp).map((ch) => ({ from: c, to: all.find((x) => x.id === ch.followUp!.cardId) })));
  it("12쌍 이상 연결되고, 후속 카드가 존재하며 같은 세력", () => {
    expect(new Set(links.map((l) => l.from.id + ">" + l.to?.id)).size).toBeGreaterThanOrEqual(12);
    for (const l of links) { expect(l.to, l.from.id).toBeDefined(); expect(l.to!.faction).toBe(l.from.faction); }
  });
  it("후속 카드마다 이전 등급별 갈래가 있다", () => {
    for (const l of links) {
      const b = l.to!.branches ?? [];
      expect(b.length, l.to!.id).toBeGreaterThan(0);
      expect(b.some((x) => x.prevTones.includes("fumble")), l.to!.id).toBe(true);
    }
  });
});

describe("법령 데이터", () => {
  it("세력마다 4~6개, id 유일", () => {
    for (const f of ["arkandal", "iruth", "voodoo"]) {
      const n = content.decrees.filter((d) => d.faction === f).length;
      expect(n).toBeGreaterThanOrEqual(4); expect(n).toBeLessThanOrEqual(6);
    }
    const ids = content.decrees.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("모든 법령에 대가가 있다 (유지비·진노·해로운 효과 중 하나 이상)", () => {
    for (const d of content.decrees) {
      const harm = Object.entries(d.effects).some(([k, v]) => (k === "infection" || k === "wrath" ? v > 0 : v < 0));
      expect(Object.keys(d.upkeep).length > 0 || (d.wrath ?? 0) > 0 || harm, d.id).toBe(true);
    }
  });
  it("공포 → 10계절 결산이 오류 없이 돈다", () => {
    for (const d of content.decrees) {
      let s: GameState = { ...newGame(d.faction, 3), phase: "action", ap: 3 };
      s = enactDecree(s, content, d.id);
      for (let i = 0; i < 10; i++) s = { ...endTurn(s, content), phase: "action" };
      expect(Number.isFinite(s.res.silver)).toBe(true);
    }
  });
});

describe("40턴 자동 플레이", () => {
  it.each(["arkandal", "iruth", "voodoo"] as const)("%s 세력이 오류 없이 끝까지 진행된다", (f) => {
    for (let seed = 1; seed <= 20; seed++) { const s = autoplay(f, seed * 101); expect(s.ended).not.toBeNull(); expect(s.turn).toBeLessThanOrEqual(40); }
  });
});

describe("기회의 창", () => {
  const opps = content.opportunities ?? [];
  it("세력별·공통 카드가 있고 id 가 기존 카드와 겹치지 않는다", () => {
    expect(opps.length).toBeGreaterThanOrEqual(9);
    const all = new Set([...content.cards, ...content.situational, ...content.collapse].map((c) => c.id));
    for (const o of opps) expect(all.has(o.id)).toBe(false);
    for (const f of ["arkandal", "iruth", "voodoo", "common"]) expect(opps.some((o) => o.faction === f)).toBe(true);
  });
  it("모든 카드에 비용 없는 선택지(지나친다 또는 자원 감소 없음)가 있다", () => {
    for (const o of opps) expect(o.choices.some((c) => Object.values(c.onFail ?? {}).every((v) => v >= 0) && !Object.entries(c.effects).some(([k, v]) => ["silver", "food", "prey", "army"].includes(k) && v < 0))).toBe(true);
  });
  it("플레이하다 보면 기회의 창이 실제로 나온다", () => {
    let seen = 0;
    for (const f of ["arkandal", "iruth", "voodoo"] as FactionId[]) for (let seed = 1; seed <= 6; seed++) {
      let s = startTurn(newGame(f, seed), content);
      for (let t = 0; t < 12 && !s.ended; t++) {
        seen += s.events.filter((e) => e.kind === "기회의 창").length;
        s = openEvents(s);
        while (s.phase === "event" && !s.ended) s = resolveEvent(s, 0).state;
        if (s.ended) break;
        s = endTurn(s, content); if (s.ended) break; s = nextTurn(s, content);
      }
    }
    expect(seen).toBeGreaterThan(0);
  });
});
