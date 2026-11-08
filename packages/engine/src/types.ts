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
  /** 연쇄 사건: afterTurns 턴 뒤 cardId 카드를 예약 */
  followUp?: FollowUp;
  /** 판정이 실패가 아니면(최종값 40 이상) 이 유물을 얻음 */
  grantRelic?: string;
}
export interface FollowUp { cardId: string; afterTurns: number }
/** 연쇄로 나온 카드가 이전 판정 등급에 따라 바뀌는 갈래 */
export interface CardBranch {
  prevTones: Tone[];
  title?: string;
  text?: string;
  choices?: Choice[];
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
  /** 연쇄 사건으로 나올 때만 쓰는 갈래 (위에서부터 첫 일치) */
  branches?: CardBranch[];
}
export interface ActionDef {
  id: string;
  name: string;
  desc: string;
  factions: FactionId[];
  when?: When;
  card: Card;
}
export type Tone = "crit" | "great" | "success" | "partial" | "fail" | "fumble" | "after";
export interface Grade { min: number; name: string; tone: Tone }

export type UpkeepKey = "silver" | "strat" | "food" | "prey";
/**
 * 지속 법령 — 행동권 1개로 공포/철회. 공포 중에는 매 계절 종료 결산에서 효과가 적용되고 유지비가 빠집니다.
 * 유지비를 낼 수 없거나 repealWhen 조건이 맞으면 저절로 폐지됩니다.
 */
export interface Decree {
  id: string;
  faction: FactionId;
  name: string;
  desc: string;
  /** 대시보드 아이콘(일러스트 심볼 키) */
  icon: string;
  /** 매 턴 효과 (배율 없이 그대로) */
  effects: Effects;
  /** 매 턴 유지비 (종료 결산 차감) */
  upkeep: Partial<Record<UpkeepKey, number>>;
  /** 매 턴 진노 가산 (도덕적 대가) */
  wrath?: number;
  /** 공포 조건 */
  requires?: When;
  /** 이 조건이 맞으면 종료 결산에서 저절로 폐지 */
  repealWhen?: When;
  /** 해제 조건 설명 */
  repealText?: string;
}
export interface ActiveDecree { id: string; since: number }
/** 예약된 연쇄 사건 */
export interface PendingChain { cardId: string; due: number; from: string; fromTitle: string; label: string; tone: Tone }

export interface GameContent {
  cards: Card[];
  situational: Card[];
  collapse: Card[];
  fixed: Record<string, Card>;
  actions: ActionDef[];
  decrees: Decree[];
  /** 기회의 창 — 가끔 사건 단계 끝에 끼어드는 한 턴짜리 보너스 카드 (없어도 됨) */
  opportunities?: Card[];
  /** 유물 정의 */
  relics?: Relic[];
}
/** 유물 — 사건 단계에서 선택지를 대신해 쓰는 일회용 아이템 (Reigns: Her Majesty 의 아이템 참고) */
export interface Relic {
  id: string;
  faction: CardFaction;
  name: string;
  desc: string;
  /** 사용하면 현재 사건 카드를 이 선택지로 처리하고 사라짐 */
  choice: Choice;
}

export interface ChronicleEntry { turn: number; year: number; season: string; text: string; infection: number; ci: number }
export interface LogEntry { title: string; label: string; grade: string; tone: Grade["tone"]; final: number }
export type QueueItem = { type: "overflow"; key: GaugeKey } | { type: "aftermath" };
export type Phase = "start" | "event" | "action" | "end" | "over";

export interface Ending {
  /** 엔딩 컬렉션 id (endings.ts) */
  id: string;
  type: "victory" | "defeat" | "survive";
  title: string;
  text: string;
  score?: number;
  grade?: string;
}

export interface GameState {
  version: 3;
  difficulty: import("./difficulty").Difficulty;
  /** 판정 기록 (후기용) */
  tally: { rolls: number; great: number; fumble: number };
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
  /** 공포 중인 법령 (최대 MAX_DECREES) */
  decrees: ActiveDecree[];
  /** 한 번이라도 공포한 법령 id (후기용) */
  decreeHistory: string[];
  /** 예약된 연쇄 사건 */
  chains: PendingChain[];
  /** 이미 예약한 연쇄 키 "머리>꼬리" — 한 판에 같은 연쇄는 한 번만 */
  chainsDone: string[];
  ended: Ending | null;
  /** 가진 유물 id (최대 3) */
  relics: string[];
  /** 이 판에 적용된 역사의 유산 id */
  legacy: string[];
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
