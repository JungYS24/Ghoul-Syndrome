import { create } from "zustand";
import { get as idbGet, set as idbSet, del as idbDel } from "idb-keyval";
import {
  actionsFor, endTurn, enactDecree, migrateState, newGame, repealDecree, nextTurn, openEvents, resolveAction, resolveEvent, setPreset, setTarget, startTurn,
  type Difficulty, type FactionId, type GameState, type ImpactDot, type PresetId, type RegionId, type RollOutcome,
} from "@guul/engine";
import { content } from "@guul/content";
import { addEnding, type EndingBook } from "./share";

const SAVE_KEY = "guul-save-v2";
const BOOK_KEY = "guul-endings-v1";
const recorded = new Set<string>();

export type Screen = "title" | "game" | "ending";
interface DicePayload { outcome: RollOutcome; cardTitle: string; choiceLabel: string; onClose: () => void }

interface Store {
  screen: Screen;
  state: GameState | null;
  dice: DicePayload | null;
  hasSave: boolean;
  actedThisAp: boolean;
  // 액션 카드를 펼친 경우
  openAction: string | null;
  /** 스와이프/호버 중인 선택지가 영향을 주는 키 (숫자 없이 규모만) */
  preview: ImpactDot[] | null;
  setPreview: (p: ImpactDot[] | null) => void;
  init: () => Promise<void>;
  start: (f: FactionId, seed: number, difficulty?: Difficulty) => void;
  /** 엔딩 달성 기록 (IndexedDB) */
  book: EndingBook;
  recordEnding: (s: GameState) => void;
  continueSave: () => Promise<void>;
  toTitle: () => void;
  goEvents: () => void;
  chooseEvent: (i: number) => void;
  openActionCard: (id: string) => void;
  closeActionCard: () => void;
  chooseAction: (id: string, i: number) => void;
  finishTurn: () => void;
  enact: (id: string) => void;
  repeal: (id: string) => void;
  advance: () => void;
  setPreset: (p: PresetId) => void;
  setTarget: (t: RegionId) => void;
  dismissDice: () => void;
}

function persist(s: GameState | null) {
  try { if (s && !s.ended) void idbSet(SAVE_KEY, s); else void idbDel(SAVE_KEY); } catch { /* 저장 불가 */ }
}

export const useGame = create<Store>((set, get) => ({
  screen: "title", state: null, dice: null, hasSave: false, actedThisAp: false, openAction: null, preview: null, book: {},
  setPreview(p) { set({ preview: p }); },

  async init() {
    try { const saved = await idbGet<GameState>(SAVE_KEY); set({ hasSave: !!saved }); } catch { /* ignore */ }
    try { const book = await idbGet<EndingBook>(BOOK_KEY); if (book) set({ book }); } catch { /* ignore */ }
  },
  recordEnding(s) {
    if (!s.ended) return;
    const key = `${s.seed}:${s.faction}:${s.difficulty}:${s.turn}:${s.ended.id}`;
    if (recorded.has(key)) return;
    recorded.add(key);
    const book = addEnding(get().book, s.ended, s, new Date().toISOString());
    set({ book });
    try { void idbSet(BOOK_KEY, book); } catch { /* 저장 불가 */ }
  },
  start(f, seed, difficulty = "normal") {
    const s = startTurn(newGame(f, seed, { difficulty }), content);
    persist(s);
    set({ state: s, screen: s.ended ? "ending" : "game", openAction: null });
  },
  async continueSave() {
    try { const raw = await idbGet<unknown>(SAVE_KEY); if (raw) { const saved = migrateState(raw); set({ state: saved, screen: saved.ended ? "ending" : "game" }); } } catch { /* ignore */ }
  },
  toTitle() { set({ screen: "title", openAction: null }); void get().init(); },

  goEvents() { const s = get().state; if (s && s.phase === "start") { const n = openEvents(s); persist(n); set({ state: n }); } },

  chooseEvent(i) {
    const s = get().state; if (!s) return;
    const card = s.events[s.eventIdx]; if (!card) return;
    const { state: next, outcome } = resolveEvent(s, i);
    set({ preview: null, dice: { outcome, cardTitle: card.title, choiceLabel: card.choices[i]!.label, onClose: () => { persist(next); set({ state: next, dice: null, screen: next.ended ? "ending" : "game" }); } } });
  },

  openActionCard(id) { set({ openAction: id }); },
  closeActionCard() { set({ openAction: null }); },
  chooseAction(id, i) {
    const s = get().state; if (!s || s.ap <= 0) return;
    const act = content.actions.find((a) => a.id === id); if (!act) return;
    const { state: next, outcome } = resolveAction(s, content, id, i);
    set({ preview: null, dice: { outcome, cardTitle: act.name, choiceLabel: act.card.choices[i]!.label, onClose: () => { persist(next); set({ state: next, dice: null, openAction: null, screen: next.ended ? "ending" : "game" }); } } });
  },

  finishTurn() { const s = get().state; if (!s) return; const n = endTurn(s, content); persist(n); set({ state: n, screen: n.ended ? "ending" : "game" }); },
  enact(id) { const s = get().state; if (!s) return; try { const n = enactDecree(s, content, id); persist(n); set({ state: n }); } catch { /* 버튼이 막아 둔 경우 */ } },
  repeal(id) { const s = get().state; if (!s) return; try { const n = repealDecree(s, content, id); persist(n); set({ state: n }); } catch { /* ignore */ } },
  advance() {
    const s = get().state; if (!s) return;
    if (s.ended) { set({ screen: "ending" }); return; }
    const n = nextTurn(s, content); persist(n); set({ state: n, screen: n.ended ? "ending" : "game" });
  },
  setPreset(p) { const s = get().state; if (!s) return; const n = setPreset(s, p); persist(n); set({ state: n }); },
  setTarget(t) { const s = get().state; if (!s) return; const n = setTarget(s, t); persist(n); set({ state: n }); },
  dismissDice() { get().dice?.onClose(); },
}));

export { actionsFor, content };
