import { AFTERMATH_AT_OR_BELOW, ON_FAIL_BELOW, chanceAtLeast, clamp, judge, roll5d20 } from "./dice";
import { FACTIONS, GAUGE_LABEL, NEUTRAL_START, REGION_NAME, SEASON_KO, VOODOO_MAP, otherFactions, seasonOf, yearOf } from "./factions";
import { createRng, type Rng } from "./rng";
import {
  abilityModifier, baseSpread, continentalInfection, foodUse, popLoss, preyUse, production, r1, seasonMod, stateModifier,
} from "./rules";
import { diffOf, isDifficulty, type Difficulty } from "./difficulty";
import { settleDecrees } from "./decrees";
import { chainTailIds, scheduleChain, takeDueChain } from "./chains";
import { makeEnding } from "./endings";
import { newsLines, type AiFacts } from "./news";
import type {
  ActionDef, AppliedEffect, Card, Choice, EffectKey, Effects, Ending, FactionId, GameContent, GameState, GaugeKey,
  RegionId, ResourceKey, RollOutcome, When,
} from "./types";

const ALL_GAUGES: GaugeKey[] = ["morale", "order", "finance", "legit", "faith", "control", "offering", "stealth"];
const RES_KEYS: ResourceKey[] = ["pop", "army", "food", "silver", "strat", "prey"];
const COST_KEYS: EffectKey[] = ["silver", "strat", "food", "prey"];

// ───────── 생성 ─────────
export function newGame(faction: FactionId, seed: number, opts: { difficulty?: Difficulty } = {}): GameState {
  const F = FACTIONS[faction];
  const gauges = Object.fromEntries(ALL_GAUGES.map((k) => [k, F.start[k] ?? 50])) as Record<GaugeKey, number>;
  const infection: Record<RegionId, number> = {
    arkandal: FACTIONS.arkandal.infection, iruth: FACTIONS.iruth.infection, voodoo: FACTIONS.voodoo.infection, neutral: NEUTRAL_START,
  };
  const rel: Partial<Record<FactionId, number>> = {};
  if (faction !== "voodoo") rel[faction === "arkandal" ? "iruth" : "arkandal"] = 40;
  return {
    version: 3, difficulty: opts.difficulty ?? "normal", tally: { rolls: 0, great: 0, fumble: 0 },
    seed: seed >>> 0, rng: seed >>> 0, faction, turn: 1, phase: "start",
    gauges, res: { ...F.res }, startPop: F.res.pop,
    infection, infHist: [infection[faction], infection[faction]], streak: { arkandal: 0, iruth: 0, voodoo: 0, neutral: 0 }, ciStreak: 0,
    wrath: 0, research: 0, wall: 0, voodooPower: faction === "voodoo" ? 0 : 100,
    rel, pacts: [], target: faction === "voodoo" ? "arkandal" : "neutral",
    flags: [], ap: 2, preset: "balance", queue: [], recent: {}, events: [], eventIdx: 0,
    startReport: [], endReport: [], aiReport: [], turnLog: [], chronicle: [], maxInfection: infection[faction], tempInf: 0,
    decrees: [], decreeHistory: [], chains: [], chainsDone: [], ended: null,
  };
}
const clone = <T>(v: T): T => (typeof structuredClone === "function" ? structuredClone(v) : JSON.parse(JSON.stringify(v)));
export const isVoodooAi = (s: GameState) => s.faction !== "voodoo";
export const ci = (s: GameState) => continentalInfection(s.infection);

/** 옛 저장(v2 이하)에 v3 필드를 채웁니다. 입력은 바꾸지 않습니다. */
export function migrateState(raw: unknown): GameState {
  const o = { ...(raw as Record<string, unknown>) };
  o.version = 3;
  o.difficulty = isDifficulty(o.difficulty) ? o.difficulty : "normal";
  o.tally = (o.tally as GameState["tally"]) ?? { rolls: 0, great: 0, fumble: 0 };
  o.decrees = (o.decrees as GameState["decrees"]) ?? [];
  o.decreeHistory = (o.decreeHistory as string[]) ?? [];
  o.chains = (o.chains as GameState["chains"]) ?? [];
  o.chainsDone = (o.chainsDone as string[]) ?? [];
  return o as unknown as GameState;
}

