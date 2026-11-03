import type { FactionId, GaugeKey, PresetId, RegionId, ResourceKey, Season } from "./types";

export interface FactionDef {
  id: FactionId;
  name: string;
  short: string;
  ruler: string;
  tagline: string;
  gauges: [GaugeKey, GaugeKey, GaugeKey, GaugeKey];
  start: Partial<Record<GaugeKey, number>>;
  res: Record<ResourceKey, number>;
  infection: number;
  /** 생산 효율: 농업(식량) / 상업(실링) / 광업(전략 자원) */
  eff: { agri: number; comm: number; mine: number };
  /** 연구 효율(이로운 연구 효과에 곱함) */
  resEff: number;
  popName: string;
  armyName: string;
  stratName: string;
  victory: string;
  victoryText: string;
  strength: string;
  weakness: string;
  system: string;
  colors: { main: string; sub: string };
}

export const FACTIONS: Record<FactionId, FactionDef> = {
  arkandal: {
    id: "arkandal", name: "아르칸달 군국", short: "아르칸달", ruler: "영웅왕 '전운'", tagline: "전 국민 병영화, 철벽 요새망",
    gauges: ["morale", "order", "finance", "legit"], start: { morale: 58, order: 65, finance: 45, legit: 55 },
    res: { pop: 140, army: 8, food: 90, silver: 30, strat: 190, prey: 0 }, infection: 28,
    eff: { agri: 0.30, comm: 0.6, mine: 0.35 }, resEff: 0.45,
    popName: "인구", armyName: "병력", stratName: "미스릴",
    victory: "방벽", victoryText: "방벽 진척 100 + 감염도 20 미만",
    strength: "병력·징집·요새", weakness: "병영 밀집 집단감염, 외교 판정 −10", system: "철벽의 방벽망 — 진척이 오를수록 감염 확산 감소",
    colors: { main: "#6d7f8c", sub: "#2f3a42" },
  },
  iruth: {
    id: "iruth", name: "아이루스 공국", short: "아이루스", ruler: "대공 겸 벨로링크 최고 의장", tagline: "무역·금융·빙철, 인공신 스틱스",
    gauges: ["morale", "order", "finance", "legit"], start: { morale: 55, order: 50, finance: 65, legit: 55 },
    res: { pop: 85, army: 3, food: 70, silver: 120, strat: 20, prey: 0 }, infection: 22,
    eff: { agri: 0.16, comm: 1.0, mine: 0.3 }, resEff: 0.3,
    popName: "인구", armyName: "병력", stratName: "빙철",
    victory: "치료", victoryText: "공유 연구 트랙 100 (치료제 완성)",
    strength: "자금, 한랭 지대(겨울 −3), 스틱스 수호", weakness: "식량 자급 불가, 무역 허브가 전염 경로, 병력 적음", system: "황금 저울 — 환전·검역 수수료, 빙철 격리벽",
    colors: { main: "#7fa8bd", sub: "#24414f" },
  },
  voodoo: {
    id: "voodoo", name: "구울 부두교", short: "부두교", ruler: "대사제", tagline: "구울은 재앙이 아니라 은총이다",
    gauges: ["faith", "control", "offering", "stealth"], start: { faith: 60, control: 55, offering: 50, stealth: 60 },
    res: { pop: 40, army: 12, food: 30, silver: 10, strat: 30, prey: 35 }, infection: 35,
    eff: { agri: 0.30, comm: 0.4, mine: 0.2 }, resEff: 0.3,
    popName: "신도", armyName: "구울 무리", stratName: "재",
    victory: "대륙 구울화", victoryText: "대륙 감염 진척(CI) 85 이상 2턴 연속",
    strength: "죽음의 계약(감염자→통제 구울), 감염 확산 행동", weakness: "타 세력의 적대, 구울 먹이, 제어 실패 시 폭주, 은닉 0이면 대토벌",
    system: "죽음의 계약 — 감염 사망자가 구울 무리로 전환",
    colors: { main: "#8f9c4a", sub: "#3a2f3d" },
  },
};
export const FACTION_IDS: FactionId[] = ["arkandal", "iruth", "voodoo"];
export const REGION_NAME: Record<RegionId, string> = { arkandal: "아르칸달", iruth: "아이루스", voodoo: "부두교", neutral: "중립지" };
export const NEUTRAL_START = 40;

export const GAUGE_LABEL: Record<GaugeKey, string> = {
  morale: "민심", order: "질서", finance: "재정", legit: "정통성",
  faith: "신앙", control: "제어", offering: "제물", stealth: "은닉",
};
/** 공통 카드 게이지 → 부두교 게이지 */
export const VOODOO_MAP: Partial<Record<GaugeKey, GaugeKey>> = { morale: "faith", order: "control", finance: "offering", legit: "stealth" };

export const SEASONS: Season[] = ["spring", "summer", "autumn", "winter"];
export const SEASON_KO: Record<Season, string> = { spring: "봄", summer: "여름", autumn: "가을", winter: "겨울" };
export const SEASON_MOD: Record<Season, number> = { spring: 0, summer: 4, autumn: 2, winter: -6 };

export const PRESETS: Record<PresetId, { name: string; agri: number; comm: number; mine: number }> = {
  balance: { name: "균형", agri: 0.5, comm: 0.3, mine: 0.2 },
  farm: { name: "농업 중시", agri: 0.7, comm: 0.2, mine: 0.1 },
  trade: { name: "상업 중시", agri: 0.3, comm: 0.55, mine: 0.15 },
  mine: { name: "광업 중시", agri: 0.35, comm: 0.25, mine: 0.4 },
};

export const seasonOf = (turn: number): Season => SEASONS[(turn - 1) % 4]!;
export const yearOf = (turn: number) => 759 + Math.floor((turn - 1) / 4);
export const infStage = (v: number) => (v <= 30 ? "소강" : v <= 60 ? "확산" : v <= 90 ? "창궐" : "붕괴");
export const otherFactions = (f: FactionId) => FACTION_IDS.filter((x) => x !== f);
