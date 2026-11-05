// 확산 지도 색 — 감염도가 높을수록 역병색이 진해집니다(불투명도 0.12 → 0.92).
export function regionOpacity(infection: number): number {
  const t = Math.max(0, Math.min(100, infection)) / 100;
  return Math.round((0.12 + t * 0.8) * 100) / 100;
}
/** 91 이상(붕괴)은 핏빛 테두리로 따로 표시 */
export function regionCollapsed(infection: number): boolean { return infection >= 91; }