// ───────── 키 매핑·라벨 ─────────
/** 공통 키를 현재 세력 키로 바꿉니다. 해당 없는 키는 null. */
export function mapKey(s: GameState, key: EffectKey): EffectKey | null {
  const V = s.faction === "voodoo";
  if (V && key in VOODOO_MAP) return VOODOO_MAP[key as GaugeKey]!;
  if (!V && (["faith", "control", "offering", "stealth", "prey", "target"] as EffectKey[]).includes(key)) return null;
  if (key === "wall" && s.faction !== "arkandal") return null;
  if (key === "voodooPower" && V) return null;
  if (V && (key === "rel" || key === "relTo")) return null;
  return key;
}
export function mapGauge(s: GameState, k: GaugeKey): GaugeKey { return (mapKey(s, k) as GaugeKey | null) ?? k; }
export function labelOf(s: GameState, k: EffectKey): string {
  if (k in GAUGE_LABEL) return GAUGE_LABEL[k as GaugeKey];
  const F = FACTIONS[s.faction];
  const L: Partial<Record<EffectKey, string>> = {
    pop: F.popName, army: F.armyName, food: "식량", silver: "실링", strat: F.stratName, prey: "먹이",
    infection: "감염도", target: `${REGION_NAME[s.target]} 감염도`, neutral: "중립지 감염도", wrath: "진노", research: "연구", wall: "방벽",
    rel: "타 세력 관계", relTo: "관계", voodooPower: "부두교 세력",
  };
  return L[k] ?? k;
}
/** 값이 오르면 나쁜 키 */
export function isBadUp(s: GameState, k: EffectKey): boolean {
  if (k === "infection" || k === "wrath" || k === "voodooPower") return true;
  if (k === "neutral") return s.faction !== "voodoo";
  return false;
}

// ───────── 효과 적용 (draft 를 직접 바꿉니다) ─────────
function setRegion(s: GameState, r: RegionId, d: number): number {
  const b = s.infection[r];
  s.infection[r] = clamp(Math.round(b + d), 0, 100);
  if (r === s.faction) s.maxInfection = Math.max(s.maxInfection, s.infection[r]);
  return s.infection[r] - b;
}
/**
 * mult === null 이면 그대로 적용. 아니면 이로운 값 ×배율, 해로운 값 ×(2−배율)[0.4~1.7],
 * 자원 비용(실링·전략 자원·식량·먹이 감소)은 고정, withSuccess 키는 부호와 무관하게 ×배율.
 * 오르는 진노는 추가로 난이도 배율을 받습니다.
 */
export function applyEffects(s: GameState, eff: Effects | undefined, mult: number | null, opts: { withSuccess?: EffectKey[]; target?: FactionId } = {}): AppliedEffect[] {
  const out: AppliedEffect[] = [];
  for (const [rawKey, rawVal] of Object.entries(eff ?? {}) as [EffectKey, number][]) {
    const k = mapKey(s, rawKey);
    if (!k || !rawVal) continue;
    let v = rawVal;
    const bad = isBadUp(s, k);
    if (mult !== null) {
      if (opts.withSuccess?.includes(rawKey) || opts.withSuccess?.includes(k)) v = v * mult;
      else if (!(v < 0 && COST_KEYS.includes(k))) v = (v > 0) !== bad ? v * mult : v * clamp(2 - mult, 0.4, 1.7);
    }
    let d = 0;
    let label = labelOf(s, k);
    if (k === "rel" || k === "relTo") {
      const dd = Math.round(v);
      const targets = k === "relTo" ? (opts.target && opts.target !== s.faction ? [opts.target] : []) : (Object.keys(s.rel) as FactionId[]);
      for (const t of targets) { const b = s.rel[t] ?? 0; s.rel[t] = clamp(b + dd, 0, 100); d = (s.rel[t] ?? 0) - b; }
      if (k === "relTo" && opts.target) label = `${FACTIONS[opts.target].short} 관계`;
    } else if ((ALL_GAUGES as string[]).includes(k)) {
      const g = k as GaugeKey; const b = s.gauges[g];
      s.gauges[g] = clamp(b + Math.round(v), 0, 100); d = s.gauges[g] - b;
      if (s.gauges[g] >= 100 && b < 100 && FACTIONS[s.faction].gauges.includes(g) && !s.queue.some((q) => q.type === "overflow" && q.key === g)) s.queue.push({ type: "overflow", key: g });
    } else if ((RES_KEYS as string[]).includes(k)) {
      const rk = k as ResourceKey; const unit = rk === "pop" || rk === "army";
      const b = s.res[rk]; s.res[rk] = Math.max(0, unit ? r1(b + v) : Math.round(b + v)); d = r1(s.res[rk] - b);
    } else if (k === "wrath") {
      let dd = Math.round(v);
      if (dd > 0) dd = Math.round(dd * diffOf(s).wrath);
      if (s.wrath >= 100 && dd < 0) dd = 0;
      const b = s.wrath; s.wrath = clamp(b + dd, 0, 100); d = s.wrath - b;
    } else if (k === "infection") d = setRegion(s, s.faction, v);
    else if (k === "target") d = setRegion(s, s.target, v);
    else if (k === "neutral") d = setRegion(s, "neutral", v);
    else if (k === "research") {
      const vv = v > 0 ? v * FACTIONS[s.faction].resEff : v;
      const b = s.research; s.research = clamp(r1(b + vv), 0, 100); d = r1(s.research - b);
    } else if (k === "wall") { const b = s.wall; s.wall = clamp(Math.round(b + v), 0, 100); d = s.wall - b; }
    else if (k === "voodooPower") { const b = s.voodooPower; s.voodooPower = clamp(Math.round(b + v), 0, 100); d = s.voodooPower - b; }
    if (d) out.push({ key: k, label, delta: d, good: (d > 0) !== bad });
  }
  return out;
}
function addG(s: GameState, k: GaugeKey, v: number) { applyEffects(s, { [k]: v }, null); }

