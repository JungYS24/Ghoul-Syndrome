import { describe, expect, it } from "vitest";
import { regionCollapsed, regionOpacity } from "../src/ui/mapShade";

describe("확산 지도 색", () => {
  it("감염도가 오를수록 진해진다", () => {
    expect(regionOpacity(0)).toBe(0.12);
    expect(regionOpacity(100)).toBe(0.92);
    for (let v = 0; v < 100; v++) expect(regionOpacity(v + 1)).toBeGreaterThanOrEqual(regionOpacity(v));
    expect(regionOpacity(-5)).toBe(0.12);
    expect(regionOpacity(140)).toBe(0.92);
  });
  it("붕괴 구간 표시", () => { expect(regionCollapsed(90)).toBe(false); expect(regionCollapsed(91)).toBe(true); });
});
