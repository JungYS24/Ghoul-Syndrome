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
const SIZE = ["", "w-1.5 h-1.5", "w-2.5 h-2.5", "w-3.5 h-3.5"];
const LABEL = ["", "작은 영향", "영향", "큰 영향"];

/** 영향 표시 점 — 정확한 숫자 없이 크기로만 규모를 알려 줍니다. */
export function ImpactMark({ k, className = "" }: { k: EffectKey | EffectKey[]; className?: string }) {
  const size = useImpact(k);
  return (
    <span className={`inline-grid place-items-center w-3.5 h-3.5 shrink-0 align-middle ${className}`} aria-hidden={!size}>
      {size ? <i className={`impact-dot block rounded-full bg-gold ${SIZE[size]}`} title={LABEL[size]} role="img" aria-label={LABEL[size]} /> : null}
    </span>
  );
}
