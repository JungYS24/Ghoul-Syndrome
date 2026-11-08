import { useEffect, useRef } from "react";
import { ci } from "@guul/engine";
import { useGame } from "../store/store";

/** 감염도 → 부패 단계 0~3 (소강/확산/창궐/붕괴와 같은 구간) */
export function blightLevel(inf: number): 0 | 1 | 2 | 3 {
  return inf >= 91 ? 3 : inf >= 61 ? 2 : inf >= 31 ? 1 : 0;
}

/** 안개 + 재 입자(canvas) + 감염도에 따라 번지는 썩은 피 비네팅. 화면 전체에 깔리고 클릭을 막지 않습니다. */
export function Atmosphere() {
  const ref = useRef<HTMLCanvasElement>(null);
  const state = useGame((z) => z.state);
  const screen = useGame((z) => z.screen);
  const inf = state && screen !== "title" ? Math.max(state.infection[state.faction], ci(state)) : 0;
  useEffect(() => {
    const el = document.documentElement;
    el.style.setProperty("--rot", String(Math.min(1, inf / 100)));
    el.dataset.blight = String(blightLevel(inf));
  }, [inf]);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = cv.getContext("2d"); if (!ctx) return;
    let w = 0, h = 0, raf = 0;
    const resize = () => { w = cv.width = window.innerWidth; h = cv.height = window.innerHeight; };
    resize(); window.addEventListener("resize", resize);
    const N = 38;
    const P = Array.from({ length: N }, () => ({ x: Math.random(), y: Math.random(), r: 0.6 + Math.random() * 1.6, vy: 0.012 + Math.random() * 0.03, vx: (Math.random() - 0.5) * 0.01, a: 0.15 + Math.random() * 0.4 }));
    let last = performance.now();
    const tick = (t: number) => {
      const dt = Math.min(50, t - last) / 1000; last = t;
      ctx.clearRect(0, 0, w, h);
      for (const p of P) {
        p.y += p.vy * dt * 3; p.x += (p.vx + Math.sin(t / 2500 + p.r * 9) * 0.004) * dt * 3;
        if (p.y > 1.02) { p.y = -0.02; p.x = Math.random(); }
        if (p.x < -0.02) p.x = 1.02; else if (p.x > 1.02) p.x = -0.02;
        ctx.fillStyle = `rgba(150,138,118,${p.a})`;
        ctx.beginPath(); ctx.arc(p.x * w, p.y * h, p.r, 0, 6.283); ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    const vis = () => { cancelAnimationFrame(raf); if (!document.hidden) { last = performance.now(); raf = requestAnimationFrame(tick); } };
    document.addEventListener("visibilitychange", vis); vis();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); document.removeEventListener("visibilitychange", vis); };
  }, []);
  return (
    <>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <filter id="ragged" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" seed="3" result="n" /><feDisplacementMap in="SourceGraphic" in2="n" scale="14" /></filter>
          <filter id="ink" x="-30%" y="-30%" width="160%" height="160%"><feTurbulence type="fractalNoise" baseFrequency="0.07" numOctaves="3" seed="11" result="n" /><feDisplacementMap in="SourceGraphic" in2="n" scale="9" /><feGaussianBlur stdDeviation="0.6" /></filter>
        </defs>
      </svg>
      <div className="atmo atmo-fog" aria-hidden="true" />
      <canvas ref={ref} className="atmo atmo-ash" aria-hidden="true" />
      <div className="atmo atmo-vignette" aria-hidden="true" />
    </>
  );
}
