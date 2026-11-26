// 전쟁 — 준비(행동권) → 선전포고 → 전시(전쟁 카드) → 수도 점령·군주 포박·항복으로 결판.
// 도시 소유가 바뀌면 생산(도시 1개당 ±4%)과 지도 색이 달라집니다. 모든 함수는 입력 state 를 바꾸지 않거나(공개 함수),
// 이미 복제한 state 를 받아 고칩니다(내부 함수, 이름 끝이 Into/In).
import { FACTIONS, SEASON_KO, otherFactions, seasonOf, yearOf } from "./factions";
import { diffOf } from "./difficulty";
import { josa } from "./news";
import { createRng, type Rng } from "./rng";
import { finishCheck, resolveChoice } from "./game";
import type { Boost, Card, Choice, FactionId, GameContent, GameState, ResourceKey, RollOutcome, WarDelta, WarHow, WarResult } from "./types";

const clone = <T>(v: T): T => (typeof structuredClone === "function" ? structuredClone(v) : JSON.parse(JSON.stringify(v)));
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

// ───────── 도시 ─────────
export interface CityDef { id: string; name: string; owner: FactionId; x: number; y: number; capital?: boolean; port?: boolean }
/** 지도 위 13개 도시와 처음 주인. 라벤 폐허(중립지)의 도시는 구울 부두교 몫, 부두교 수도는 에테르 라티스. */
export const CITIES: CityDef[] = [
  { id: "velorink", name: "벨로링크", owner: "iruth", x: 250, y: 150, capital: true, port: true },
  { id: "frost", name: "프로스트", owner: "iruth", x: 470, y: 150 },
  { id: "glacier", name: "글레이시어", owner: "iruth", x: 690, y: 140 },
  { id: "hibern", name: "하이번", owner: "iruth", x: 330, y: 232 },
  { id: "aurora", name: "오로라", owner: "voodoo", x: 210, y: 320 },
  { id: "ether", name: "에테르 라티스", owner: "voodoo", x: 250, y: 420, capital: true },
  { id: "abyss", name: "어비스", owner: "voodoo", x: 330, y: 560 },
  { id: "altar", name: "여신의 제단", owner: "voodoo", x: 470, y: 470 },
  { id: "ironfang", name: "아이언 팽", owner: "arkandal", x: 700, y: 430, capital: true },
  { id: "howling", name: "하울링", owner: "arkandal", x: 790, y: 310 },
  { id: "berserk", name: "베르세르크", owner: "arkandal", x: 850, y: 520 },
  { id: "bastion", name: "바스티온", owner: "arkandal", x: 600, y: 560 },
  { id: "westport", name: "서부 거점항", owner: "arkandal", x: 650, y: 650, port: true },
];
export const cityById = (id: string) => CITIES.find((c) => c.id === id);
export const CAPITAL: Record<FactionId, string> = { arkandal: "ironfang", iruth: "velorink", voodoo: "ether" };
export const RULER: Record<FactionId, string> = { arkandal: "영웅왕 전운", iruth: "대공", voodoo: "대사제" };
export function initialCities(): Record<string, FactionId> { return Object.fromEntries(CITIES.map((c) => [c.id, c.owner])); }
export function citiesOf(s: Pick<GameState, "cities">, f: FactionId): string[] { return CITIES.filter((c) => s.cities[c.id] === f).map((c) => c.id); }
/** 처음보다 도시가 많으면 생산 +4%/개, 적으면 −4%/개 */
export const CITY_PROD_STEP = 0.04;
export function cityProdMod(s: Pick<GameState, "cities" | "faction">): number {
  const start = CITIES.filter((c) => c.owner === s.faction).length;
  return clamp(1 + CITY_PROD_STEP * (citiesOf(s, s.faction).length - start), 0.4, 2);
}

// ───────── 준비 · 선포 ─────────
export const WAR_PREP_ID = "war-prep";
const truceOk = (s: GameState, f: FactionId) => (s.truce[f] ?? 0) <= s.turn;
/** 전쟁 준비가 가능한 상대 (진행 중인 전쟁이 없고 휴전이 끝난 세력) */
export function warTargets(s: GameState): FactionId[] {
  if (s.war) return [];
  return otherFactions(s.faction).filter((f) => truceOk(s, f));
}
export function canPrepWar(s: GameState): boolean { return s.phase === "action" && s.ap > 0 && !s.war && !s.warReady && warTargets(s).length > 0; }

