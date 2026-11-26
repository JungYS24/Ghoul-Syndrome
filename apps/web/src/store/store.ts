import { create } from "zustand";
import { get as idbGet, set as idbSet, del as idbDel } from "idb-keyval";
import {
  LEGACY_PERKS, SEASON_KO, legacyPointsFor, relicById, seasonOf, useRelic, actionsFor, endTurn, enactDecree, migrateState, newGame, npcVisit, repealDecree, resolveNpc, nextTurn, openEvents, resolveAction, resolveEvent, skipEvent, setPreset, setTarget, startTurn, yearOf,
  type Boost, type Difficulty, type FactionId, type GameState, type ImpactDot, type PresetId, type RegionId, type RollOutcome, outcomeLine,
} from "@guul/engine";
import { content } from "@guul/content";
import { addEnding, migrateBook, type EndingBook } from "./share";

// ───────── 실시간 달력 (1초 = 1일) ─────────
export const DAYS_PER_SEASON = 90; // 3개월 × 30일
const SEASON_MONTH = [1, 4, 7, 10]; // 봄·여름·가을·겨울 시작월
export function rtDate(turn: number, dayOffset: number): { year: number; month: number; day: number; season: string } {
  const si = ((turn - 1) % 4 + 4) % 4;
  const d = Math.max(0, Math.min(DAYS_PER_SEASON - 1, Math.floor(dayOffset)));
  return { year: yearOf(turn), month: SEASON_MONTH[si]! + Math.floor(d / 30), day: (d % 30) + 1, season: SEASON_KO[seasonOf(turn)] };
}
export const rtDateStr = (turn: number, dayOffset: number) => { const x = rtDate(turn, dayOffset); return `여신력 ${x.year}년 ${x.month}월 ${x.day}일`; };
/** 실시간 사건 기록 한 줄 — detail 은 결과를 풀어 쓴 한 문장 */
export interface LogEntry2 { id: number; date: string; text: string; tone?: string; detail?: string }
let logSeq = 0;

const SAVE_KEY = "guul-save-v2";
const BOOK_KEY = "guul-endings-v1";
const LEGACY_KEY = "guul-legacy-v1";
const recorded = new Set<string>();
export interface LegacyBook { points: number; perks: string[] }

export type Screen = "title" | "game" | "ending";

interface Store {
  screen: Screen;
  state: GameState | null;
  hasSave: boolean;
  /** 저장된 게임 요약 (이어하기 버튼에 세력·턴 표시) */
  saveInfo: { faction: FactionId; turn: number } | null;
  actedThisAp: boolean;
  // 액션 카드를 펼친 경우
  openAction: string | null;
  /** 호버·포커스 중인 선택지가 영향을 주는 키 (숫자 없이 규모만) */
  preview: ImpactDot[] | null;
  setPreview: (p: ImpactDot[] | null) => void;
  /** 역사의 유산: 모은 점수와 산 보너스 */
  legacy: LegacyBook;
  /** 가장 최근 엔딩으로 얻은 점수 (엔딩 화면 표시용) */
  lastGain: number;
  buyPerk: (id: string) => void;
  useRelicNow: (id: string) => void;
  init: () => Promise<void>;
  start: (f: FactionId, seed: number, difficulty?: Difficulty) => void;
  /** 엔딩 달성 기록 (IndexedDB) */
  book: EndingBook;
  recordEnding: (s: GameState) => void;
  continueSave: () => Promise<void>;
  toTitle: () => void;
  openActionCard: (id: string) => void;
  closeActionCard: () => void;
  enact: (id: string) => void;
  repeal: (id: string) => void;
  setPreset: (p: PresetId) => void;
  setTarget: (t: RegionId) => void;
  // ───────── 실시간 모드 ─────────
  /** 실시간 모드로 플레이 중인지 */
  realtime: boolean;
  /** 시간 배속 (1·2·5·10) */
  speed: number;
  /** 일시정지 */
  paused: boolean;
  /** 자동 진행(관전) */
  auto: boolean;
  /** 판정 결과 잠깐 표시 (실시간: 모달 대신 토스트) */
  flash: { grade: string; tone: string } | null;
  clearFlash: () => void;
  /** 실시간 판정 주사위 연출 (배너 자리에 굴림 → 결과). 떠 있는 동안 시계 멈춤 */
  rtRoll: { outcome: RollOutcome; title: string; label: string; line?: string } | null;
  clearRoll: () => void;
  /** 현재 계절 내 경과 일수 (0~DAYS_PER_SEASON) */
  dayOffset: number;
  rtSetDay: (d: number) => void;
  /** 현재 사건이 팝업으로 떠 있는지 (날짜 시계 멈춤) */
  eventActive: boolean;
  rtSetEventActive: (b: boolean) => void;
  /** 시트(연대기·규칙·설정·상황판)가 열려 있는지 — 실시간 시계를 멈춤 */
  modalOpen: boolean;
  setModalOpen: (b: boolean) => void;
  /** 사건 로그 (지도 아래) */
  rtLog: LogEntry2[];
  rtPushLog: (text: string, tone?: string, detail?: string) => void;
  setSpeed: (n: number) => void;
  togglePause: () => void;
  toggleAuto: () => void;
  rtGoEvents: () => void;
  rtEvent: (i: number, boost?: Boost) => void;
  rtSkip: () => void;
  rtAction: (id: string, i: number, boost?: Boost) => void;
  rtNpc: (i: number, boost?: Boost) => void;
  rtFinishTurn: () => void;
  rtAdvance: () => void;
}

