// 대륙 소식 — AI 세력의 한 계절 행동을 3줄 이내로 요약합니다. 난수를 쓰지 않아 같은 상태면 같은 문장입니다.
import { REGION_NAME } from "./factions";
import type { FactionId, RegionId } from "./types";

export const NEWS_MAX_LINES = 3;

export interface AiFacts {
  turn: number;
  player: FactionId;
  /** AI 세력 자체 방역/확산에 따른 감염도 변화(부두교 역병 제외) */
  aiDelta: Partial<Record<RegionId, number>>;
  /** 결산 후 감염도 */
  inf: Record<RegionId, number>;
  wallDelta: number;
  wall: number;
  researchDelta: number;
  research: number;
  /** AI 부두교가 역병을 퍼뜨린 곳 */
  plague?: { region: RegionId; amount: number };
}

const PLAGUE_HOW = ["순례자로 위장한 부두교 신도들이 지나간 뒤", "밤마다 풀려난 구울 무리 탓에", "오염된 우물과 시장을 통해"];
const DEFENSE: Record<"arkandal" | "iruth", string[]> = {
  arkandal: ["국경 마을을 불태우는 봉쇄로", "성기사단의 소탕전으로", "방벽 너머 초소를 늘려"],
  iruth: ["빙철 격리소를 넓혀", "항구 검역을 강화해", "스틱스 수호체를 깨워"],
};
/** 받침에 맞는 조사: josa("아르칸달", "이", "가") → "아르칸달이" */
export function josa(word: string, withFinal: string, withoutFinal: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  const hasFinal = code >= 0 && code <= 11171 && code % 28 !== 0;
  return word + (hasFinal ? withFinal : withoutFinal);
}
const pickOf = <T>(arr: T[], turn: number, salt = 0): T => arr[(turn + salt) % arr.length]!;
const sign = (n: number) => (n >= 0 ? `+${n}` : `−${-n}`);

function factionLine(f: "arkandal" | "iruth", x: AiFacts): string {
  const name = REGION_NAME[f];
  const d = Math.round(x.aiDelta[f] ?? 0);
  const inf = x.inf[f];
  let line: string;
  if (d <= -2) line = `${josa(name, "이", "가")} ${pickOf(DEFENSE[f], x.turn, f === "iruth" ? 1 : 0)} 감염도를 ${-d} 낮췄습니다 (${inf})`;
  else if (d >= 2) line = `${name}의 방역이 뚫려 감염도가 ${d} 올랐습니다 (${inf})`;
  else line = `${josa(name, "은", "는")} 감염도 ${inf}에서 버티고 있습니다`;
  if (f === "arkandal" && x.wallDelta > 0) line += ` · 방벽 ${Math.floor(x.wall)}`;
  if (f === "iruth" && x.researchDelta > 0) line += ` · 치료 연구 ${Math.floor(x.research)}`;
  return line;
}

/** AI 행동 요약 (최대 3줄): 부두교 역병 → 다른 세력 → 중립지 순으로 중요한 것부터 */
export function newsLines(x: AiFacts): string[] {
  const out: string[] = [];
  if (x.plague && x.plague.amount > 0) {
    const where = x.plague.region === x.player ? "우리 땅" : REGION_NAME[x.plague.region];
    out.push(`${pickOf(PLAGUE_HOW, x.turn)} ${where}에 역병이 번졌습니다 (감염도 +${x.plague.amount})`);
  }
  for (const f of ["arkandal", "iruth"] as const) if (f !== x.player) out.push(factionLine(f, x));
  const nd = Math.round(x.aiDelta.neutral ?? 0);
  out.push(`라벤 폐허(중립지) 감염도 ${x.inf.neutral} (${sign(nd)})`);
  return out.slice(0, NEWS_MAX_LINES);
}
