import { describe, expect, it } from "vitest";
import { AFTERMATH_AT_OR_BELOW, GAUGE_HELP, GAUGE_LABEL, GRADES, INFECTION_STAGES, ON_FAIL_BELOW, gradeOf, gradeTable, infStage, infStageOf } from "../src";
import gradeData from "../src/data/grades.json";

describe("등급표 자동 생성 (grades.json)", () => {
  const rows = gradeTable();
  it("grades.json 의 모든 등급이 순서대로 들어간다", () => {
    expect(rows.map((r) => r.name)).toEqual(gradeData.grades.map((g) => g.name));
    expect(rows).toHaveLength(GRADES.length);
  });
  it("구간이 1~100을 빈틈없이 덮는다", () => {
    expect(rows[0]!.max).toBe(100);
    expect(rows[rows.length - 1]!.min).toBe(1);
    for (let i = 1; i < rows.length; i++) expect(rows[i]!.max).toBe(rows[i - 1]!.min - 1);
  });
  it("구간 안의 모든 값이 gradeOf 와 같은 등급", () => {
    for (const r of rows) for (let v = r.min; v <= r.max; v++) expect(gradeOf(v).name).toBe(r.name);
  });
  it("실패·후유증 기준도 grades.json 에서 온다", () => {
    expect(ON_FAIL_BELOW).toBe(gradeData.onFailBelow);
    expect(AFTERMATH_AT_OR_BELOW).toBe(gradeData.aftermathAtOrBelow);
  });
  it("다른 등급 데이터를 넣으면 그 데이터로 표를 만든다", () => {
    const t = gradeTable([{ min: 50, name: "성공", tone: "success" }, { min: 1, name: "실패", tone: "fail" }]);
    expect(t).toEqual([{ min: 50, max: 100, name: "성공", tone: "success" }, { min: 1, max: 49, name: "실패", tone: "fail" }]);
  });
});

describe("감염도 구간", () => {
  it("0~100을 빈틈없이 덮고 경계가 맞다", () => {
    expect(INFECTION_STAGES[0]!.min).toBe(0);
    expect(INFECTION_STAGES[INFECTION_STAGES.length - 1]!.max).toBe(100);
    for (let i = 1; i < INFECTION_STAGES.length; i++) expect(INFECTION_STAGES[i]!.min).toBe(INFECTION_STAGES[i - 1]!.max + 1);
    expect([0, 30, 31, 60, 61, 90, 91, 100].map(infStage)).toEqual(["소강", "소강", "확산", "확산", "창궐", "창궐", "붕괴", "붕괴"]);
    expect(infStageOf(75).effect).toContain("판정 −5");
  });
  it("모든 게이지에 설명이 있다", () => {
    for (const k of Object.keys(GAUGE_LABEL)) expect(GAUGE_HELP[k as keyof typeof GAUGE_HELP]).toBeTruthy();
  });
});