// ───────── 판정 ─────────
export function costOf(choice: Choice): Partial<Record<ResourceKey, number>> {
  const c: Partial<Record<ResourceKey, number>> = {};
  for (const [k, v] of Object.entries(choice.effects) as [EffectKey, number][]) if (v < 0 && COST_KEYS.includes(k)) c[k as ResourceKey] = -v;
  return c;
}
export function canAfford(s: GameState, choice: Choice): boolean {
  for (const [k, v] of Object.entries(costOf(choice)) as [ResourceKey, number][]) {
    if (!mapKey(s, k)) continue;
    if (s.res[k] < v) return false;
  }
  return true;
}
export function checkModifiers(s: GameState, choice: Choice) {
  const g = mapGauge(s, choice.check.stat);
  const statMod = abilityModifier(s.gauges[g]);
  const choiceMod = choice.check.mod ?? 0;
  const stMod = stateModifier(s);
  return { statMod, choiceMod, stateMod: stMod, total: statMod + choiceMod + stMod, statLabel: GAUGE_LABEL[g] };
}
/** 성공(반쪽 성공 이상) 확률 % */
export function successChance(s: GameState, choice: Choice): number { return chanceAtLeast(checkModifiers(s, choice).total); }

/**
 * 핵심 판정: 입력 state 는 바꾸지 않고 새 state 와 결과를 돌려줍니다.
 * 주사위는 rng 로 여기서 확정되며, 화면 애니메이션은 이 결과를 보여 주기만 합니다.
 */
export function resolveChoice(state: GameState, card: Card, choice: Choice, rng: Rng): { state: GameState; outcome: RollOutcome } {
  const s = clone(state);
  const m = checkModifiers(s, choice);
  const dice = roll5d20(rng);
  const j = judge(dice, m.total);
  const applied = applyEffects(s, choice.effects, j.mult, { withSuccess: choice.withSuccess, target: choice.target });
  const failApplied = j.final < ON_FAIL_BELOW && choice.onFail ? applyEffects(s, choice.onFail, null, { target: choice.target }) : [];
  const aftermath = j.final <= AFTERMATH_AT_OR_BELOW;
  if (aftermath) s.queue.push({ type: "aftermath" });
  for (const f of choice.setFlags ?? []) if (!s.flags.includes(f)) s.flags.push(f);
  scheduleChain(s, card, choice, j.grade.tone);
  const t = j.grade.tone;
  s.tally = {
    rolls: s.tally.rolls + 1,
    great: s.tally.great + (t === "crit" || t === "great" ? 1 : 0),
    fumble: s.tally.fumble + (t === "fumble" || t === "after" ? 1 : 0),
  };
  s.turnLog.push({ title: card.title, label: choice.label, grade: j.grade.name, tone: j.grade.tone, final: j.final });
  s.rng = rng.state;
  return {
    state: s,
    outcome: { dice, sum: j.sum, statMod: m.statMod, choiceMod: m.choiceMod, stateMod: m.stateMod, final: j.final, rank: j.rank, mult: j.mult, grade: j.grade, stat: m.statLabel, applied, failApplied, aftermath },
  };
}

