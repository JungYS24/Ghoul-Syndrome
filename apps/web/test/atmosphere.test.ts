import { describe, expect, it } from "vitest";
import { blightLevel } from "../src/ui/Atmosphere";

describe("부패 단계", () => {
  it("감염도 구간(소강/확산/창궐/붕괴)과 같은 경계를 쓴다", () => {
    expect([0, 30, 31, 60, 61, 90, 91, 100].map(blightLevel)).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
  });
});
