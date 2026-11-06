// 연말 알현 — 매 연말(겨울 종료) 9명 중 무작위 1명이 군주를 찾아옵니다.
// 플레이어와 같은 소속이면 '내부 신하', 다르면 '외부 사절'로 대사·선택지가 달라집니다.
// 선택지는 일반 사건처럼 5d20 으로 판정하는 일회성 큰 사건입니다.
import { createRng } from "./rng";
import { checkDefeat, resolveChoice } from "./game";
import type { Card, Choice, FactionId, GameState, RollOutcome } from "./types";

interface NpcVariant { title: string; text: string; choices: Choice[] }
export interface Npc {
  id: string; name: string; faction: FactionId; role: string;
  /** 헤더 이미지 id (public/headers/<portrait>.webp) */
  portrait: string;
  same: NpcVariant; diff: NpcVariant;
}

export const NPCS: Npc[] = [
  // ── 아르칸달 ──
  {
    id: "dio", name: "디오 카르만", faction: "arkandal", role: "심연공방주", portrait: "npc-dio",
    same: {
      title: "괴짜 연금술사의 알현", text: "히히힛! 전하, 이 늙은이가 또 희대의 걸작을 만들었습니다. 실링만 좀… 아니 많이 대주신다면 대륙이 놀랄 물건이 나올 겁니다!",
      choices: [
        { label: "연구비를 전액 지원한다", check: { stat: "finance" }, effects: { strat: 40, wall: 12, silver: -60 }, onFail: { silver: -60, order: -10 } },
        { label: "조건부로 소액만 댄다", check: { stat: "order" }, effects: { strat: 15, silver: -20 }, onFail: { silver: -20 } },
        { label: "쫓아낸다", check: { stat: "legit" }, effects: { finance: 6 }, onFail: { morale: -8 } },
      ],
    },
    diff: {
      title: "타국 발명가의 방문", text: "오호, 타국의 군주시여! 이 디오의 발명품에 관심 없으신가? 아르칸달에만 팔기엔 아까운 물건이라서 말이오, 히히.",
      choices: [
        { label: "발명품을 사들인다", check: { stat: "finance" }, effects: { strat: 25, silver: -50, relTo: 12 }, onFail: { silver: -50 }, target: "arkandal" },
        { label: "돌려보낸다", check: { stat: "order" }, effects: {}, onFail: { morale: -5 } },
      ],
    },
  },
  {
    id: "yard", name: "야드", faction: "arkandal", role: "은행장", portrait: "npc-yard",
    same: {
      title: "은행장의 알현", text: "하하, 대단하지 않습니까? 복식부기를 도입하여 세수를 제대로 거두어들이시지요. 숫자는 거짓말을 하지 않습니다.",
      choices: [
        { label: "세제 개혁을 맡긴다", check: { stat: "finance" }, effects: { silver: 70, finance: 12 }, onFail: { morale: -15, order: -10 } },
        { label: "전쟁 국채를 발행한다", check: { stat: "legit" }, effects: { silver: 90 }, onFail: { silver: 40, finance: -15 } },
        { label: "사치를 의심해 감사한다", check: { stat: "order" }, effects: { silver: 30, legit: 8 }, onFail: { legit: -10 } },
      ],
    },
    diff: {
      title: "외국 은행장의 제안", text: "하하, 군주여. 돈은 국경을 가리지 않지요. 아르칸달 은행의 유리한 채를 써 보시는 것은 어떻습니까?",
      choices: [
        { label: "고액의 채권을 사들인다", check: { stat: "finance" }, effects: { silver: 60, relTo: 10 }, onFail: { finance: -20 }, target: "arkandal" },
        { label: "차관을 얻어낸다", check: { stat: "legit" }, effects: { silver: 40, food: 30 }, onFail: { silver: -20 } },
      ],
    },
  },
  {
    id: "kshala", name: "크샬라디오스", faction: "arkandal", role: "공작부인", portrait: "npc-kshala",
    same: {
      title: "공작부인의 알현", text: "호호호, 반가워요 군주여. 이번 해엔 화려한 분수대를 세우는 건 어떨까요? 지친 백성들에게 희망을 줍시다.",
      choices: [
        { label: "화려한 공공사업을 벌인다", check: { stat: "finance" }, effects: { morale: 18, legit: 10, silver: -40 }, onFail: { silver: -40, morale: -6 } },
        { label: "구호소를 연다", check: { stat: "morale" }, effects: { morale: 12, pop: 4, food: -30 }, onFail: { food: -30, infection: 8 } },
        { label: "정중히 사양한다", check: { stat: "legit" }, effects: {}, onFail: { morale: -8 } },
      ],
    },
    diff: {
      title: "아르칸달 사절의 방문", text: "호호, 먼 길을 오셨군요. 아르칸달의 이름으로 작은 선물과 우호를 전하러 왔습니다.",
      choices: [
        { label: "선을 베풀어 화답한다", check: { stat: "legit" }, effects: { relTo: 18, food: 30 }, onFail: { silver: -20 }, target: "arkandal" },
        { label: "구호 물자를 받아 챙긴다", check: { stat: "finance" }, effects: { food: 50, morale: 8 }, onFail: { relTo: -10 }, target: "arkandal" },
      ],
    },
  },
  // ── 아이루스 ──
  {
    id: "imis", name: "이미스", faction: "iruth", role: "북부 변경백", portrait: "npc-imis",
    same: {
      title: "변경백의 알현", text: "자네, 북부가 얼마나 위험한 곳인지 모르는가? 북부의 혹한 구울들을 전부 숙청해오겠네. 군량을 협조해주시게나.",
      choices: [
        { label: "대대적 숙청을 지원한다", check: { stat: "order" }, effects: { infection: -18, army: 2, food: -40 }, onFail: { food: -40, army: -2 } },
        { label: "선별적 방역만 허가한다", check: { stat: "finance" }, effects: { infection: -8, silver: -20 }, onFail: { silver: -20 } },
        { label: "과잉 숙청을 금한다", check: { stat: "legit" }, effects: { morale: 8 }, onFail: { order: -10 } },
      ],
    },
    diff: {
      title: "아이루스 변경백의 방문", text: "군주여. 구울은 시체가 아니라 재앙이오. 경계선을 함께 지키겠다면, 내 빙기사들을 보내리다.",
      choices: [
        { label: "국경 방역 동맹을 맺는다", check: { stat: "legit" }, effects: { infection: -12, relTo: 15 }, onFail: { food: -30 }, target: "iruth" },
        { label: "군량만 넘기고 지켜본다", check: { stat: "finance" }, effects: { relTo: 8, food: -20 }, onFail: { food: -20 } },
      ],
    },
  },
  {
    id: "milione", name: "밀리오네", faction: "iruth", role: "환전대신 · 여명연대장", portrait: "npc-milione",
    same: {
      title: "환전대신의 알현", text: "대공, 벨로링크의 무역 상황이 나빠졌어요. 어서 세수를 더 들여야 합니다… 그러면 우리 여명의 기사들을 약속하지요. 호호.",
      choices: [
        { label: "여명연대와 손잡는다", check: { stat: "finance" }, effects: { army: 3, order: 12, silver: -50 }, onFail: { silver: -50, legit: -12 } },
        { label: "환전 수수료를 개편한다", check: { stat: "finance" }, effects: { silver: 60, research: 8 }, onFail: { silver: 20, morale: -10 } },
        { label: "그녀의 뒷거래를 감시한다", check: { stat: "legit" }, effects: { silver: 25, legit: 8 }, onFail: { order: -12 } },
      ],
    },
    diff: {
      title: "아이루스 대신의 제안", text: "그대껜 우리 여명의 기사들의 협조를 약속하지요. 물론… 공짜는 아닙니다, 호호.",
      choices: [
        { label: "용병 계약을 체결한다", check: { stat: "finance" }, effects: { army: 2, relTo: 10, silver: -50 }, onFail: { silver: -50 }, target: "iruth" },
        { label: "제안을 물리친다", check: { stat: "order" }, effects: {}, onFail: { relTo: -6 }, target: "iruth" },
      ],
    },
  },
  {
    id: "lapis", name: "라피스 아퀼라", faction: "iruth", role: "기사단장 · 용기사", portrait: "npc-lapis",
    same: {
      title: "용기사의 알현", text: "제 정의로운 검이 구울들을 박살낼 겁니다! 대공이시여, 기사단에 출전 명령을 내려 주십시오.",
      choices: [
        { label: "용살을 기반한 토벌을 명한다", check: { stat: "order" }, effects: { infection: -16, morale: 12, wrath: -10 }, onFail: { army: -2, morale: -10 } },
        { label: "연구 호위로 돌린다", check: { stat: "legit" }, effects: { research: 18 }, onFail: { army: -1 } },
        { label: "자제를 명한다", check: { stat: "finance" }, effects: { silver: 20 }, onFail: { morale: -8 } },
      ],
    },
    diff: {
      title: "아이루스 기사단장의 외침", text: "군주여! 세력은 달라도, 구울은 우리 모두의 적입니다. 함께 싸우시겠습니까?",
      choices: [
        { label: "공동 토벌에 참가한다", check: { stat: "order" }, effects: { infection: -14, relTo: 12 }, onFail: { army: -2 }, target: "iruth" },
        { label: "정중히 거절한다", check: { stat: "legit" }, effects: {}, onFail: { relTo: -6 }, target: "iruth" },
      ],
    },
  },
  // ── 부두교 ──
  {
    id: "franci", name: "프란치", faction: "voodoo", role: "라벤 마도학궁 마수학 교수", portrait: "npc-franci",
    same: {
      title: "마수학 교수의 알현", text: "하하, 반갑습니다 대사제여. 새로운 마수학에 대해 알고 싶진 않으신가요? 구울을 더욱 아름답게 다루는 법… 조금 위험하긴 합니다만.",
      choices: [
        { label: "금단의 마수학을 연구시킨다", check: { stat: "faith" }, effects: { control: 15, army: 3 }, onFail: { control: -15, stealth: -10 } },
        { label: "안전한 범위만 허가한다", check: { stat: "control" }, effects: { control: 8, prey: 15 }, onFail: {} },
        { label: "위험하다며 막는다", check: { stat: "stealth" }, effects: { stealth: 8 }, onFail: { faith: -8 } },
      ],
    },
    diff: {
      title: "수상한 학자의 속삭임", text: "하하, 저는 그저 한 명의 학자일 뿐입니다… 구울을 다루는 새로운 학문에 관심 없으십니까? 쉿, 비밀로 해드리죠.",
      choices: [
        { label: "금단의 지식을 산다", check: { stat: "finance" }, effects: { research: 15, strat: 15 }, onFail: { silver: -40, infection: 8 } },
        { label: "첩자로 체포한다", check: { stat: "order" }, effects: { voodooPower: -12, legit: 8 }, onFail: { infection: 8 } },
        { label: "내쫓는다", check: { stat: "legit" }, effects: {}, onFail: { infection: 6 } },
      ],
    },
  },
  {
    id: "cruill", name: "크루일 크림슨", faction: "voodoo", role: "마룡대공", portrait: "npc-cruill",
    same: {
      title: "마룡대공의 알현", text: "하하하, 대사제. 내 마룡대를 빌려주길 바라나? 대가는… 그대가 내 앞에서 얼마나 고개를 숙이느냐에 달렸지.",
      choices: [
        { label: "마룡대에 전권을 위임한다", check: { stat: "faith" }, effects: { army: 5, target: 12 }, onFail: { control: -18 } },
        { label: "대등하게 협상한다", check: { stat: "control" }, effects: { army: 2, control: 10 }, onFail: { faith: -12 } },
        { label: "오만함을 꺾는다", check: { stat: "stealth" }, effects: { control: 15 }, onFail: { stealth: -15, wrath: 10 } },
      ],
    },
    diff: {
      title: "마룡대공의 도발", text: "하하하, 자네 날 감당할 수 있겠나? 부두교는 나의 손에 있다. 항복한다면… 재미없겠지.",
      choices: [
        { label: "마룡대와 정면으로 맞선다", check: { stat: "order" }, effects: { voodooPower: -15, legit: 10 }, onFail: { army: -3, infection: 10 } },
        { label: "뒤로 밀약을 맺는다", check: { stat: "legit" }, effects: { silver: 40, infection: -12 }, onFail: { legit: -15 } },
        { label: "도발에 응하지 않는다", check: { stat: "finance" }, effects: { army: 1 }, onFail: { morale: -10 } },
      ],
    },
  },
  {
    id: "kobiko", name: "코비코 크림슨", faction: "voodoo", role: "마룡공주", portrait: "npc-kobiko",
    same: {
      title: "마룡공주의 알현", text: "히히 안녕? 나랑 구울폭죽놀이 하고 놀래? 재밌겠다, 그치!",
      choices: [
        { label: "구울폭죽 축제를 열어준다", check: { stat: "faith" }, effects: { faith: 15, prey: 20, stealth: -10 }, onFail: { infection: 12, wrath: 10 } },
        { label: "장난을 안전하게 관리한다", check: { stat: "control" }, effects: { control: 10, faith: 6 }, onFail: {} },
        { label: "엄하게 타이른다", check: { stat: "stealth" }, effects: { stealth: 8 }, onFail: { faith: -12 } },
      ],
    },
    diff: {
      title: "마룡공주의 장난", text: "히히, 안녕? 아저씨네 마을에서 구울폭죽 터뜨렸어! 화났어? 키히히.",
      choices: [
        { label: "달래서 돌려보낸다", check: { stat: "legit" }, effects: { infection: -4 }, onFail: { infection: 12, pop: -2 } },
        { label: "인질로 잡아 흥정한다", check: { stat: "order" }, effects: { voodooPower: -15, silver: 30 }, onFail: { infection: 15, army: -2 } },
        { label: "군대로 구울을 소탕한다", check: { stat: "order" }, effects: { infection: -10, morale: 8 }, onFail: { army: -3 } },
      ],
    },
  },
];

