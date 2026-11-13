/** 화면 설정(글자 크기·색약 모드) — localStorage 에 저장하고 <html> 의 data 속성으로 적용합니다. */
export type FontScale = "m" | "l" | "xl";
const FS_KEY = "guul-fontscale";
const CB_KEY = "guul-colorblind";

export function getFontScale(): FontScale {
  try { const v = localStorage.getItem(FS_KEY); return v === "l" || v === "xl" ? v : "m"; } catch { return "m"; }
}
export function getColorblind(): boolean {
  try { return localStorage.getItem(CB_KEY) === "1"; } catch { return false; }
}
export function applyPrefs(el: HTMLElement = document.documentElement): void {
  el.dataset.fs = getFontScale();
  if (getColorblind()) el.dataset.cb = "1"; else delete el.dataset.cb;
}
export function setFontScale(v: FontScale): void {
  try { localStorage.setItem(FS_KEY, v); } catch { /* 저장 불가 */ }
  applyPrefs();
}
export function setColorblind(on: boolean): void {
  try { localStorage.setItem(CB_KEY, on ? "1" : "0"); } catch { /* 저장 불가 */ }
  applyPrefs();
}
