/** mulberry32 — 상태는 uint32 하나라 저장/리플레이가 쉽습니다. */
export interface Rng { state: number; next(): number; int(min: number, max: number): number }
export function createRng(seed: number): Rng {
  const r: Rng = {
    state: seed >>> 0,
    next() {
      let t = (r.state = (r.state + 0x6d2b79f5) >>> 0);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    int(min, max) { return min + Math.floor(r.next() * (max - min + 1)); },
  };
  return r;
}