/** 연말(겨울 종료)인지 — 4·8·…·36턴 (40턴 종료는 엔딩이라 제외) */
export function isNpcYear(turn: number): boolean { return turn % 4 === 0 && turn >= 4 && turn < 40; }
const doneFlag = (turn: number) => `npc-${turn}`;
export function npcDone(s: GameState): boolean { return s.flags.includes(doneFlag(s.turn)); }

/** 이번 연말에 찾아온 NPC와 보여줄 카드(소속 분기). 아니면 null. 시드·턴으로 결정되어 리플레이가 같습니다. */
export function npcVisit(s: GameState): { npc: Npc; card: Card; same: boolean } | null {
  if (!isNpcYear(s.turn) || npcDone(s)) return null;
  const r = createRng(((s.seed >>> 0) ^ Math.imul(s.turn, 0x9e3779b1)) >>> 0);
  const npc = NPCS[Math.floor(r.next() * NPCS.length)]!;
  const same = npc.faction === s.faction;
  const v = same ? npc.same : npc.diff;
  const card: Card = { id: npc.portrait, faction: "common", kind: `연말 알현 · ${npc.name}`, title: v.title, text: v.text, choices: v.choices };
  return { npc, card, same };
}

/** 연말 알현 선택지를 판정합니다(입력 불변). 해결 후 올해 재등장하지 않도록 표시합니다. */
export function resolveNpc(state: GameState, choiceIndex: number): { state: GameState; outcome: RollOutcome } {
  const visit = npcVisit(state);
  if (!visit) throw new Error("연말 알현이 없습니다");
  const choice = visit.card.choices[choiceIndex];
  if (!choice) throw new Error("선택지가 없습니다");
  const r = resolveChoice(state, visit.card, choice, createRng(state.rng));
  if (!r.state.flags.includes(doneFlag(state.turn))) r.state.flags.push(doneFlag(state.turn));
  const d = checkDefeat(r.state);
  if (d) { r.state.ended = d; r.state.phase = "over"; }
  return r;
}
