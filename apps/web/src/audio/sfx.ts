// WebAudio 합성 효과음 — 에셋 파일 없음
let ctx: AudioContext | null = null;
let muted = (() => { try { return localStorage.getItem("guul-muted") === "1"; } catch { return false; } })();
const listeners = new Set<(m: boolean) => void>();

export const isMuted = () => muted;
export function setMuted(m: boolean) {
  muted = m;
  try { localStorage.setItem("guul-muted", m ? "1" : "0"); } catch { /* 저장 불가 환경 */ }
  listeners.forEach((f) => f(m));
}
export function onMuteChange(f: (m: boolean) => void) { listeners.add(f); return () => { listeners.delete(f); }; }

function ac(): AudioContext | null {
  if (muted) return null;
  try {
    if (!ctx) { const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext; if (!C) return null; ctx = new C(); }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch { return null; }
}
const loadVol = (k: string, d: number) => { try { const v = parseFloat(localStorage.getItem(k) ?? ""); return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : d; } catch { return d; } };
let sfxVol = loadVol("guul-vol-sfx", 0.8);
let master: GainNode | null = null;
/** 효과음 마스터 게인 (음량 설정) */
function dest(c: AudioContext): AudioNode {
  if (!master || master.context !== c) { master = c.createGain(); master.gain.value = sfxVol; master.connect(c.destination); }
  return master;
}
export const getSfxVolume = () => sfxVol;
export function setSfxVolume(v: number) {
  sfxVol = Math.min(1, Math.max(0, v));
  try { localStorage.setItem("guul-vol-sfx", String(sfxVol)); } catch { /* 저장 불가 */ }
  if (master) master.gain.value = sfxVol;
}
function noiseBuffer(c: AudioContext, dur: number) {
  const b = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  return b;
}
/** 주사위가 바닥에 닿는 둔탁한 소리 */
export function thud(intensity = 1) {
  const c = ac(); if (!c) return;
  const t = c.currentTime;
  const o = c.createOscillator(), g = c.createGain();
  o.type = "sine"; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(55, t + 0.14);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5 * intensity, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
  o.connect(g).connect(dest(c)); o.start(t); o.stop(t + 0.22);
  const n = c.createBufferSource(); n.buffer = noiseBuffer(c, 0.07);
  const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 900;
  const ng = c.createGain(); ng.gain.value = 0.25 * intensity;
  n.connect(f).connect(ng).connect(dest(c)); n.start(t);
}
/** 던질 때 달그락 소리 */
export function rattle() {
  const c = ac(); if (!c) return;
  for (let i = 0; i < 7; i++) {
    const t = c.currentTime + i * 0.045 + Math.random() * 0.02;
    const n = c.createBufferSource(); n.buffer = noiseBuffer(c, 0.025);
    const f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 1800 + Math.random() * 1500; f.Q.value = 4;
    const g = c.createGain(); g.gain.value = 0.18;
    n.connect(f).connect(g).connect(dest(c)); n.start(t);
  }
}
/** 대성공 종소리 */
export function chime() {
  const c = ac(); if (!c) return;
  [660, 990, 1320].forEach((fr, i) => {
    const t = c.currentTime + i * 0.07;
    const o = c.createOscillator(), g = c.createGain();
    o.type = "triangle"; o.frequency.value = fr;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    o.connect(g).connect(dest(c)); o.start(t); o.stop(t + 1);
  });
}
/** 대실패 낮은 울림 */
export function doom() {
  const c = ac(); if (!c) return;
  const t = c.currentTime;
  const o = c.createOscillator(), g = c.createGain();
  o.type = "sawtooth"; o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.7);
  const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 400;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
  o.connect(f).connect(g).connect(dest(c)); o.start(t); o.stop(t + 0.85);
}
export function tick() {
  const c = ac(); if (!c) return;
  const t = c.currentTime, o = c.createOscillator(), g = c.createGain();
  o.type = "square"; o.frequency.value = 1400;
  g.gain.setValueAtTime(0.04, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
  o.connect(g).connect(dest(c)); o.start(t); o.stop(t + 0.04);
}
export function buzz(ms = 10) { try { navigator.vibrate?.(ms); } catch { /* 미지원 */ } }