// ───────── 카드 뽑기 ─────────
export function foodUseOf(s: GameState) { return foodUse(s.faction, s.res.pop, s.res.army); }
function inRange(v: number, r?: { min?: number; max?: number }) { return !r || ((r.min === undefined || v >= r.min) && (r.max === undefined || v <= r.max)); }
export function condOk(s: GameState, w?: When): boolean {
  if (!w) return true;
  if (!inRange(s.infection[s.faction], w.infection) || !inRange(s.turn, w.turn) || !inRange(s.wrath, w.wrath) || !inRange(ci(s), w.ci) || !inRange(s.wall, w.wall)) return false;
  if (w.gauge) for (const [k, r] of Object.entries(w.gauge) as [GaugeKey, { min?: number; max?: number }][]) if (!inRange(s.gauges[mapGauge(s, k)], r)) return false;
  if (w.flags && !w.flags.every((f) => s.flags.includes(f))) return false;
  if (w.notFlags && w.notFlags.some((f) => s.flags.includes(f))) return false;
  if (w.foodLow && !(s.res.food < foodUseOf(s) * 2.5 || (s.faction === "voodoo" && s.res.prey < preyUse(s.res.army) * 2.5))) return false;
  if (w.relLow && !Object.values(s.rel).some((v) => (v ?? 50) < 15)) return false;
  if (w.voodooAi !== undefined && w.voodooAi !== isVoodooAi(s)) return false;
  return true;
}
function pick(s: GameState, pool: Card[], rng: Rng): Card | null {
  const season = seasonOf(s.turn);
  const fits = (c: Card) => (!c.season || c.season.includes(season)) && condOk(s, c.when);
  let list = pool.filter((c) => fits(c) && !(s.recent[c.id] !== undefined && s.turn - s.recent[c.id]! < 8));
  if (!list.length) list = pool.filter(fits);
  if (!list.length) return null;
  const tot = list.reduce((a, c) => a + (c.weight ?? 5), 0);
  let r = rng.next() * tot;
  for (const c of list) { r -= c.weight ?? 5; if (r <= 0) { s.recent[c.id] = s.turn; return c; } }
  const c = list[list.length - 1]!; s.recent[c.id] = s.turn; return c;
}
export function overflowCard(s: GameState, k: GaugeKey): Card {
  const L = GAUGE_LABEL[k];
  return {
    id: `overflow-${k}`, faction: "common", kind: "과잉 후유증", title: `넘치는 ${L}`, art: ["crown", "bell"],
    text: `${L}이(가) 정점에 이르렀습니다. 지나친 것은 모자란 것만큼 위험합니다. 무언가를 내려놓아야 합니다.`,
    choices: [
      { label: `${L}을(를) 스스로 누른다`, art: ["shield"], check: { stat: k === "control" ? "faith" : "order" }, effects: { [k]: -15 } },
      { label: "흐름에 맡긴다", art: ["bell"], check: { stat: k }, effects: { [k]: -25, silver: 2 } },
    ],
  };
}
export function aftermathCard(): Card {
  return {
    id: "aftermath", faction: "common", kind: "후유증", title: "실패의 여파", art: ["raven", "corpse"],
    text: "지난 실패가 남긴 상처가 곪고 있습니다. 소문은 누구의 책임인지 묻습니다.",
    choices: [
      { label: "책임을 지고 수습", art: ["coin"], check: { stat: "legit", mod: -5 }, effects: { legit: -2, silver: -6 } },
      { label: "희생양을 세운다", art: ["torch"], check: { stat: "order" }, effects: { order: 4, morale: -4, wrath: 3 } },
    ],
  };
}
function dequeue(s: GameState): Card {
  const q = s.queue.shift()!;
  return q.type === "overflow" ? overflowCard(s, q.key) : aftermathCard();
}
export const OPPORTUNITY_CHANCE = 0.12;
function drawEventsInto(s: GameState, content: GameContent, rng: Rng) {
  const tails = chainTailIds(s);
  const cards: Card[] = [];
  const fac = pick(s, content.cards.filter((c) => c.faction === s.faction && !tails.has(c.id)), rng);
  if (fac) cards.push({ ...fac, kind: `${FACTIONS[s.faction].short} 사건` });
  const common = content.cards.filter((c) => c.faction === "common" && !tails.has(c.id));
  const com = pick(s, common, rng); if (com) cards.push({ ...com, kind: "공통 사건" });
  let third: Card | null = null;
  const chain = takeDueChain(s, content);
  const fixed = content.fixed[String(s.turn)];
  if (chain) third = chain;
  else if (fixed) third = { ...fixed, kind: "고정 사건" };
  else if (s.queue.length) third = dequeue(s);
  else { const sit = pick(s, content.situational, rng); if (sit) third = { ...sit, kind: "상황 반응" }; }
  if (!third) { const c2 = pick(s, common, rng); if (c2) third = { ...c2, kind: "공통 사건" }; }
  if (third) cards.push(third);
  if (s.faction !== "voodoo" && s.infection[s.faction] >= 91 && content.collapse.length) {
    cards.push({ ...content.collapse[Math.floor(rng.next() * content.collapse.length)]!, kind: "붕괴" });
  }
  if (s.queue.length) cards.push(dequeue(s));
  // 기회의 창 — 12% 확률로 한 장. 마지막 선택지는 "지나친다"라 놓쳐도 손해가 없습니다.
  const opps = content.opportunities ?? [];
  if (opps.length && rng.next() < OPPORTUNITY_CHANCE) {
    const o = pick(s, opps.filter((c) => c.faction === s.faction || c.faction === "common"), rng);
    if (o) cards.push({ ...o, kind: "기회의 창" });
  }
  s.events = cards; s.eventIdx = 0;
}

