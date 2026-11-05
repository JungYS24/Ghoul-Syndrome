// 시드 공유 링크(?seed=&d=&f=)와 엔딩 달성 기록 — 저장소에 의존하지 않는 순수 함수만 둡니다.
import { isDifficulty, type Difficulty, type Ending, type FactionId, type GameState } from "@guul/engine";

export interface ShareParams { seed?: number; difficulty?: Difficulty; faction?: FactionId }
const FACTION_SET = new Set(["arkandal", "iruth", "voodoo"]);

export function parseShare(search: string): ShareParams {
  const q = new URLSearchParams(search);
  const out: ShareParams = {};
  const raw = q.get("seed");
  if (raw && /^\d{1,10}$/.test(raw)) { const n = Number(raw); if (n <= 0xffffffff) out.seed = n >>> 0; }
  const d = q.get("d");
  if (isDifficulty(d)) out.difficulty = d;
  const f = q.get("f");
  if (f && FACTION_SET.has(f)) out.faction = f as FactionId;
  return out;
}
/** 같은 게임을 다시 볼 수 있는 링크. 보통 난이도는 생략합니다. */
export function shareUrl(base: string, s: Pick<GameState, "seed" | "difficulty" | "faction">): string {
  const q = new URLSearchParams({ seed: String(s.seed) });
  if (s.difficulty !== "normal") q.set("d", s.difficulty);
  q.set("f", s.faction);
  return `${base.split("?")[0]!.split("#")[0]}?${q.toString()}`;
}

export interface EndingRecord { count: number; first: string; last: string; factions: FactionId[]; bestDifficulty: Difficulty }
export type EndingBook = Record<string, EndingRecord>;
const RANK: Record<Difficulty, number> = { normal: 0, hard: 1, hell: 2 };

/** 달성 기록에 엔딩 하나를 더한 새 기록 (입력 불변) */
export function addEnding(book: EndingBook, e: Pick<Ending, "id">, s: Pick<GameState, "faction" | "difficulty">, now: string): EndingBook {
  const prev = book[e.id];
  const rec: EndingRecord = prev
    ? {
      count: prev.count + 1, first: prev.first, last: now,
      factions: prev.factions.includes(s.faction) ? prev.factions : [...prev.factions, s.faction],
      bestDifficulty: RANK[s.difficulty] > RANK[prev.bestDifficulty] ? s.difficulty : prev.bestDifficulty,
    }
    : { count: 1, first: now, last: now, factions: [s.faction], bestDifficulty: s.difficulty };
  return { ...book, [e.id]: rec };
}
