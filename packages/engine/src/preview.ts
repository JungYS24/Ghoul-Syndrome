// 선택지 영향 미리보기 — 스와이프하는 동안 "어디에 영향이 있는지"만 점으로 보여 주기 위한 순수 함수.
// 정확한 숫자는 노출하지 않고 규모를 3단계(작음/보통/큼)로 묶습니다.
import { mapKey } from "./game";
import type { Choice, EffectKey, Effects, GameState } from "./types";

export type ImpactSize = 1 | 2 | 3;
export interface ImpactDot { key: EffectKey; size: ImpactSize }

/** 인구·병력은 만 단위라 값이 작습니다. 다른 키와 같은 눈금이 되도록 늘립니다. */
const SCALE: Partial<Record<EffectKey, number>> = { pop: 10, army: 10 };

/** |값| → 규모: 4 이하 작음, 10 이하 보통, 그보다 크면 큼 */
export function impactSize(key: EffectKey, value: number): ImpactSize {
  const v = Math.abs(value) * (SCALE[key] ?? 1);
  return v <= 4 ? 1 : v <= 10 ? 2 : 3;
}

/**
 * 선택지가 건드리는 키(현재 세력 기준으로 매핑)와 대략적 규모.
 * onFail 효과도 "영향 있음"에 포함하되, 같은 키는 큰 쪽을 씁니다. relTo 는 rel 로 묶습니다.
 */
export function choiceImpact(s: GameState, choice: Choice): ImpactDot[] {
  const out = new Map<EffectKey, ImpactSize>();
  const add = (eff: Effects | undefined) => {
    for (const [raw, v] of Object.entries(eff ?? {}) as [EffectKey, number][]) {
      if (!v) continue;
      const mapped = mapKey(s, raw);
      if (!mapped) continue;
      const k: EffectKey = mapped === "relTo" ? "rel" : mapped;
      const size = impactSize(k, v);
      out.set(k, Math.max(out.get(k) ?? 0, size) as ImpactSize);
    }
  };
  add(choice.effects);
  add(choice.onFail);
  return [...out.entries()].map(([key, size]) => ({ key, size }));
}
