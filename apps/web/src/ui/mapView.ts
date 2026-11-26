// 지도 시점 계산 (확대·축소·이동) — 화면과 분리한 순수 함수
export const MAP_W = 1000, MAP_H = 720;
const W = MAP_W, H = MAP_H;

/** 지도 시점: 배율 k, 왼쪽 위 월드 좌표 (x, y). 화면 = (월드 − 시점) × k */
export interface View { k: number; x: number; y: number }
export const K_MIN = 1, K_MAX = 5;
export function clampView(v: View): View {
  const k = Math.max(K_MIN, Math.min(K_MAX, v.k));
  return { k, x: Math.max(0, Math.min(W - W / k, v.x)), y: Math.max(0, Math.min(H - H / k, v.y)) };
}
/** 화면 좌표 (sx, sy)(SVG 단위) 아래 지점을 고정한 채 배율을 factor 배 */
export function zoomAt(v: View, factor: number, sx: number, sy: number): View {
  const k = Math.max(K_MIN, Math.min(K_MAX, v.k * factor));
  const wx = v.x + sx / v.k, wy = v.y + sy / v.k;
  return clampView({ k, x: wx - sx / k, y: wy - sy / k });
}
/** 화면에서 (dx, dy)(SVG 단위)만큼 끌었을 때 */
export function panBy(v: View, dx: number, dy: number): View {
  return clampView({ k: v.k, x: v.x - dx / v.k, y: v.y - dy / v.k });
}

type Pt = [number, number];
/** 볼록 다각형을 반평면 f(p) ≤ 0 으로 자릅니다 (Sutherland–Hodgman) */
function clipHalf(poly: Pt[], f: (p: Pt) => number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!, b = poly[(i + 1) % poly.length]!;
    const fa = f(a), fb = f(b);
    if (fa <= 0) out.push(a);
    if ((fa <= 0) !== (fb <= 0)) { const t = fa / (fa - fb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
  }
  return out;
}
/** 보로노이 칸: sites[i] 가 다른 어느 점보다 가까운 영역 (지도 사각형 안) — 도시 영향권 */
export function voronoiCell(sites: Pt[], i: number, w = MAP_W, h = MAP_H): Pt[] {
  let poly: Pt[] = [[0, 0], [w, 0], [w, h], [0, h]];
  const [px, py] = sites[i]!;
  sites.forEach(([qx, qy], j) => {
    if (j === i) return;
    const mx = (px + qx) / 2, my = (py + qy) / 2, nx = qx - px, ny = qy - py;
    poly = clipHalf(poly, ([x, y]) => (x - mx) * nx + (y - my) * ny);
  });
  return poly;
}
export const polyPath = (p: Pt[]) => (p.length ? `M${p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L")} Z` : "");
