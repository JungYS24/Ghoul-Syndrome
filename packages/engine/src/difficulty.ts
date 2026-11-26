// 난이도 — 기본 확산량, 진노 증가량, AI 압박을 배율로 조정합니다.
// 두 단계: 기본(예전 지옥보다 조금 더 어려움)과 어려움(엔딩 5개를 모으면 열림, 정말 어렵게).
// 배율 1 은 예전 "보통"(자동 플레이 승률 30~45%) 기준입니다.
export type Difficulty = "base" | "brutal";
export interface DifficultyDef {
  name: string;
  desc: string;
  /** 아르칸달·아이루스: 자기 영토 기본 확산 × */
  spread: number;
  /** 늘어나는 진노 × */
  wrath: number;
  /** AI 부두교 역병 압박 × */
  pressure: number;
  /** 부두교 플레이 시: AI 왕국 방역 × (부두교는 방역에 아주 민감해 따로 둡니다) */
  aiDefense: number;
  /** 부두교 플레이 시: AI 왕국 방벽·치료 연구 속도 × */
  aiProgress: number;
}
export const DIFFICULTIES: Record<Difficulty, DifficultyDef> = {
  base: { name: "기본", desc: "확산 ×1.55 · 진노 ×1.6 · 부두교 압박 ×1.75", spread: 1.55, wrath: 1.6, pressure: 1.75, aiDefense: 1.03, aiProgress: 1.2 },
  brutal: { name: "어려움", desc: "확산 ×1.9 · 진노 ×2 · 부두교 압박 ×2.3", spread: 1.9, wrath: 2, pressure: 2.3, aiDefense: 1.05, aiProgress: 1.35 },
};
export const DIFFICULTY_IDS: Difficulty[] = ["base", "brutal"];
/** 어려움을 여는 데 필요한 엔딩 수 (엔딩 컬렉션) */
export const HARD_UNLOCK_ENDINGS = 5;
export const isDifficulty = (v: unknown): v is Difficulty => typeof v === "string" && (DIFFICULTY_IDS as string[]).includes(v);
/** 예전 저장의 난이도 값 → 지금 값 (보통·어려움 → 기본, 지옥 → 어려움) */
export function migrateDifficulty(v: unknown): Difficulty {
  if (isDifficulty(v)) return v;
  return v === "hell" ? "brutal" : "base";
}
export const diffOf = (s: { difficulty?: Difficulty }): DifficultyDef => DIFFICULTIES[s.difficulty ?? "base"];
