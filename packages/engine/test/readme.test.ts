// README 의 판정 기준·등급표가 grades.json 과 어긋나지 않게 지킵니다.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { AFTERMATH_AT_OR_BELOW, ON_FAIL_BELOW, gradeTable } from "../src";

const readme = readFileSync(fileURLToPath(new URL("../../../README.md", import.meta.url)), "utf8");

describe("README 문서 동기화", () => {
  it("등급표가 grades.json 과 같다", () => {
    const rows = [...readme.matchAll(/^\| (\d+)~(\d+) \| ([^|]+?) \|/gm)].map((m) => ({ min: Number(m[1]), max: Number(m[2]), name: m[3]!.trim() }));
    expect(rows).toEqual(gradeTable().map(({ min, max, name }) => ({ min, max, name })));
  });
  it("실패 비용·후유증 기준 숫자가 코드와 같다", () => {
    expect(readme).toContain(`최종값 **${ON_FAIL_BELOW} 미만**`);
    expect(readme).toContain(`최종값 **${AFTERMATH_AT_OR_BELOW} 이하**`);
  });
});
