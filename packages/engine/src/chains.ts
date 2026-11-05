// 연쇄 사건 — 선택이 N턴 뒤 후속 카드를 예약하고, 후속 카드는 이전 판정 등급에 따라 갈래가 바뀝니다.
import type { Card, Choice, GameContent, GameState, PendingChain, Tone } from "./types";

export const chainKey = (from: string, to: string) => `${from}>${to}`;

/** content 전체에서 id 로 카드를 찾습니다(행동 카드 제외). */
export function findCard(content: Pick<GameContent, "cards" | "situational" | "collapse" | "fixed">, id: string): Card | undefined {
  return content.cards.find((c) => c.id === id)
    ?? content.situational.find((c) => c.id === id)
    ?? content.collapse.find((c) => c.id === id)
    ?? Object.values(content.fixed).find((c) => c.id === id);
}

/**
 * 선택지에 followUp 이 있으면 연쇄를 예약합니다(draft 를 직접 바꿈).
 * 같은 연쇄(머리>꼬리)는 한 판에 한 번만 — 이미 예약했거나 나온 적 있으면 무시.
 */
export function scheduleChain(s: GameState, card: Card, choice: Choice, tone: Tone): PendingChain | null {
  const fu = choice.followUp;
  if (!fu) return null;
  const key = chainKey(card.id, fu.cardId);
  if (s.chainsDone.includes(key)) return null;
  const p: PendingChain = { cardId: fu.cardId, due: s.turn + fu.afterTurns, from: card.id, fromTitle: card.title, label: choice.label, tone };
  s.chains.push(p);
  s.chainsDone.push(key);
  return p;
}

/** 이전 등급에 맞는 갈래를 입힌 카드 (갈래 정보는 지움) */
export function branchCard(card: Card, tone: Tone): Card {
  const b = card.branches?.find((x) => x.prevTones.includes(tone));
  const { branches: _drop, ...base } = card;
  if (!b) return base;
  return { ...base, title: b.title ?? base.title, text: b.text ?? base.text, choices: b.choices ?? base.choices };
}

/** 예약됐거나 이미 나온 연쇄의 꼬리 카드 id — 무작위 뽑기에서 뺍니다. */
export function chainTailIds(s: GameState): Set<string> {
  return new Set(s.chainsDone.map((k) => k.slice(k.indexOf(">") + 1)));
}

/**
 * 이번 턴에 나올 연쇄 카드 하나를 꺼냅니다(draft 를 직접 바꿈). 여러 개가 밀리면 다음 턴으로 넘깁니다.
 * 꼬리 카드의 계절·조건은 무시합니다 — 이전 선택이 부른 사건이기 때문입니다.
 */
export function takeDueChain(s: GameState, content: Pick<GameContent, "cards" | "situational" | "collapse" | "fixed">): Card | null {
  // 찾을 수 없는 카드는 버림
  s.chains = s.chains.filter((p) => findCard(content, p.cardId));
  const idx = s.chains.findIndex((p) => p.due <= s.turn);
  if (idx < 0) return null;
  const p = s.chains.splice(idx, 1)[0]!;
  const card = findCard(content, p.cardId)!;
  s.recent[card.id] = s.turn;
  return { ...branchCard(card, p.tone), kind: `연쇄 · 「${p.fromTitle}」의 여파` };
}
