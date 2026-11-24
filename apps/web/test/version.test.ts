import { describe, expect, it } from "vitest";
import { formatVersion } from "../src/ui/version";

describe("로비 버전 표시", () => {
  it("한국 시간 기준 월·일·시로 표시", () => {
    expect(formatVersion("0.1.0", "2026-11-24T05:30:00Z", "4677a8d")).toBe("v0.1.0 · 11월 24일 14시 수정 (4677a8d)");
    expect(formatVersion("0.1.0", "2026-11-24T15:10:00Z")).toBe("v0.1.0 · 11월 25일 0시 수정");
  });
  it("시각을 모르면 버전만", () => expect(formatVersion("0.1.0", "")).toBe("v0.1.0"));
});