// ───────── 턴: 시작 결산 ─────────
export function startTurn(state: GameState, content: GameContent): GameState {
  const s = clone(state); const rng = createRng(s.rng);
  const F = FACTIONS[s.faction], season = seasonOf(s.turn), rep: string[] = [];
  s.turnLog = []; s.aiReport = [];
  const V = s.faction === "voodoo";
  // 1) 식량 소비
  const fu = foodUseOf(s);
  s.res.food = r1(s.res.food - fu);
  rep.push(`식량 ${fu.toFixed(1)} 소비 (남은 식량 ${Math.max(0, s.res.food).toFixed(1)}, ${fu > 0 ? `약 ${Math.max(0, Math.floor(s.res.food / fu))}계절분` : "소비 없음"})`);
  if (s.res.food < 0) {
    s.res.food = 0; addG(s, V ? "faith" : "morale", -15); s.res.pop = r1(s.res.pop * 0.97);
    rep.push(`기아 — ${V ? "신앙" : "민심"} −15, ${F.popName} −3%`);
  }
  if (V) {
    const pu = preyUse(s.res.army); s.res.prey = r1(s.res.prey - pu); rep.push(`먹이 ${pu.toFixed(1)} 소비`);
    if (s.res.prey < 0) { s.res.prey = 0; addG(s, "control", -20); rep.push("먹이 고갈 — 제어 −20"); }
  }
  // 2) 감염도 갱신 (난이도 확산 배율)
  const inf0 = s.infection[s.faction];
  const base = baseSpread(s.faction, inf0, { wall: s.wall, control: s.gauges.control }) * diffOf(s).spread;
  const sm = seasonMod(s.faction, season);
  const d = Math.round(base + sm + s.tempInf); s.tempInf = 0;
  setRegion(s, s.faction, d);
  const inf = s.infection[s.faction];
  s.infHist.push(inf); if (s.infHist.length > 6) s.infHist.shift();
  rep.push(`감염도 ${inf0} → ${inf} (기본 확산 +${base.toFixed(1)}, ${SEASON_KO[season]} ${sm >= 0 ? "+" : ""}${sm})`);
  // 3) 인구 손실 — 2턴 전 감염도(잠복 1턴 → 발병 1턴 → 구울화)
  const lagged = s.infHist[s.infHist.length - 3] ?? inf;
  const loss = r1(popLoss(s.res.pop, lagged));
  if (loss > 0) { s.res.pop = r1(s.res.pop - loss); rep.push(`${F.popName} −${loss.toFixed(1)}만 (2계절 전 감염도 ${lagged} 기준 구울화)`); }
  if (V && loss > 0) {
    s.res.prey = r1(s.res.prey + loss * 3); s.res.strat = Math.round(s.res.strat + loss * 2);
    if (s.gauges.control >= 30) { const h = r1(loss * 0.6); s.res.army = r1(s.res.army + h); rep.push(`죽음의 계약 — 구울 무리 +${h.toFixed(1)}만`); }
    else rep.push("제어 부족 — 새 구울이 무리를 벗어났습니다");
  }
  if (!V && inf <= 30 && s.res.food > 0) { const g = r1(s.res.pop * 0.01); if (g > 0) { s.res.pop = r1(s.res.pop + g); rep.push(`${F.popName} +${g.toFixed(1)}만 (회복)`); } }
  if (V && s.res.food > 0 && s.gauges.faith >= 50) { const g = r1(s.res.pop * 0.015); if (g > 0) { s.res.pop = r1(s.res.pop + g); rep.push(`개종자 +${g.toFixed(1)}만`); } }
  // 4) 상태 압력
  if (!V) {
    if (inf >= 61) { addG(s, "morale", -2); addG(s, "order", -2); rep.push("창궐 — 민심 −2, 질서 −2"); }
    else if (inf >= 31) addG(s, "morale", -1);
  } else {
    const dc = Math.round(s.res.army / 20);
    if (dc) addG(s, "control", -dc);
    const hunt = Math.round(ci(s) / 55);
    if (hunt) addG(s, "stealth", -hunt);
    rep.push(`구울 무리 유지 — 제어 −${dc} · 타국의 수색 — 은닉 −${hunt}`);
  }
  s.streak[s.faction] = s.infection[s.faction] >= 100 ? s.streak[s.faction] + 1 : 0;
  s.startReport = rep;
  drawEventsInto(s, content, rng);
  s.phase = "start"; // 시작 결산 화면을 보여 준 뒤 goEvents 로 사건 단계로
  s.rng = rng.state;
  const dft = checkDefeat(s); if (dft) { s.ended = dft; s.phase = "over"; }
  return s;
}

