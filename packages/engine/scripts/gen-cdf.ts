// 빌드 전 5d20 합의 분포표를 계산해 src/generated/cdf5d20.ts 로 씁니다.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { computeNdKCounts } from "../src/distribution";

const counts = computeNdKCounts(5, 20); // index = 합(0..100)
const total = 20 ** 5;
let acc = 0;
const cdf = counts.map((c) => { acc += c; return acc / total; });
const out = join(dirname(fileURLToPath(import.meta.url)), "../src/generated/cdf5d20.ts");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `// 자동 생성 파일: pnpm gen (scripts/gen-cdf.ts). 직접 수정하지 마세요.\n` +
  `/** COUNTS[s] = 5d20 합이 s 인 경우의 수 (s = 0..100) */\nexport const COUNTS_5D20: readonly number[] = ${JSON.stringify(counts)};\n` +
  `/** CDF[s] = P(합 ≤ s) */\nexport const CDF_5D20: readonly number[] = ${JSON.stringify(cdf.map((v) => Math.round(v * 1e9) / 1e9))};\n` +
  `export const TOTAL_5D20 = ${total};\n`);
console.log("wrote", out);
