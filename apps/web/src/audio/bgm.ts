// 배경음 — 로비 + 세력별 루프. 음소거 토글(sfx)과 연동하고, 브라우저 자동재생 차단 시 첫 입력에서 시작합니다.
import { isMuted, onMuteChange } from "./sfx";

export type BgmTrack = "lobby" | "arkandal" | "iruth" | "voodoo";
const SRC: Record<BgmTrack, string> = {
  lobby: "bgm/bgm-lobby.mp3",
  arkandal: "bgm/bgm-arkandal.mp3",
  iruth: "bgm/bgm-iruth.mp3",
  voodoo: "bgm/bgm-voodoo.mp3",
};
const loadVol = () => { try { const v = parseFloat(localStorage.getItem("guul-vol-bgm") ?? ""); return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.45; } catch { return 0.45; } };
let VOLUME = loadVol();
export const getBgmVolume = () => VOLUME;
/** 배경음 음량 (0~1) — 설정 탭에서 조절 */
export function setBgmVolume(v: number) {
  VOLUME = Math.min(1, Math.max(0, v));
  try { localStorage.setItem("guul-vol-bgm", String(VOLUME)); } catch { /* 저장 불가 */ }
  if (audio) audio.volume = VOLUME;
}

let audio: HTMLAudioElement | null = null;
let current: BgmTrack | null = null;
let desired: BgmTrack | null = null;
let gestureHooked = false;

function el(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!audio) { audio = new Audio(); audio.loop = true; audio.volume = VOLUME; audio.preload = "auto"; }
  return audio;
}
function hookGesture() {
  if (gestureHooked || typeof window === "undefined") return;
  gestureHooked = true;
  const on = () => {
    gestureHooked = false;
    window.removeEventListener("pointerdown", on);
    window.removeEventListener("keydown", on);
    tryPlay();
  };
  window.addEventListener("pointerdown", on, { once: true });
  window.addEventListener("keydown", on, { once: true });
}
function tryPlay() {
  const a = el();
  if (!a || desired === null) return;
  if (isMuted()) { a.pause(); return; }
  if (current !== desired) {
    try { a.src = new URL(SRC[desired], document.baseURI).href; } catch { a.src = SRC[desired]; }
    current = desired;
    try { a.currentTime = 0; } catch { /* ignore */ }
  }
  const p = a.play();
  if (p && typeof p.catch === "function") p.catch(() => hookGesture());
}

/** 지정 트랙을 재생(이미 재생 중이면 유지). 음소거면 대기. */
export function playBgm(track: BgmTrack) { desired = track; tryPlay(); }
/** 정지 */
export function stopBgm() { desired = null; current = null; el()?.pause(); }

if (typeof window !== "undefined") onMuteChange(() => tryPlay());