/** 시작 결산 화면에서 사건 단계로 넘어갑니다. */
export function openEvents(state: GameState): GameState {
  if (state.phase !== "start") return state;
  return { ...clone(state), phase: "event" };
}

/** 현재 사건 카드의 선택지를 판정합니다. */
export function resolveEvent(state: GameState, choiceIndex: number): { state: GameState; outcome: RollOutcome } {
  const card = state.events[state.eventIdx];
  if (!card) throw new Error("사건 카드가 없습니다");
  const choice = card.choices[choiceIndex];
  if (!choice) throw new Error("선택지가 없습니다");
  const r = resolveChoice(state, card, choice, createRng(state.rng));
  const s = r.state;
  s.eventIdx += 1;
  if (s.eventIdx >= s.events.length) s.phase = "action";
  finishCheck(s);
  return { state: s, outcome: r.outcome };
}

// ───────── 행동 ─────────
export function actionsFor(s: GameState, content: GameContent): ActionDef[] {
  return content.actions.filter((a) => a.factions.includes(s.faction) && condOk(s, a.when));
}
export function resolveAction(state: GameState, content: GameContent, actionId: string, choiceIndex: number): { state: GameState; outcome: RollOutcome } {
  if (state.ap <= 0) throw new Error("행동권이 없습니다");
  const act = content.actions.find((a) => a.id === actionId);
  if (!act) throw new Error(`행동 없음: ${actionId}`);
  const choice = act.card.choices[choiceIndex];
  if (!choice) throw new Error("선택지가 없습니다");
  const r = resolveChoice(state, act.card, choice, createRng(state.rng));
  r.state.ap -= 1;
  finishCheck(r.state);
  return r;
}
export function setTarget(state: GameState, target: RegionId): GameState { const s = clone(state); s.target = target; return s; }
export function setPreset(state: GameState, preset: GameState["preset"]): GameState { const s = clone(state); s.preset = preset; return s; }

function finishCheck(s: GameState) {
  const d = checkDefeat(s);
  if (d) { s.ended = d; s.phase = "over"; s.chronicle.push(chron(s, `${d.title}.`)); }
}

