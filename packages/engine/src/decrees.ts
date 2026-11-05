// 지속 법령 — Frostpunk 의 법령처럼 매 계절 이득과 도덕적 대가를 함께 가져옵니다.
import { applyEffects, condOk } from "./game";
import { clamp } from "./dice";
import { SEASON_KO, seasonOf, yearOf } from "./factions";
import { ci } from "./game";
import type { Decree, GameContent, GameState, UpkeepKey } from "./types";

export const MAX_DECREES = 3;
const UPKEEP_LABEL: Record<UpkeepKey, string> = { silver: "실링", strat: "전략 자원", food: "식량", prey: "먹이" };
const clone = <T>(v: T): T => (typeof structuredClone === "function" ? structuredClone(v) : JSON.parse(JSON.stringify(v)));
const flagOf = (id: string) => `decree:${id}`;

export function decreeById(content: Pick<GameContent, "decrees">, id: string): Decree | undefined {
  return content.decrees.find((d) => d.id === id);
}
export function isDecreeActive(s: GameState, id: string): boolean {
  return s.decrees.some((d) => d.id === id);
}
/** 이 세력이 보는 법령 목록 (공포 중인 것 포함) */
export function decreesFor(s: GameState, content: Pick<GameContent, "decrees">): Decree[] {
  return content.decrees.filter((d) => d.faction === s.faction);
}
/** 지금 공포할 수 없는 이유. 가능하면 null */
export function enactBlocker(s: GameState, d: Decree): string | null {
  if (d.faction !== s.faction) return "다른 세력의 법령";
  if (s.phase !== "action") return "행동 단계에서만 공포할 수 있습니다";
  if (isDecreeActive(s, d.id)) return "이미 공포 중";
  if (s.ap <= 0) return "행동권이 없습니다";
  if (s.decrees.length >= MAX_DECREES) return `법령은 동시에 ${MAX_DECREES}개까지`;
  if (!condOk(s, d.requires)) return "조건 미충족";
  for (const [k, v] of Object.entries(d.upkeep) as [UpkeepKey, number][]) if (s.res[k] < v) return `${UPKEEP_LABEL[k]} 부족`;
  return null;
}

/** 행동권 1개로 법령을 공포합니다. 입력 state 는 바꾸지 않습니다. */
export function enactDecree(state: GameState, content: Pick<GameContent, "decrees">, id: string): GameState {
  const d = decreeById(content, id);
  if (!d) throw new Error(`법령 없음: ${id}`);
  const why = enactBlocker(state, d);
  if (why) throw new Error(why);
  const s = clone(state);
  s.ap -= 1;
  s.decrees.push({ id, since: s.turn });
  if (!s.decreeHistory.includes(id)) s.decreeHistory.push(id);
  if (!s.flags.includes(flagOf(id))) s.flags.push(flagOf(id));
  s.chronicle.push(chronLine(s, `「${d.name}」을(를) 공포했다.`));
  return s;
}

/** 행동권 1개로 법령을 철회합니다. */
export function repealDecree(state: GameState, content: Pick<GameContent, "decrees">, id: string): GameState {
  const d = decreeById(content, id);
  if (!d) throw new Error(`법령 없음: ${id}`);
  if (!isDecreeActive(state, id)) throw new Error("공포 중인 법령이 아닙니다");
  if (state.phase !== "action") throw new Error("행동 단계에서만 철회할 수 있습니다");
  if (state.ap <= 0) throw new Error("행동권이 없습니다");
  const s = clone(state);
  s.ap -= 1;
  drop(s, id);
  s.chronicle.push(chronLine(s, `「${d.name}」을(를) 철회했다.`));
  return s;
}

function drop(s: GameState, id: string) {
  s.decrees = s.decrees.filter((x) => x.id !== id);
  s.flags = s.flags.filter((f) => f !== flagOf(id));
}
function chronLine(s: GameState, text: string) {
  return { turn: s.turn, year: yearOf(s.turn), season: SEASON_KO[seasonOf(s.turn)], text, infection: s.infection[s.faction], ci: ci(s) };
}

/**
 * 종료 결산의 법령 처리 (draft 를 직접 바꿉니다): 유지비 차감 → 매 턴 효과·진노 → 해제 조건.
 * 유지비를 낼 수 없으면 그 계절 효과 없이 폐지됩니다. 보고 문장을 돌려줍니다.
 */
export function settleDecrees(s: GameState, content: Pick<GameContent, "decrees">, wrathMult = 1): string[] {
  const rep: string[] = [];
  for (const active of [...s.decrees]) {
    const d = decreeById(content, active.id);
    if (!d) { drop(s, active.id); continue; }
    const short = (Object.entries(d.upkeep) as [UpkeepKey, number][]).find(([k, v]) => s.res[k] < v);
    if (short) { drop(s, d.id); rep.push(`「${d.name}」 폐지 — ${UPKEEP_LABEL[short[0]]} 부족으로 유지비를 낼 수 없습니다`); continue; }
    const costs: string[] = [];
    for (const [k, v] of Object.entries(d.upkeep) as [UpkeepKey, number][]) {
      if (!v) continue;
      s.res[k] = Math.max(0, Math.round((s.res[k] - v) * 10) / 10);
      costs.push(`${UPKEEP_LABEL[k]} −${v}`);
    }
    applyEffects(s, d.effects, null);
    if (d.wrath) s.wrath = clamp(s.wrath + Math.round(d.wrath * wrathMult), 0, 100);
    rep.push(`「${d.name}」 시행${costs.length ? ` (유지비 ${costs.join(", ")})` : ""}${d.wrath ? ` · 진노 +${Math.round(d.wrath * wrathMult)}` : ""}`);
    if (d.repealWhen && condOk(s, d.repealWhen)) { drop(s, d.id); rep.push(`「${d.name}」 폐지 — ${d.repealText ?? "해제 조건 충족"}`); }
  }
  return rep;
}
