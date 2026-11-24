// 빌드 정보: 버전(package.json) + 마지막 수정 시각(git 마지막 커밋, 없으면 빌드 시각) + 커밋 해시.
// vite define 으로 주입되어 로비 하단에 항상 표시됩니다.
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function git(cmd: string): string {
  try { return execSync(`git ${cmd}`, { cwd: __dirname, stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); } catch { return ""; }
}
export function buildDefine(): Record<string, string> {
  const pkg = JSON.parse(readFileSync(resolve(__dirname, "../../package.json"), "utf8")) as { version?: string };
  const time = git("log -1 --format=%cI") || new Date().toISOString();
  const ref = git("rev-parse --short HEAD");
  return {
    __APP_VERSION__: JSON.stringify(pkg.version ?? "0.0.0"),
    __BUILD_TIME__: JSON.stringify(time),
    __BUILD_REF__: JSON.stringify(ref),
  };
}