/** 전쟁 준비 카드 — 선택지 = 상대 세력 (판정 질서, 부두교는 제어로 바뀜) */
export function warPrepCard(s: GameState): Card {
  const choices: Choice[] = warTargets(s).map((f) => {
    const name = FACTIONS[f].short;
    return {
      label: `${josa(name, "과", "와")}의 전쟁을 준비한다`, art: ["sword", "banner"], target: f, check: { stat: "order" },
      effects: s.faction === "voodoo" ? { strat: -4 } : { silver: -4, strat: -4 },
      onFail: { relTo: -10 },
      outcomes: {
        great: `군영이 단숨에 채워져, ${josa(name, "을", "를")} 칠 채비가 끝났습니다.`,
        success: `${name} 국경으로 보급과 병력이 차곡차곡 모였습니다.`,
        weak: `준비는 진척됐으나 ${name}의 첩자들이 낌새를 챘습니다.`,
        partial: `병력은 모였지만 보급이 따라오지 못해 한 번 더 다져야 합니다.`,
        fail: `준비가 새어 나가 ${josa(name, "과", "와")}의 사이가 얼어붙었습니다.`,
      },
    };
  });
  return {
    id: WAR_PREP_ID, faction: "common", kind: "전쟁 준비", art: ["sword", "banner"],
    title: "전쟁 준비", text: "같은 상대로 두 번 연달아 준비하거나 한 번에 크게 성공(판정값 80 이상)하면 선전포고할 수 있습니다. 다른 행동을 하면 준비가 흐트러집니다.",
    choices,
  };
}

/** 전쟁 준비 판정 (행동권 1) */
export function resolveWarPrep(state: GameState, choiceIndex: number, boost?: Boost): { state: GameState; outcome: RollOutcome } {
  if (!canPrepWar(state)) throw new Error("지금은 전쟁을 준비할 수 없습니다");
  const card = warPrepCard(state);
  const choice = card.choices[choiceIndex];
  if (!choice || !choice.target) throw new Error("선택지가 없습니다");
  const r = resolveChoice(state, card, choice, createRng(state.rng), boost);
  const s = r.state, f = choice.target, fin = r.outcome.final;
  s.ap -= 1;
  if (fin >= 40) {
    const stacks = s.warPrep && s.warPrep.target === f ? s.warPrep.stacks + 1 : 1;
    if (stacks >= 2 || fin >= 80) { s.warReady = f; s.warPrep = null; }
    else s.warPrep = { target: f, stacks };
  } else s.warPrep = null;
  finishCheck(s);
  return { state: s, outcome: r.outcome };
}
/** 다른 행동을 하면 연속 준비가 끊깁니다 (선포 가능 상태는 유지) */
export function breakWarPrepIn(s: GameState) { s.warPrep = null; }

function startWarIn(s: GameState, enemy: FactionId, byUs: boolean) {
  s.war = { enemy, front: 50, hunt: 0, weary: 0, enemyWeary: 0, since: s.turn, byUs };
  s.warReady = null; s.warPrep = null;
  if (s.rel[enemy] !== undefined) s.rel[enemy] = 0;
  s.pacts = s.pacts.filter((p) => p !== enemy);
}
/** 선전포고 (행동권 없이). 다음 계절부터 사건 대신 전쟁 카드가 나옵니다. */
export function declareWar(state: GameState): GameState {
  if (!state.warReady || state.war) throw new Error("선전포고할 수 없습니다");
  const s = clone(state);
  startWarIn(s, state.warReady, true);
  return s;
}

/** 타 세력의 선전포고 확률: 우리 질서·민심(부두교는 제어·신앙) 중 낮은 쪽 ≤ 50 이고 관계 ≤ 30 일 때 */
export function aiWarChance(s: GameState, f: FactionId): number {
  if (s.war || !truceOk(s, f) || s.turn <= 2) return 0;
  const V = s.faction === "voodoo";
  const low = Math.min(s.gauges[V ? "control" : "order"], s.gauges[V ? "faith" : "morale"]);
  if (low > 50) return 0;
  // 부두교에겐 외교 관계가 없어 은닉을 관계 대신 씁니다(드러날수록 표적). AI 부두교는 관계가 없어 선포하지 않습니다.
  const rel = V ? s.gauges.stealth : s.rel[f];
  if (rel === undefined || rel > 30) return 0;
  return clamp((0.1 + (30 - rel) / 100) * (diffOf(s).pressure / 1.75), 0, 0.6);
}
/** 계절 시작에 타 세력이 선포하는지 (가장 확률이 높은 한 세력만 굴림) */
export function aiDeclareIn(s: GameState, rng: Rng): FactionId | null {
  let best: FactionId | null = null, p = 0;
  for (const f of otherFactions(s.faction)) { const q = aiWarChance(s, f); if (q > p) { p = q; best = f; } }
  if (!best || rng.next() >= p) return null;
  startWarIn(s, best, false);
  return best;
}

