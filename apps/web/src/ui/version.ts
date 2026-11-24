// 로비에 표시하는 버전 문자열 — "v0.1.0 · 11월 24일 14시 수정 (4677a8d)" (한국 시간 기준)
export function formatVersion(version: string, iso: string, ref = ""): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return `v${version}`;
  const p = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "numeric", hourCycle: "h23" }).formatToParts(d);
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `v${version} · ${get("month")}월 ${get("day")}일 ${get("hour")}시 수정${ref ? ` (${ref})` : ""}`;
}
const safe = (f: () => string, d: string) => { try { return f(); } catch { return d; } };
export const VERSION_LABEL = formatVersion(
  safe(() => __APP_VERSION__, "dev"), safe(() => __BUILD_TIME__, ""), safe(() => __BUILD_REF__, ""),
);
