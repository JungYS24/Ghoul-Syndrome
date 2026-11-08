// 게이지 영향 설명 — 어떤 규칙이 이 게이지를 올리고 내리는지, 지금 실제로 적용 중인지를 보여 줍니다.
import { foodUseOf } from "./game";
import type { GameContent, GameState, GaugeKey } from "./types";

export interface Influence { text: string; /** 지금 적용 중인가 */ active: boolean; /** + 이득, − 손해 */ sign: 1 | -1 }

export function gaugeInfluences(s: GameState, key: GaugeKey, content: Pick<GameContent, "decrees"> = { decrees: [] }): Influence[] {
  const inf = s.infection[s.faction], out: Influence[] = [];
  const add = (text: string, active: boolean, sign: 1 | -1) => out.push({ text, active, sign });
  switch (key) {
    case "morale":
      add("감염도 31 이상 — 매 계절 −1 (61 이상은 −2)", inf >= 31, -1);
      add("식량이 2계절분 미만 — 계절 말 −3", s.res.food < foodUseOf(s) * 2, -1);
      add("식량 고갈(기아) — −15", s.res.food <= 0, -1);
      add("감염도 40 이하 — 계절 말 +1", inf <= 40, 1);
      break;
    case "order":
      add("감염도 61 이상(창궐) — 매 계절 −2", inf >= 61, -1);
      break;
    case "finance":
      add("실링 0 — 계절 말 −6", s.res.silver <= 0, -1);
      add("실링 10 미만 — 계절 말 −1", s.res.silver > 0 && s.res.silver < 10, -1);
      add("실링 40 이상 — 계절 말 +1", s.res.silver >= 40, 1);
      break;
    case "legit":
      add("사건과 법령으로만 변합니다 (자동 증감 없음)", false, 1);
      break;
    case "faith":
      add("제물 25 이상 — 계절 말 +4", s.gauges.offering >= 25, 1);
      add("제어 45 이상 — 계절 말 +2", s.gauges.control >= 45, 1);
      add("식량 고갈 — −15", s.res.food <= 0, -1);
      break;
    case "control":
      add(`구울 무리 유지 — 매 계절 −${Math.round(s.res.army / 20)}`, s.res.army >= 10, -1);
      add("먹이 고갈 — −20", s.res.prey <= 0, -1);
      add("먹이가 2계절분 이상 — 계절 말 +1", s.res.prey >= s.res.army / 10 * 2, 1);
      break;
    case "offering":
      add("금고 고갈 — 계절 말 −6", s.res.silver <= 0, -1);
      add("먹이가 2계절분 이상 — 계절 말 +2", s.res.prey >= s.res.army / 10 * 2, 1);
      break;
    case "stealth":
      add("타국의 수색 — 대륙 감염이 높을수록 매 계절 감소", true, -1);
      break;
  }
  for (const d of s.decrees) {
    const dec = content.decrees.find((x) => x.id === d.id);
    const v = dec?.effects[key];
    if (dec && v) add(`법령 「${dec.name}」 — 매 계절 ${v > 0 ? "+" : ""}${v}`, true, v > 0 ? 1 : -1);
  }
  return out;
}