// ───────── 전시 ─────────
/** 적 전력 추정(만 명) — 시작 병력이 시간과 난이도에 따라 늘어남 */
export function enemyArmy(s: GameState): number {
  if (!s.war) return 0;
  return Math.round(FACTIONS[s.war.enemy].res.army * (1 + s.turn / 60) * Math.sqrt(diffOf(s).pressure) * 10) / 10;
}
/** 전쟁 카드 판정 보정: 병력 차이 × 1.5 (±8) */
export function warModifier(s: GameState, choice: Choice): number {
  if (!s.war || !choice.war) return 0;
  return clamp(Math.round((s.res.army - enemyArmy(s)) * 1.5), -8, 8);
}

/** 전쟁 카드 선택의 전황 변화를 반영합니다 (resolveChoice 가 부름) */
export function applyWarIn(s: GameState, choice: Choice, final: number, mult: number) {
  const w = s.war; if (!w || (!choice.war && !choice.warFail && !choice.warPeace)) return;
  if (final >= 40) {
    if (choice.warPeace) { endWarIn(s, false, "peace", true); return; }
    const d = choice.war ?? {};
    w.front += (d.front ?? 0) * (d.front && d.front > 0 ? mult : 1);
    w.hunt += (d.hunt ?? 0) * (d.hunt && d.hunt > 0 ? mult : 1);
    w.enemyWeary += (d.enemyWeary ?? 0) * (d.enemyWeary && d.enemyWeary > 0 ? mult : 1);
    w.weary += d.weary ?? 0;
  } else {
    const d: WarDelta = choice.warFail ?? { front: -6, weary: 6 };
    w.front += d.front ?? 0; w.hunt += d.hunt ?? 0; w.weary += d.weary ?? 0; w.enemyWeary += d.enemyWeary ?? 0;
  }
  w.front = Math.round(clamp(w.front, 0, 100)); w.hunt = Math.round(clamp(w.hunt, -100, 100));
  w.weary = Math.round(clamp(w.weary, 0, 100)); w.enemyWeary = Math.round(clamp(w.enemyWeary, 0, 100));
  checkWarEndIn(s);
}
/** 결판 조건 검사 */
export function checkWarEndIn(s: GameState) {
  const w = s.war; if (!w) return;
  if (w.front >= 100) endWarIn(s, true, "capital", false);
  else if (w.hunt >= 100) endWarIn(s, true, "ruler", false);
  else if (w.enemyWeary >= 100) endWarIn(s, true, "surrender", false);
  else if (w.front <= 0) endWarIn(s, false, "capital", false);
  else if (w.hunt <= -100) endWarIn(s, false, "ruler", false);
  else if (w.weary >= 100) endWarIn(s, false, "surrender", false);
}
/** 계절이 끝날 때 양쪽 피로가 쌓입니다 (전쟁이 끝없이 늘어지지 않게) */
export function warSeasonTickIn(s: GameState): string | null {
  const w = s.war; if (!w) return null;
  w.weary = clamp(w.weary + 6, 0, 100);
  w.enemyWeary = clamp(w.enemyWeary + 5, 0, 100);
  checkWarEndIn(s);
  return s.war ? `전쟁 ${s.turn - s.war.since + 1}계절째 — 우리 피로 ${s.war.weary} · 적 피로 ${s.war.enemyWeary}` : null;
}

/** 언제든 누를 수 있는 항복 (스스로 항복하면 배상이 1/3로 줄어듦) */
export function surrender(state: GameState): GameState {
  if (!state.war) throw new Error("전쟁 중이 아닙니다");
  const s = clone(state);
  endWarIn(s, false, "surrender", true);
  finishCheck(s);
  return s;
}

/** 도시 양도: 수도는 수도 점령일 때만. 나머지는 받는 쪽 수도에 가까운 순으로 n 개 */
function transferCities(s: GameState, from: FactionId, to: FactionId, share: number, withCapital: boolean): string[] {
  const cap = cityById(CAPITAL[to])!;
  const own = CITIES.filter((c) => s.cities[c.id] === from && !c.capital)
    .sort((a, b) => Math.hypot(a.x - cap.x, a.y - cap.y) - Math.hypot(b.x - cap.x, b.y - cap.y));
  const n = Math.ceil(own.length * share);
  const moved = own.slice(0, n).map((c) => c.id);
  if (withCapital && s.cities[CAPITAL[from]] === from) moved.push(CAPITAL[from]);
  for (const id of moved) s.cities[id] = to;
  return moved;
}
const RES_TRADE: ResourceKey[] = ["silver", "food", "strat", "stone", "prey"];

