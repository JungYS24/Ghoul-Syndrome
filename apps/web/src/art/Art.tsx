// 플랫 벡터 일러스트 — 외부 이미지 없음. 선 2px, 그라데이션 없음, 2톤 + 포인트 1색.
// 색은 currentColor(선)·var(--art-fill,2톤)·var(--art-accent,포인트)를 씁니다.
import type { CSSProperties, ReactNode } from "react";

type P = { children: ReactNode; sway?: boolean };
function Base({ children, sway }: P) {
  return (
    <svg viewBox="0 0 64 64" className={`art-svg ${sway ? "art-sway" : ""}`} aria-hidden="true"
      fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}
const F = "var(--art-fill)";
const A = "var(--art-accent)";

export const ART: Record<string, () => ReactNode> = {
  fortress: () => <Base><path d="M10 54V26h8v-6h6v6h8v-6h6v6h8v28z" fill={F} /><path d="M24 54V42a8 8 0 0 1 16 0v12" fill={F} stroke="currentColor" /><path d="M14 54h36" /></Base>,
  wall: () => <Base><path d="M8 50V30h48v20z" fill={F} /><path d="M8 30l6-8h36l6 8M20 22v-6h4v6M40 22v-6h4v6" /><path d="M8 38h48M24 38v12M40 38v12M16 30v8M32 30v8M48 30v8" /></Base>,
  soldier: () => <Base><circle cx="26" cy="16" r="6" fill={F} /><path d="M26 22v20M26 30l-10 6M26 30l10 6M26 42l-6 12M26 42l6 12" /><path d="M44 10v44" stroke={A} /><path d="M44 10l-6 4 6 4z" fill={A} stroke={A} /></Base>,
  ghoul: () => <Base sway><circle cx="28" cy="16" r="6" fill={F} /><path d="M25 15h.01M31 15h.01" stroke={A} strokeWidth={3} /><path d="M28 22v18M28 28l-11 3M28 28l10 5M28 40l-7 12M28 40l5 12" /></Base>,
  corpse: () => <Base><path d="M10 44h44" /><path d="M16 44l4-10h24l4 10" fill={F} /><path d="M24 34l2-6h12l2 6M28 22a4 4 0 0 1 8 0" stroke={A} /></Base>,
  grave: () => <Base><path d="M18 54V28a14 14 0 0 1 28 0v26z" fill={F} /><path d="M32 20v14M25 27h14" stroke={A} /><path d="M10 54h44" /></Base>,
  torch: () => <Base sway><path d="M30 54V28h4v26z" fill={F} /><path d="M32 28c-6-4-6-12 0-20 6 8 6 16 0 20z" fill={A} stroke={A} /><path d="M24 54h16" /></Base>,
  fire: () => <Base sway><path d="M32 54c-10 0-16-7-16-16 0-8 6-12 6-18 4 4 4 8 8 8 2-4 0-10-2-14 12 4 20 14 20 24 0 9-6 16-16 16z" fill={A} stroke={A} /></Base>,
  potion: () => <Base><path d="M26 10h12M28 10v10l-8 20a8 8 0 0 0 8 12h8a8 8 0 0 0 8-12l-8-20V10" fill={F} /><path d="M22 36h20" /><circle cx="30" cy="42" r="2" fill={A} stroke={A} /><circle cx="36" cy="46" r="1.5" fill={A} stroke={A} /></Base>,
  ship: () => <Base sway><path d="M10 40h44l-6 12H16z" fill={F} /><path d="M32 40V10M32 14l14 4-14 6zM32 24l-12 3 12 4z" fill={A} stroke={A} /></Base>,
  coin: () => <Base><circle cx="24" cy="34" r="14" fill={F} /><circle cx="24" cy="34" r="9" stroke={A} /><path d="M40 24a14 14 0 0 1 0 20" stroke={F} fill="none" /><path d="M24 29v10M21 32h6" stroke={A} /></Base>,
  scales: () => <Base><path d="M32 12v34M20 46h24" /><path d="M32 18l-16 6M32 18l16 6" /><path d="M10 24a6 6 0 0 0 12 0zM42 24a6 6 0 0 0 12 0z" fill={F} /><circle cx="32" cy="12" r="2.5" fill={A} stroke={A} /></Base>,
  grain: () => <Base sway><path d="M32 54V22" /><path d="M32 22c4-4 10-4 12-10-6-2-10 2-12 6M32 28c4-4 10-4 12-10M32 22c-4-4-10-4-12-10 6-2 10 2 12 6M32 28c-4-4-10-4-12-10" fill={F} /><path d="M32 14c0-4 2-6 4-8" stroke={A} /></Base>,
  cart: () => <Base><path d="M10 20h8l6 22h22" fill="none" /><path d="M24 24h26l-3 14H28z" fill={F} /><circle cx="30" cy="48" r="4" /><circle cx="44" cy="48" r="4" /></Base>,
  crown: () => <Base><path d="M12 44l-2-22 12 10 10-16 10 16 12-10-2 22z" fill={F} /><path d="M12 44h40" /><circle cx="22" cy="22" r="2" fill={A} stroke={A} /><circle cx="42" cy="22" r="2" fill={A} stroke={A} /><circle cx="32" cy="16" r="2.5" fill={A} stroke={A} /></Base>,
  banner: () => <Base sway><path d="M18 8v48" /><path d="M18 10h30l-6 8 6 8H18z" fill={A} stroke={A} /><circle cx="18" cy="8" r="2" fill={F} /></Base>,
  shield: () => <Base><path d="M32 8l20 6v16c0 14-10 22-20 26-10-4-20-12-20-26V14z" fill={F} /><path d="M32 16v28M20 26h24" stroke={A} /></Base>,
  sword: () => <Base><path d="M32 8l4 30-4 6-4-6z" fill={F} /><path d="M22 44h20M32 44v12" /><path d="M26 40h12" stroke={A} /></Base>,
  scroll: () => <Base><path d="M16 16a4 4 0 0 1 8 0v32a4 4 0 0 1-8 0" fill={F} /><path d="M24 14h24v36H24" fill={F} /><path d="M30 24h14M30 32h14M30 40h8" stroke={A} /></Base>,
  book: () => <Base><path d="M12 14h18a4 4 0 0 1 4 4v34a6 6 0 0 0-6-4H12z" fill={F} /><path d="M52 14H34a4 4 0 0 0-4 4v34a6 6 0 0 1 6-4h16z" fill={F} /><path d="M34 22v24" stroke={A} /></Base>,
  altar: () => <Base><path d="M14 54V30h36v24z" fill={F} /><path d="M20 30V20h24v10M32 20V8M24 12h16" stroke={A} /><path d="M10 54h44" /></Base>,
  bell: () => <Base sway><path d="M32 10a4 4 0 0 1 0 8M18 46c0-16 4-28 14-28s14 12 14 28z" fill={F} /><path d="M14 46h36" /><circle cx="32" cy="50" r="3" fill={A} stroke={A} /></Base>,
  chain: () => <Base><ellipse cx="20" cy="22" rx="7" ry="9" fill={F} /><ellipse cx="32" cy="36" rx="7" ry="9" fill={F} /><ellipse cx="44" cy="50" rx="7" ry="9" fill={F} /></Base>,
  crystal: () => <Base><path d="M32 8l16 16-16 32-16-32z" fill={F} /><path d="M16 24h32M32 8v48M24 16l8 8 8-8" stroke={A} /></Base>,
  pickaxe: () => <Base><path d="M14 18c12-2 24-2 36 0-10 4-14 10-18 10S24 22 14 18z" fill={F} /><path d="M32 28v28" stroke={A} strokeWidth={3} /></Base>,
  blizzard: () => <Base sway><path d="M32 12v40M16 22l32 20M48 22L16 42M20 16l24 32M44 16L20 48" stroke={F} /><path d="M32 12l-3 4h6zM32 52l-3-4h6z" fill={A} stroke={A} /></Base>,
  raven: () => <Base sway><path d="M14 40c8 2 14-2 18-10 2 8 10 12 18 8-4 8-12 12-18 10M26 30l-8-6" fill={F} /><circle cx="30" cy="26" r="2" fill={A} stroke={A} /><path d="M32 28l6-2" stroke={A} /></Base>,
  rat: () => <Base sway><ellipse cx="28" cy="40" rx="14" ry="9" fill={F} /><circle cx="18" cy="34" r="5" fill={F} /><path d="M42 44c8 0 10-8 14-10" /><circle cx="16" cy="33" r="1.5" fill={A} stroke={A} /></Base>,
  moon: () => <Base><path d="M38 10a22 22 0 1 0 0 44 18 18 0 0 1 0-44z" fill={F} /><circle cx="24" cy="24" r="2" fill={A} stroke={A} /><circle cx="20" cy="40" r="1.5" fill={A} stroke={A} /></Base>,
  tent: () => <Base><path d="M10 48L30 14l20 34z" fill={F} /><path d="M30 14v34M24 48l6-10 6 10" stroke={A} /><path d="M8 48h44" /></Base>,
  well: () => <Base><path d="M16 28h32v26H16z" fill={F} /><path d="M16 28l16-10 16 10M20 18v-4h24v4" /><path d="M16 40h32" stroke={A} /><circle cx="32" cy="47" r="4" fill={A} stroke={A} /></Base>,
  treaty: () => <Base><path d="M14 12h28v40H14z" fill={F} /><path d="M20 22h16M20 30h16M20 38h10" stroke={A} /><circle cx="40" cy="46" r="7" fill={A} stroke={A} /><path d="M40 46l-3 10 3-2 3 2z" fill={A} stroke={A} /></Base>,
  eye: () => <Base sway><path d="M8 32s10-14 24-14 24 14 24 14-10 14-24 14S8 32 8 32z" fill={F} /><circle cx="32" cy="32" r="7" fill="currentColor" /><circle cx="32" cy="32" r="3" fill={A} stroke={A} /></Base>,
  snowflake: () => <Base sway><path d="M32 8v48M12.3 20l39.4 24M51.7 20L12.3 44" stroke={F} /><path d="M32 16l-5 5M32 16l5 5M32 48l-5-5M32 48l5 5M17 23l.8 6.8 6.8-.8M47 41l-.8-6.8-6.8.8M47 23l.8 6.8-6.8-.8M17 41l-.8-6.8 6.8.8" stroke={A} /><circle cx="32" cy="32" r="3" fill={A} stroke={A} /></Base>,
};

export function Illus({ keys, faction, accent, className, style }: { keys?: string[]; faction: "arkandal" | "iruth" | "voodoo"; accent?: boolean; className?: string; style?: CSSProperties }) {
  const list = (keys ?? []).filter((k) => ART[k]).slice(0, 3);
  if (!list.length) return null;
  const vars = {
    "--art-fill": `var(--f-sub)`,
    "--art-accent": accent ? "var(--gold)" : "var(--f-main)",
  } as CSSProperties;
  return (
    <div className={`illus illus-${list.length} ${className ?? ""}`} style={{ ...vars, ...style }} data-faction={faction}>
      {list.map((k, i) => <span key={i} className="illus-item">{ART[k]!()}</span>)}
    </div>
  );
}
export const ART_KEYS = Object.keys(ART);