// ───────── AI 세력 ─────────
function runAi(s: GameState, rng: Rng): AiFacts {
  const season = seasonOf(s.turn);
  const V = s.faction === "voodoo";
  const df = diffOf(s);
  const aiDelta: Partial<Record<RegionId, number>> = {};
  const wall0 = s.wall, research0 = s.research;
  for (const f of otherFactions(s.faction)) {
    if (f === "voodoo") continue;
    const inf = s.infection[f];
    const base = baseSpread(f, inf, { wall: f === "arkandal" ? s.wall : 0 });
    const defense = (3.3 + inf * 0.07 + rng.next() * 2.5 + (V ? 1.6 : 0)) * df.aiDefense;
    const before = s.infection[f];
    setRegion(s, f, base + seasonMod(f, season) - defense);
    aiDelta[f] = s.infection[f] - before;
    if (f === "arkandal") {
      const w = (V ? 1.3 + rng.next() * 1.4 : 0) * df.aiProgress;
      if (w) s.wall = clamp(Math.round((s.wall + w) * 10) / 10, 0, 100);
    }
    if (f === "iruth") {
      const rate = (V ? 1.7 + rng.next() * 1.1 : 0.5 + rng.next() * 0.5) * (1 - s.infection.iruth / 120) * df.aiProgress;
      s.research = clamp(r1(s.research + rate), 0, 100);
    }
  }
  // 중립지(라벤 폐허 포함)
  const nb = s.infection.neutral;
  setRegion(s, "neutral", baseSpread("neutral", nb) + seasonMod("neutral", season) - (1 + rng.next() * 2.5));
  aiDelta.neutral = s.infection.neutral - nb;
  // AI 부두교의 압박
  let plague: AiFacts["plague"];
  if (!V) {
    s.voodooPower = clamp(s.voodooPower + 1, 0, 100);
    const p = Math.round((2 + (s.turn - 1) / 20 + rng.next()) * (s.voodooPower / 100) * df.pressure);
    if (p > 0) {
      const roll = rng.next();
      const other = otherFactions(s.faction).find((f) => f !== "voodoo")!;
      const tgt: RegionId = roll < 0.5 ? s.faction : roll < 0.75 ? other : "neutral";
      const before = s.infection[tgt];
      setRegion(s, tgt, p);
      plague = { region: tgt, amount: s.infection[tgt] - before };
    }
  }
  return {
    turn: s.turn, player: s.faction, aiDelta, inf: { ...s.infection },
    wallDelta: s.wall - wall0, wall: s.wall, researchDelta: s.research - research0, research: s.research, plague,
  };
}

// ───────── 종료 결산 ─────────
export function endTurn(state: GameState, content: Pick<GameContent, "decrees">): GameState {
  const s = clone(state); const rng = createRng(s.rng);
  const F = FACTIONS[s.faction], rep: string[] = [];
  const V = s.faction === "voodoo";
  const P = production(s.faction, s.res.pop, s.res.army, s.preset, s.infection[s.faction], s.wrath);
  s.res.food = r1(s.res.food + P.food);
  s.res.silver = Math.max(0, Math.round(s.res.silver + P.silver));
  s.res.strat = Math.round(s.res.strat + P.strat);
  rep.push(`생산 — 식량 +${P.food}, 실링 ${P.silver >= 0 ? "+" : ""}${P.silver}${P.upkeep ? ` (유지비 −${P.upkeep} 포함)` : ""}, ${F.stratName} +${P.strat}`);
  {
    const fuNext = foodUseOf(s), net = r1(P.food - fuNext);
    rep.push(`식량 수지 — 생산 +${P.food} − 소비 ${fuNext.toFixed(1)} = ${net >= 0 ? "+" : ""}${net}${net < 0 && s.res.food + net < 0 ? " ⚠ 다음 계절 기아 위험" : ""}`);
  }
  if (s.wrath >= 30) rep.push("여신의 진노로 생산 감소");
  if (s.res.silver <= 0) { addG(s, V ? "offering" : "finance", -6); rep.push(`금고 고갈 — ${V ? "제물" : "재정"} −6`); }
  else if (!V && s.res.silver < 10) addG(s, "finance", -1);
  else if (!V && s.res.silver >= 40) addG(s, "finance", 1);
  if (!V && s.res.food < foodUseOf(s) * 2) { addG(s, "morale", -3); rep.push("식량 불안 — 민심 −3"); }
  if (!V && s.infection[s.faction] <= 40) addG(s, "morale", 1);
  if (V && s.gauges.offering >= 25) addG(s, "faith", 4); // 제물이 흐르면 신앙이 유지된다
  if (V && s.gauges.control >= 45) addG(s, "faith", 2);
  if (V && s.res.prey >= preyUse(s.res.army) * 2) { addG(s, "control", 1); addG(s, "offering", 2); }
  // 지속 법령 결산
  rep.push(...settleDecrees(s, content, diffOf(s).wrath));
  // AI 세력 — 대륙 소식
  s.aiReport = newsLines(runAi(s, rng));
  // 동맹
  for (const [o, v] of Object.entries(s.rel) as [FactionId, number][]) {
    if (v >= 80 && !s.pacts.includes(o)) { s.pacts.push(o); rep.push(`${FACTIONS[o].name}과(와) 방역 동맹 체결`); }
  }
  if (s.pacts.length) s.research = clamp(r1(s.research + 0.25 * s.pacts.length), 0, 100);
  // CI
  const c = ci(s);
  s.ciStreak = c >= 85 ? s.ciStreak + 1 : 0;
  // 행동권 이월 (미사용분 +, 최대 3)
  s.ap = Math.min(3, 2 + s.ap);
  // 연대기
  const best = s.turnLog.find((l) => l.tone === "crit" || l.tone === "great") ?? s.turnLog.find((l) => l.tone === "after" || l.tone === "fumble") ?? s.turnLog[0];
  s.chronicle.push(chron(s, best ? `「${best.title}」 — ${best.label}, ${best.grade}.` : "조용한 계절이 지나갔다."));
  s.endReport = rep;
  s.rng = rng.state;
  const end = checkDefeat(s) ?? checkVictory(s) ?? (s.turn >= 40 ? finalScore(s) : null);
  if (end) { s.ended = end; s.phase = "over"; } else s.phase = "end";
  return s;
}
export function nextTurn(state: GameState, content: GameContent): GameState {
  const s = clone(state); s.turn += 1; s.phase = "start";
  return startTurn(s, content);
}
function chron(s: GameState, text: string) {
  return { turn: s.turn, year: yearOf(s.turn), season: SEASON_KO[seasonOf(s.turn)], text, infection: s.infection[s.faction], ci: ci(s) };
}

