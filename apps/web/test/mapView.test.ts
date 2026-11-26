import { describe, expect, it } from "vitest";
import { MAP_H, MAP_W, clampView, panBy, zoomAt } from "../src/ui/mapView";

describe("지도 시점", () => {
  it("배율은 1~5, 시점은 지도 밖으로 나가지 않는다", () => {
    expect(clampView({ k: 0.5, x: -10, y: -10 })).toEqual({ k: 1, x: 0, y: 0 });
    const v = clampView({ k: 9, x: 5000, y: 5000 });
    expect(v.k).toBe(5);
    expect(v.x).toBeCloseTo(MAP_W - MAP_W / 5);
    expect(v.y).toBeCloseTo(MAP_H - MAP_H / 5);
  });
  it("확대해도 커서 아래 지점은 그대로", () => {
    const v0 = { k: 2, x: 200, y: 150 };
    const sx = 300, sy = 200;
    const before = [v0.x + sx / v0.k, v0.y + sy / v0.k];
    const v1 = zoomAt(v0, 1.5, sx, sy);
    expect(v1.k).toBe(3);
    expect(v1.x + sx / v1.k).toBeCloseTo(before[0]!);
    expect(v1.y + sy / v1.k).toBeCloseTo(before[1]!);
  });
  it("끌면 반대 방향으로 시점이 움직인다", () => {
    const v = panBy({ k: 2, x: 300, y: 200 }, 100, -40);
    expect(v.x).toBe(250);
    expect(v.y).toBe(220);
  });
});

import { voronoiCell } from "../src/ui/mapView";
describe("도시 영향권 (보로노이)", () => {
  it("두 점이면 가운데 수직선으로 반씩 나뉜다", () => {
    const left = voronoiCell([[100, 100], [300, 100]], 0, 400, 200);
    expect(Math.max(...left.map((p) => p[0]))).toBeCloseTo(200);
    expect(Math.min(...left.map((p) => p[0]))).toBeCloseTo(0);
  });
});
