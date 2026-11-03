import { create } from "zustand";
import { get as idbGet, set as idbSet, del as idbDel } from "idb-keyval";
import {
  actionsFor, endTurn, newGame, nextTurn, openEvents, resolveAction, resolveEvent, setPreset, setTarget, startTurn,
  type FactionId, type GameState, type PresetId, type RegionId, type RollOutcome,
} from "@guul/engine";
import { content } from "@guul/content";

const SAVE_KEY = "guul-save-v2";

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
  init: () => Promise<void>;
  start: (f: FactionId, seed: number) => void;
  continueSave: () => Promise<void>;
  toTitle: () => void;
  goEvents: () => void;
  chooseEvent: (i: number) => void;
  openActionCard: (id: string) => void;
  closeActionCard: () => void;
  chooseAction: (id: string, i: number) => void;
  finishTurn: () => void;
  advance: () => void;
  setPreset: (p: PresetId) => void;
  setTarget: (t: RegionId) => void;
  dismissDice: () => void;
}

function persist(s: GameState | null) {
  try { if (s && !s.ended) void idbSet(SAVE_KEY, s); else void idbDel(SAVE_KEY); } catch { /* 저장 불가 */ }
}

export const useGame = create<Store>((set, get) => ({
  screen: "title", state: null, dice: null, hasSave: false, actedThisAp: false, openAction: null,

  async init() {
    try { const saved = await idbGet<GameState>(SAVE_KEY); set({ hasSave: !!saved }); } catch { /* ignore */ }
  },
  start(f, seed) {
    const s = startTurn(newGame(f, seed), content);
    persist(s);
    set({ state: s, screen: s.ended ? "ending" : "game", openAction: null });
  },
  async continueSave() {
    try { const saved = await idbGet<GameState>(SAVE_KEY); if (saved) set({ state: saved, screen: saved.ended ? "ending" : "game" }); } catch { /* ignore */ }
  },
  toTitle() { set({ screen: "title", openAction: null }); void get().init(); },

  goEvents() { const s = get().state; if (s && s.phase === "start") { const n = openEvents(s); persist(n); set({ state: n }); } },

  chooseEvent(i) {
    const s = get().state; if (!s) return;
    const card = s.events[s.eventIdx]; if (!card) return;
    const { state: next, outcome } = resolveEvent(s, i);
    set({ dice: { outcome, cardTitle: card.title, choiceLabel: card.choices[i]!.label, onClose: () => { persist(next); set({ state: next, dice: null, screen: next.ended ? "ending" : "game" }); } } });
  },

  openActionCard(id) { set({ openAction: id }); },
  closeActionCard() { set({ openAction: null }); },
  chooseAction(id, i) {
    const s = get().state; if (!s || s.ap <= 0) return;
    const act = content.actions.find((a) => a.id === id); if (!act) return;
    const { state: next, outcome } = resolveAction(s, content, id, i);
    set({ dice: { outcome, cardTitle: act.name, choiceLabel: act.card.choices[i]!.label, onClose: () => { persist(next); set({ state: next, dice: null, openAction: null, screen: next.ended ? "ending" : "game" }); } } });
  },

  finishTurn() { const s = get().state; if (!s) return; const n = endTurn(s); persist(n); set({ state: n, screen: n.ended ? "ending" : "game" }); },
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