// ───────── 승패 (엔딩 카탈로그) ─────────
const GAUGE_DEFEAT: Record<GaugeKey, string> = {
  morale: "d-morale", order: "d-order", finance: "d-finance", legit: "d-legit",
  faith: "d-faith", control: "d-control", offering: "d-offering", stealth: "d-stealth",
};
export function checkDefeat(s: GameState): Ending | null {
  for (const k of FACTIONS[s.faction].gauges) if (s.gauges[k] <= 0) return makeEnding(GAUGE_DEFEAT[k]);
  if (s.res.pop <= s.startPop * 0.15) return makeEnding("d-empty");
  if (s.faction !== "voodoo" && s.streak[s.faction] >= 3) return makeEnding("d-capital");
  if (s.faction !== "voodoo" && s.ciStreak >= 2) return makeEnding("d-continent");
  if (s.faction === "voodoo") {
    if (s.research >= 100) return makeEnding("d-voodoo-cure");
    if (s.wall >= 100 && s.infection.arkandal < 20) return makeEnding("d-voodoo-wall");
  }
  return null;
}
export function checkVictory(s: GameState): Ending | null {
  if (s.faction === "voodoo" && s.ciStreak >= 2) return makeEnding("v-voodoo-grace");
  if (s.faction === "iruth" && s.research >= 100) return makeEnding("v-iruth-cure");
  if (s.faction === "arkandal" && s.wall >= 100 && s.infection.arkandal < 20) return makeEnding("v-arkandal-wall");
  if (s.faction === "arkandal" && s.research >= 100) return makeEnding("s-iruth-led");
  return null;
}
export function progressOf(s: GameState): number {
  return s.faction === "arkandal" ? s.wall : s.faction === "iruth" ? s.research : Math.min(100, ci(s) / 0.85);
}
export function scoreOf(s: GameState): number {
  const g = FACTIONS[s.faction].gauges.map((k) => s.gauges[k]);
  const avg = g.reduce((a, b) => a + b, 0) / g.length;
  const popPct = clamp(s.res.pop / s.startPop, 0, 1.2) * 100;
  return Math.round(popPct * 0.3 + avg * 0.3 + (100 - s.wrath) * 0.15 + progressOf(s) * 0.25);
}
export function finalScore(s: GameState): Ending {
  const sc = scoreOf(s);
  const grade = sc >= 80 ? "S" : sc >= 68 ? "A" : sc >= 55 ? "B" : sc >= 42 ? "C" : "D";
  return makeEnding(`s-${grade}`, { score: sc, grade });
}
