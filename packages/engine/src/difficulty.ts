// 난이도 — 기본 확산량, 진노 증가량, AI 압박을 배율로 조정합니다. 보통이 밸런스 기준(승률 30~45%)입니다.
export type Difficulty = "normal" | "hard" | "hell";
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
  normal: { name: "보통", desc: "기획 의도대로의 균형", spread: 1, wrath: 1, pressure: 1, aiDefense: 1, aiProgress: 1 },
  hard: { name: "어려움", desc: "확산 ×1.2 · 진노 ×1.25 · 부두교 압박 ×1.3", spread: 1.2, wrath: 1.25, pressure: 1.3, aiDefense: 1.01, aiProgress: 1.1 },
  hell: { name: "지옥", desc: "확산 ×1.45 · 진노 ×1.5 · 부두교 압박 ×1.6", spread: 1.45, wrath: 1.5, pressure: 1.6, aiDefense: 1.02, aiProgress: 1.15 },
};
export const DIFFICULTY_IDS: Difficulty[] = ["normal", "hard", "hell"];
export const isDifficulty = (v: unknown): v is Difficulty => typeof v === "string" && (DIFFICULTY_IDS as string[]).includes(v);
export const diffOf = (s: { difficulty?: Difficulty }): DifficultyDef => DIFFICULTIES[s.difficulty ?? "normal"];