/** 전쟁을 끝내고 배상·도시를 정리합니다 */
export function endWarIn(s: GameState, win: boolean, how: WarHow, voluntary: boolean) {
  const w = s.war; if (!w) return;
  const enemy = w.enemy, me = s.faction;
  const res: WarResult["res"] = {};
  let cities: string[] = [];
  if (how === "peace") {
    // 휴전: 아무것도 오가지 않음
  } else if (win) {
    for (const k of RES_TRADE) {
      if (k === "stone" && me === "voodoo") continue;
      if (k === "prey" && me !== "voodoo") continue;
      const gain = Math.round(Math.max(20, s.res[k] * 0.5) * (k === "stone" || k === "prey" ? 0.5 : 1));
      s.res[k] = Math.round(s.res[k] + gain); res[k] = gain;
    }
    cities = transferCities(s, enemy, me, 0.5, how === "capital");
    if (s.rel[enemy] !== undefined) s.rel[enemy] = 0;
    for (const f of otherFactions(me)) if (f !== enemy && s.rel[f] !== undefined) s.rel[f] = clamp(s.rel[f]! - 10, 0, 100);
    s.gauges[me === "voodoo" ? "faith" : "legit"] = clamp(s.gauges[me === "voodoo" ? "faith" : "legit"] + 10, 0, 100);
    s.wrath = clamp(s.wrath + 5, 0, 100);
  } else {
    const pay = voluntary ? 1 / 3 : 0.5;
    for (const k of RES_TRADE) {
      const v = Math.round(s.res[k] * pay);
      if (v) { s.res[k] = Math.round(s.res[k] - v); res[k] = -v; }
    }
    cities = transferCities(s, me, enemy, voluntary ? 1 / 3 : 0.5, how === "capital");
    if (s.rel[enemy] !== undefined) s.rel[enemy] = 20;
    const [g1, g2] = me === "voodoo" ? (["faith", "control"] as const) : (["morale", "order"] as const);
    s.gauges[g1] = clamp(s.gauges[g1] - (voluntary ? 8 : 15), 0, 100);
    s.gauges[g2] = clamp(s.gauges[g2] - (voluntary ? 5 : 10), 0, 100);
  }
  s.truce[enemy] = s.turn + 4;
  s.lastWar = { enemy, win, how, voluntary, turn: s.turn, cities, res };
  s.war = null;
  const name = FACTIONS[enemy].short;
  const text = how === "peace" ? `${josa(name, "과", "와")} 휴전했다.`
    : win ? `${josa(name, "과", "와")}의 전쟁에서 이겼다 — ${WAR_HOW_LABEL[how]}, 도시 ${cities.length}곳을 얻었다.`
      : `${josa(name, "과", "와")}의 전쟁에서 졌다 — ${WAR_HOW_LABEL[how]}, 도시 ${cities.length}곳을 내주었다.`;
  s.chronicle.push({ turn: s.turn, year: yearOf(s.turn), season: SEASON_KO[seasonOf(s.turn)], text, infection: s.infection[me], ci: 0 });
}
export const WAR_HOW_LABEL: Record<WarHow, string> = { capital: "수도 점령", ruler: "군주 포박", surrender: "항복", peace: "휴전" };

/** 전시 사건: 전쟁 카드 2장(전황 조건에 맞는 것) + 역병 사건 1장 */
export function drawWarEventsIn(s: GameState, content: GameContent, rng: Rng, plague: Card | null): boolean {
  const w = s.war; const pool = content.warCards ?? [];
  if (!w || !pool.length) return false;
  const inR = (v: number, r?: { min?: number; max?: number }) => !r || ((r.min === undefined || v >= r.min) && (r.max === undefined || v <= r.max));
  const fits = (c: Card) => !c.warWhen || (inR(w.front, c.warWhen.front) && inR(w.hunt, c.warWhen.hunt) && inR(w.enemyWeary, c.warWhen.enemyWeary));
  const picked: Card[] = [];
  for (let k = 0; k < 2; k++) {
    let list = pool.filter((c) => fits(c) && !picked.some((p) => p.id === c.id) && !(s.recent[c.id] !== undefined && s.turn - s.recent[c.id]! < 3));
    if (!list.length) list = pool.filter((c) => fits(c) && !picked.some((p) => p.id === c.id));
    if (!list.length) break;
    const tot = list.reduce((a, c) => a + (c.weight ?? 5), 0);
    let r = rng.next() * tot, chosen = list[list.length - 1]!;
    for (const c of list) { r -= c.weight ?? 5; if (r <= 0) { chosen = c; break; } }
    s.recent[chosen.id] = s.turn;
    picked.push({ ...chosen, kind: `전쟁 · ${FACTIONS[w.enemy].short}` });
  }
  const out = [...picked];
  if (plague) out.splice(1, 0, { ...plague, kind: "역병 사건" });
  s.events = out; s.eventIdx = 0;
  return true;
}

/** 전쟁 화면 문구 */
export function warSummary(s: GameState): string {
  const w = s.war; if (!w) return "";
  return `${josa(FACTIONS[w.enemy].short, "과", "와")} 전쟁 중 — 전선 ${w.front} · 군주 추적 ${w.hunt} · 피로 ${w.weary}/${w.enemyWeary}`;
}