function persist(s: GameState | null) {
  try { if (s && !s.ended) void idbSet(SAVE_KEY, s); else void idbDel(SAVE_KEY); } catch { /* 저장 불가 */ }
}

export const useGame = create<Store>((set, get) => ({
  screen: "title", state: null, hasSave: false, saveInfo: null, actedThisAp: false, openAction: null, preview: null, book: {}, legacy: { points: 0, perks: [] }, lastGain: 0,
  realtime: false, speed: 1, paused: false, auto: false, flash: null, rtRoll: null, dayOffset: 0, eventActive: false, rtLog: [], modalOpen: false,
  setModalOpen(b) { if (get().modalOpen !== b) set({ modalOpen: b }); },
  setPreview(p) { set({ preview: p }); },

  async init() {
    try { const saved = await idbGet<GameState>(SAVE_KEY); set({ hasSave: !!saved, saveInfo: saved ? { faction: saved.faction, turn: saved.turn } : null }); } catch { /* ignore */ }
    try { const book = await idbGet<EndingBook>(BOOK_KEY); if (book) set({ book: migrateBook(book) }); } catch { /* ignore */ }
    try { const lg = await idbGet<LegacyBook>(LEGACY_KEY); if (lg) set({ legacy: lg }); } catch { /* ignore */ }
  },
  recordEnding(s) {
    if (!s.ended) return;
    const key = `${s.seed}:${s.faction}:${s.difficulty}:${s.turn}:${s.ended.id}`;
    if (recorded.has(key)) return;
    recorded.add(key);
    const book = addEnding(get().book, s.ended, s, new Date().toISOString());
    const gain = legacyPointsFor(s);
    const legacy = { ...get().legacy, points: get().legacy.points + gain };
    set({ book, legacy, lastGain: gain });
    try { void idbSet(BOOK_KEY, book); void idbSet(LEGACY_KEY, legacy); } catch { /* 저장 불가 */ }
  },
  async continueSave() {
    try {
      const raw = await idbGet<unknown>(SAVE_KEY); if (!raw) return;
      const saved = migrateState(raw);
      {
        // 날짜는 계절 첫날부터 다시 흐릅니다(남은 사건은 그 계절 안에서 다시 예정일에 뜸).
        logSeq = 0;
        set({ state: saved, screen: saved.ended ? "ending" : "game", openAction: null, realtime: true, speed: 1, paused: false, auto: false, flash: null, rtRoll: null,
          dayOffset: 0, eventActive: false, rtLog: [{ id: ++logSeq, date: rtDateStr(saved.turn, 0), text: "저장한 곳에서 다시 통치를 이어 갑니다." }] });
      }
    } catch { /* ignore */ }
  },
  toTitle() { set({ screen: "title", openAction: null, modalOpen: false, realtime: false, paused: false, auto: false, flash: null, rtRoll: null, eventActive: false, rtLog: [], dayOffset: 0 }); void get().init(); },

  // ───────── 실시간 모드 ─────────
  clearFlash() { set({ flash: null }); },
  clearRoll() { const s = get().state; set({ rtRoll: null, screen: s?.ended ? "ending" : get().screen }); },
  rtSetDay(d) { set({ dayOffset: Math.max(0, Math.min(DAYS_PER_SEASON, d)) }); },
  rtSetEventActive(b) { set({ eventActive: b }); },
  rtPushLog(text, tone, detail) {
    const s = get().state; const date = s ? rtDateStr(s.turn, get().dayOffset) : "";
    set({ rtLog: [...get().rtLog, { id: ++logSeq, date, text, tone, detail }].slice(-120) });
  },
  start(f, seed, difficulty = "base") {
    const s = startTurn(newGame(f, seed, { difficulty, legacy: get().legacy.perks }), content);
    persist(s);
    logSeq = 0;
    const d0 = rtDate(s.turn, 0);
    set({ state: s, screen: s.ended ? "ending" : "game", openAction: null, realtime: true, speed: 1, paused: false, auto: false, flash: null, rtRoll: null,
      dayOffset: 0, eventActive: false, rtLog: [{ id: ++logSeq, date: rtDateStr(s.turn, 0), text: `${d0.season}, 통치가 시작되었습니다.` }] });
  },
  setSpeed(n) { set({ speed: n }); },
  togglePause() { set({ paused: !get().paused }); },
  toggleAuto() { set({ auto: !get().auto }); },
  rtGoEvents() { const s = get().state; if (s && s.phase === "start") { const n = openEvents(s); persist(n); set({ state: n }); } },
  rtEvent(i, boost) {
    const s = get().state; if (!s || get().rtRoll) return;
    const card = s.events[s.eventIdx]; if (!card || !card.choices[i]) return;
    const { state: next, outcome } = resolveEvent(s, i, boost);
    persist(next); const line = outcomeLine(card.choices[i], outcome.final);
    get().rtPushLog(`${card.title} — ${outcome.grade.name}`, outcome.grade.tone, line);
    set({ state: next, eventActive: false, preview: null, rtRoll: { outcome, title: card.title, label: card.choices[i]!.label, line } });
  },
  rtSkip() {
    const s = get().state; if (!s || s.phase !== "event" || get().rtRoll) return;
    const card = s.events[s.eventIdx];
    const n = skipEvent(s); persist(n); get().rtPushLog(`${card ? card.title : "사건"} — 방치했습니다`, "fail");
    set({ state: n, eventActive: false, flash: { grade: "방치", tone: "fail" }, screen: n.ended ? "ending" : "game" });
  },
  rtAction(id, i, boost) {
    const s = get().state; if (!s || s.ap <= 0 || get().rtRoll) return;
    const act = content.actions.find((a) => a.id === id); if (!act || !act.card.choices[i]) return;
    const { state: next, outcome } = resolveAction(s, content, id, i, boost);
    persist(next); const line = outcomeLine(act.card.choices[i], outcome.final);
    get().rtPushLog(`${act.name} — ${outcome.grade.name}`, outcome.grade.tone, line);
    set({ state: next, openAction: null, preview: null, rtRoll: { outcome, title: act.name, label: act.card.choices[i]!.label, line } });
  },
  rtNpc(i, boost) {
    const s = get().state; if (!s || get().rtRoll) return;
    const visit = npcVisit(s); if (!visit || !visit.card.choices[i]) return;
    const { state: next, outcome } = resolveNpc(s, i, boost);
    persist(next); const line = outcomeLine(visit.card.choices[i], outcome.final);
    get().rtPushLog(`연말 알현 · ${visit.npc.name} — ${outcome.grade.name}`, outcome.grade.tone, line);
    set({ state: next, eventActive: false, preview: null, rtRoll: { outcome, title: visit.npc.name, label: visit.card.choices[i]!.label, line } });
  },
  rtFinishTurn() {
    const s = get().state; if (!s || s.phase !== "action") return;
    const n = endTurn(s, content); persist(n);
    if (n.settleHighlight && n.settleDelta) { const v = n.settleDelta[n.settleHighlight]!; get().rtPushLog(`계절 결산 — ${n.settleHighlight} ${v > 0 ? "+" : "−"}${Math.abs(v)}`); }
    if (n.aiReport[0]) get().rtPushLog(`소식 — ${n.aiReport[0]}`);
    set({ state: n, openAction: null, screen: n.ended ? "ending" : "game" });
  },
  rtAdvance() {
    const s = get().state; if (!s) return;
    if (s.ended) { set({ screen: "ending" }); return; }
    const n = nextTurn(s, content); persist(n);
    set({ state: n, dayOffset: 0, eventActive: false, screen: n.ended ? "ending" : "game" });
    const d = rtDate(n.turn, 0);
    get().rtPushLog(`── ${d.year}년 ${d.season} ──`);
  },

  buyPerk(id) {
    const perk = LEGACY_PERKS.find((p) => p.id === id); const lg = get().legacy;
    if (!perk || lg.perks.includes(id) || lg.points < perk.cost) return;
    const next = { points: lg.points - perk.cost, perks: [...lg.perks, id] };
    set({ legacy: next });
    try { void idbSet(LEGACY_KEY, next); } catch { /* 저장 불가 */ }
  },
  useRelicNow(id) {
    const s = get().state; if (!s || s.phase !== "event" || get().rtRoll) return;
    const card = s.events[s.eventIdx]; const relic = relicById(content, id); if (!card || !relic) return;
    let r; try { r = useRelic(s, content, id); } catch { return; }
    persist(r.state);
    const line = outcomeLine(relic.choice, r.outcome.final);
    get().rtPushLog(`${card.title} — ${r.outcome.grade.name} (유물 · ${relic.name})`, r.outcome.grade.tone, line);
    set({ state: r.state, eventActive: false, preview: null, rtRoll: { outcome: r.outcome, title: card.title, label: `유물 · ${relic.name}`, line } });
  },
  openActionCard(id) { set({ openAction: id }); },
  closeActionCard() { set({ openAction: null }); },
  enact(id) { const s = get().state; if (!s) return; try { const n = enactDecree(s, content, id); persist(n); set({ state: n }); } catch { /* 버튼이 막아 둔 경우 */ } },
  repeal(id) { const s = get().state; if (!s) return; try { const n = repealDecree(s, content, id); persist(n); set({ state: n }); } catch { /* ignore */ } },
  setPreset(p) { const s = get().state; if (!s) return; const n = setPreset(s, p); persist(n); set({ state: n }); },
  setTarget(t) { const s = get().state; if (!s) return; const n = setTarget(s, t); persist(n); set({ state: n }); },
}));

export { actionsFor, content };
