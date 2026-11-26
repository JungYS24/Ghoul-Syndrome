import { describe, expect, it } from "vitest";
import {
  CAPITAL, aiWarChance, citiesOf, cityProdMod, declareWar, migrateState, newGame, nextTurn, resolveAction, resolveEvent,
  resolveWarPrep, startTurn, suggestPlays, surrender, warPrepCard, type GameState,
} from "@guul/engine";
import { content } from "../src";

const atAction = (tweak?: (s: GameState) => void): GameState => {
  const s: GameState = { ...startTurn(newGame("arkandal", 11), content), phase: "action", ap: 3 };
  tweak?.(s);
  return s;
};
/** 성공할 때까지 시드를 바꿔 가며 전쟁 준비 (판정은 rng 로 확정되므로) */
function prepUntil(s: GameState, target: number, want: (fin: number) => boolean) {
  for (let seed = 1; seed < 400; seed++) {
    const r = resolveWarPrep({ ...s, rng: seed }, target);
    if (want(r.outcome.final)) return r;
  }
  throw new Error("원하는 판정값을 찾지 못함");
}

describe("전쟁", () => {
  it("준비 카드는 우리 세력을 뺀 두 세력", () => {
    expect(warPrepCard(atAction()).choices.map((c) => c.target)).toEqual(["iruth", "voodoo"]);
  });
  it("같은 상대로 연속 2번 성공하면 선포 가능, 80 이상이면 한 번에", () => {
    const one = prepUntil(atAction(), 0, (f) => f >= 40 && f < 80).state;
    expect(one.warPrep).toEqual({ target: "iruth", stacks: 1 });
    expect(one.warReady).toBeNull();
    const two = prepUntil({ ...one, ap: 2 }, 0, (f) => f >= 40 && f < 80).state;
    expect(two.warReady).toBe("iruth");
    const big = prepUntil(atAction(), 1, (f) => f >= 80).state;
    expect(big.warReady).toBe("voodoo");
  });
  it("다른 행동을 하면 연속 준비가 끊기고, 계절을 넘겨도 유지된다", () => {
    const one = prepUntil(atAction(), 0, (f) => f >= 40 && f < 80).state;
    expect(resolveAction(one, content, "conscript", 1).state.warPrep).toBeNull();
    const next = nextTurn({ ...one, phase: "end" }, content);
    expect(next.warPrep).toEqual({ target: "iruth", stacks: 1 });
  });
  it("준비 중이면 추천 칸에 늘 전쟁 준비가, 선포 가능하면 선전포고가 맨 앞에", () => {
    const one = prepUntil(atAction(), 0, (f) => f >= 40 && f < 80).state;
    expect(suggestPlays(one, content).some((p) => p.kind === "warprep")).toBe(true);
    const ready = { ...one, warPrep: null, warReady: "iruth" as const };
    expect(suggestPlays(ready, content)[0]).toMatchObject({ kind: "declare", id: "iruth" });
  });
  it("선포하면 다음 계절 사건은 전쟁 카드 2장 + 역병 사건 1장", () => {
    const w = declareWar(atAction((s) => { s.warReady = "iruth"; }));
    expect(w.war).toMatchObject({ enemy: "iruth", front: 50, byUs: true });
    const n = nextTurn({ ...w, phase: "end" }, content);
    expect(n.events.length).toBe(3);
    expect(n.events.filter((c) => c.id.startsWith("war-")).length).toBe(2);
    expect(n.events.filter((c) => !c.id.startsWith("war-")).length).toBe(1);
  });
  it("전선 100이면 수도 점령 승리: 적 수도 포함 도시 절반과 자원을 얻는다", () => {
    let s = declareWar(atAction((x) => { x.warReady = "iruth"; }));
    s = nextTurn({ ...s, phase: "end" }, content);
    s = { ...s, phase: "event", war: { ...s.war!, front: 99 } };
    const idx = s.events.findIndex((c) => c.id.startsWith("war-") && c.choices.some((ch) => (ch.war?.front ?? 0) > 0));
    expect(idx).toBeGreaterThanOrEqual(0);
    s = { ...s, eventIdx: idx };
    const ci = s.events[idx]!.choices.findIndex((ch) => (ch.war?.front ?? 0) > 0);
    let won: GameState | null = null;
    for (let seed = 1; seed < 300 && !won; seed++) { const r = resolveEvent({ ...s, rng: seed }, ci); if (r.state.lastWar) won = r.state; }
    expect(won!.war).toBeNull();
    expect(won!.lastWar).toMatchObject({ enemy: "iruth", win: true, how: "capital" });
    expect(won!.cities[CAPITAL.iruth]).toBe("arkandal");
    expect(citiesOf(won!, "arkandal").length).toBe(5 + 3); // 비수도 3곳 중 절반(올림 2) + 수도
    expect(won!.res.silver).toBeGreaterThan(s.res.silver);
    expect(cityProdMod(won!)).toBeCloseTo(1.12);
  });
  it("스스로 항복하면 자원·도시를 1/3만 내준다", () => {
    const s = declareWar(atAction((x) => { x.warReady = "iruth"; x.res.silver = 90; }));
    const l = surrender(s);
    expect(l.war).toBeNull();
    expect(l.lastWar).toMatchObject({ win: false, how: "surrender", voluntary: true });
    expect(l.res.silver).toBe(60);
    expect(citiesOf(l, "arkandal").length).toBe(5 - 2); // 비수도 4곳 × 1/3 올림 = 2
    expect(l.truce.iruth).toBe(l.turn + 4);
  });
  it("타 세력 선포: 질서·민심 ≤ 50 이고 관계 ≤ 30 일 때만", () => {
    const calm = atAction((s) => { s.turn = 5; s.rel.iruth = 10; });
    expect(aiWarChance(calm, "iruth")).toBe(0);
    const shaky = atAction((s) => { s.turn = 5; s.rel.iruth = 10; s.gauges.order = 40; });
    expect(aiWarChance(shaky, "iruth")).toBeGreaterThan(0.2);
    expect(aiWarChance({ ...shaky, rel: { iruth: 45 } }, "iruth")).toBe(0);
  });
  it("예전 저장에는 전쟁 필드가 채워진다", () => {
    const old = JSON.parse(JSON.stringify(newGame("iruth", 1))) as Record<string, unknown>;
    delete old.cities; delete old.war; delete old.truce; delete old.warPrep; delete old.warReady; delete old.lastWar;
    const m = migrateState(old);
    expect(citiesOf(m, "iruth").length).toBe(4);
    expect(m.war).toBeNull();
  });
});
