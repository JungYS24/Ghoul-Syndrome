export type FactionId = "arkandal" | "iruth" | "voodoo";
export type RegionId = FactionId | "neutral";
export type CardFaction = FactionId | "common";
export type Season = "spring" | "summer" | "autumn" | "winter";

/** 아르칸달·아이루스: morale/order/finance/legit, 부두교: faith/control/offering/stealth */
export type GaugeKey = "morale" | "order" | "finance" | "legit" | "faith" | "control" | "offering" | "stealth";
export type ResourceKey = "pop" | "army" | "food" | "silver" | "strat" | "prey";
/**
 * infection: 자기 세력 감염도 / target: (부두교) 현재 대상 세력 감염도 / neutral: 중립지 감염도
 * rel: 모든 타 세력 관계 / relTo: 선택지 target 세력과의 관계 / voodooPower: (AI 부두교) 세력 규모
 */
export type EffectKey =
  | GaugeKey | ResourceKey
  | "infection" | "target" | "neutral" | "wrath" | "research" | "wall"
  | "rel" | "relTo" | "voodooPower";
export type Effects = Partial<Record<EffectKey, number>>;

export interface Range { min?: number; max?: number }
export interface When {
  infection?: Range;
  turn?: Range;
  wrath?: Range;
  ci?: Range;
  wall?: Range;
  gauge?: Partial<Record<GaugeKey, Range>>;
  flags?: string[];
  notFlags?: string[];
  foodLow?: boolean;
  relLow?: boolean;
  voodooAi?: boolean;
}
export interface Check { stat: GaugeKey; mod?: number }
export interface Choice {
  label: string;
  art?: string[];
  check: Check;
  effects: Effects;
  onFail?: Effects;
  setFlags?: string[];
  /** 외교 대상 */
  target?: FactionId;
  /** 성공할수록 커지는 대가(부두교 은닉 등) — 부호와 상관없이 ×배율 */
  withSuccess?: EffectKey[];
}
export interface Card {
  id: string;
  faction: CardFaction;
  kind?: string;
  season?: Season[];
  when?: When;
  weight?: number;
  title: string;
  text: string;
  art?: string[];
  choices: Choice[];
}
export interface ActionDef {
  id: string;
  name: string;
  desc: string;
  factions: FactionId[];
  when?: When;
  card: Card;
}
export interface Grade { min: number; name: string; tone: "crit" | "great" | "success" | "partial" | "fail" | "fumble" | "after" }

export interface GameContent {
  cards: Card[];
  situational: Card[];
  collapse: Card[];
  fixed: Record<string, Card>;
  actions: ActionDef[];
}

export interface ChronicleEntry { turn: number; year: number; season: string; text: string; infection: number; ci: number }
export interface LogEntry { title: string; label: string; grade: string; tone: Grade["tone"]; final: number }
export type QueueItem = { type: "overflow"; key: GaugeKey } | { type: "aftermath" };
export type Phase = "start" | "event" | "action" | "end" | "over";

export interface Ending {
  type: "victory" | "defeat" | "survive";
  title: string;
  text: string;
  score?: number;
  grade?: string;
}

export interface GameState {
  version: 2;
  seed: number;
  rng: number;
  faction: FactionId;
  turn: number;
  phase: Phase;
  gauges: Record<GaugeKey, number>;
  res: Record<ResourceKey, number>;
  startPop: number;
  infection: Record<RegionId, number>;
  /** 플레이어 세력 감염도 기록(턴 시작 갱신 후 값). 인구 손실은 2턴 전 값(잠복 1턴 → 발병 1턴 → 구울화)을 씁니다. */
  infHist: number[];
  streak: Record<RegionId, number>;
  ciStreak: number;
  wrath: number;
  research: number;
  wall: number;
  voodooPower: number;
  rel: Partial<Record<FactionId, number>>;
  pacts: FactionId[];
  target: RegionId;
  flags: string[];
  ap: number;
  preset: PresetId;
  queue: QueueItem[];
  recent: Record<string, number>;
  events: Card[];
  eventIdx: number;
  startReport: string[];
  endReport: string[];
  aiReport: string[];
  turnLog: LogEntry[];
  chronicle: ChronicleEntry[];
  maxInfection: number;
  tempInf: number;
  ended: Ending | null;
}
export type PresetId = "balance" | "farm" | "trade" | "mine";

export interface RollOutcome {
  dice: number[];
  sum: number;
  statMod: number;
  choiceMod: number;
  stateMod: number;
  final: number;
  rank: number;
  mult: number;
  grade: Grade;
  stat: string;
  applied: AppliedEffect[];
  failApplied: AppliedEffect[];
  aftermath: boolean;
}
export interface AppliedEffect { key: EffectKey | GaugeKey | ResourceKey; label: string; delta: number; good: boolean }
