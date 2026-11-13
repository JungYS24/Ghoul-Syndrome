import type { EffectKey, ImpactDot, ImpactSize } from "@guul/engine";
import { useGame } from "../store/store";

/** 미리보기 중인 선택지가 keys 중 하나라도 건드리면 그 규모(1~3), 아니면 0 */
export function useImpact(keys: EffectKey | EffectKey[]): ImpactSize | 0 {
  const preview = useGame((z) => z.preview);
  if (!preview) return 0;
  const ks = Array.isArray(keys) ? keys : [keys];
  let best: ImpactSize | 0 = 0;
  for (const d of preview) if (ks.includes(d.key) && d.size > best) best = d.size;
  return best;
}

/** 미리보기 중인 선택지가 keys 를 건드리면 그 영향(방향·규모), 아니면 null */
export function useImpactDot(keys: EffectKey | EffectKey[]): ImpactDot | null {
  const preview = useGame((z) => z.preview);
  if (!preview) return null;
  const ks = Array.isArray(keys) ? keys : [keys];
  let best: ImpactDot | null = null;
  for (const d of preview) if (ks.includes(d.key) && (!best || d.size > best.size)) best = d;
  return best;
}
const ARROWS = { 1: ["▲", "▲▲", "▲▲▲"], "-1": ["▼", "▼▼", "▼▼▼"] } as const;
export const arrowOf = (d: ImpactDot) => ARROWS[d.dir > 0 ? 1 : "-1"][d.size - 1]!;
const LABEL = ["", "조금", "보통", "크게"];
export const impactText = (d: ImpactDot) => `${LABEL[d.size]} ${d.dir > 0 ? "오름" : "내림"}${d.fail ? " (실패 시)" : ""}`;

/** 영향 표시 — 정확한 숫자 없이 화살표 개수로 규모를 알려 줍니다 (▲ 오름 / ▼ 내림). */
export function ImpactMark({ k, className = "" }: { k: EffectKey | EffectKey[]; className?: string }) {
  const dot = useImpactDot(k);
  return (
    <span className={`inline-block min-w-[1.4em] text-[10px] leading-none align-middle ${dot ? (dot.dir > 0 ? "impact-up" : "impact-down") : ""} ${className}`}
      title={dot ? impactText(dot) : undefined} aria-label={dot ? impactText(dot) : undefined} aria-hidden={!dot}>
      {dot ? arrowOf(dot) : ""}
    </span>
  );
}
