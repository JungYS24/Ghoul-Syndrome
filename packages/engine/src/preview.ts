// 선택지 영향 미리보기 — 스와이프하는 동안 "어디에 영향이 있는지"만 점으로 보여 주기 위한 순수 함수.
// 정확한 숫자는 노출하지 않고 규모를 3단계(작음/보통/큼)로 묶습니다.
import { mapKey } from "./game";
import type { Choice, EffectKey, Effects, GameState } from "./types";

export type ImpactSize = 1 | 2 | 3;
/** dir: 오르면 1, 내리면 −1 (성공 효과 기준, 성공 효과가 없으면 실패 효과). fail: 실패했을 때만 건드리는 키 */
export interface ImpactDot { key: EffectKey; size: ImpactSize; dir: 1 | -1; fail: boolean }

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
  const out = new Map<EffectKey, ImpactDot>();
  const add = (eff: Effects | undefined, fail: boolean) => {
    for (const [raw, v] of Object.entries(eff ?? {}) as [EffectKey, number][]) {
      if (!v) continue;
      const mapped = mapKey(s, raw);
      if (!mapped) continue;
      const k: EffectKey = mapped === "relTo" ? "rel" : mapped;
      const size = impactSize(k, v);
      const prev = out.get(k);
      if (!prev) out.set(k, { key: k, size, dir: v > 0 ? 1 : -1, fail });
      else out.set(k, { ...prev, size: Math.max(prev.size, size) as ImpactSize }); // 방향은 먼저 등록된(성공) 쪽을 유지
    }
  };
  add(choice.effects, false);
  add(choice.onFail, true);
  return [...out.values()];
}
