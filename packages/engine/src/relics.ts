// 유물 — 사건 단계에서 선택지를 대신해 쓰는 일회용 아이템. 쓰면 현재 사건 카드를 이 유물의 선택지로 판정해 넘깁니다.
import { createRng } from "./rng";
import { SEASON_KO, seasonOf, yearOf } from "./factions";
import { checkDefeat, resolveChoice } from "./game";
import type { GameContent, GameState, Relic, RollOutcome } from "./types";

export const MAX_RELICS = 3;
export function relicById(content: Pick<GameContent, "relics">, id: string): Relic | undefined {
  return (content.relics ?? []).find((r) => r.id === id);
}
export function ownedRelics(s: GameState, content: Pick<GameContent, "relics">): Relic[] {
  return s.relics.map((id) => relicById(content, id)).filter((r): r is Relic => !!r);
}
/** 지금 쓸 수 없는 이유. 가능하면 null */
export function relicBlocker(s: GameState, id: string): string | null {
  if (s.phase !== "event" || !s.events[s.eventIdx]) return "사건 단계에서만 쓸 수 있습니다";
  if (!s.relics.includes(id)) return "가지고 있지 않은 유물";
  return null;
}
/** 유물을 써서 현재 사건 카드를 넘깁니다. 입력 state 는 바꾸지 않습니다. */
export function useRelic(state: GameState, content: Pick<GameContent, "relics">, id: string): { state: GameState; outcome: RollOutcome } {
  const relic = relicById(content, id);
  if (!relic) throw new Error(`유물 없음: ${id}`);
  const why = relicBlocker(state, id);
  if (why) throw new Error(why);
  const card = state.events[state.eventIdx]!;
  const r = resolveChoice(state, card, relic.choice, createRng(state.rng));
  const s = r.state;
  s.relics = s.relics.filter((x) => x !== id);
  s.chronicle.push({ turn: s.turn, year: yearOf(s.turn), season: SEASON_KO[seasonOf(s.turn)], text: `유물 「${relic.name}」을(를) 써서 「${card.title}」을(를) 처리했다.`, infection: s.infection[s.faction], ci: 0 });
  s.eventIdx += 1;
  if (s.eventIdx >= s.events.length) s.phase = "action";
  const d = checkDefeat(s);
  if (d) { s.ended = d; s.phase = "over"; }
  return { state: s, outcome: r.outcome };
}
