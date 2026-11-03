/** n개의 k면체 합의 경우의 수 배열 (index = 합, 0..n*k) */
export function computeNdKCounts(n: number, k: number): number[] {
  let dist = [1];
  for (let i = 0; i < n; i++) {
    const next = new Array<number>(dist.length + k).fill(0);
    dist.forEach((c, s) => { for (let f = 1; f <= k; f++) next[s + f]! += c; });
    dist = next;
  }
  return dist;
}
