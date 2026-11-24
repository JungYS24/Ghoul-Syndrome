// 실시간 모드의 시간 규칙 — 화면과 분리한 순수 함수 (테스트용)
export const DEADLINE_MS = 15000; // 사람이 고르는 제한시간: 배속과 상관없이 15초
export const AUTO_MS = 800;       // 자동(관전) 모드의 한 번 선택 간격 (배속 적용)
export type PlayMode = "turn" | "realtime";
export const MODE_KEY = "guul-save-mode-v1";

/** 팝업 제한시간(ms). 사람은 배속과 무관하게 같은 시간을 받고, 자동 진행만 배속을 따릅니다. */
export function deadlineMs(auto: boolean, speed: number): number {
  return auto ? AUTO_MS / Math.max(1, speed) : DEADLINE_MS;
}
/** 날짜 시계·제한시간이 멈춰야 하는지: 일시정지, 주사위 연출(턴제 모달·실시간 판정), 시트(연대기·규칙·설정 등)가 열려 있을 때 */
export function clockFrozen(st: { paused: boolean; dice: unknown; modalOpen: boolean; rtRoll?: unknown }): boolean {
  return st.paused || !!st.dice || !!st.rtRoll || st.modalOpen;
}
export function isPlayMode(v: unknown): v is PlayMode { return v === "turn" || v === "realtime"; }
