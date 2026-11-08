import { useRef, useState } from "react";
import { FACTIONS, PRESETS, foodUseOf, preyUse, type EffectKey, type GameState, type PresetId } from "@guul/engine";
import { useImpactDot } from "./Impact";
import { useGame } from "../store/store";

/** 징수 칙령 — 4단 레버. 상태는 s.preset 하나이며 종료 결산에서 인구 배분이 이 값으로 적용됩니다. */
const EDICTS: { id: PresetId; title: string; tag: string }[] = [
  { id: "balance", title: "균형 징수령", tag: "곡식·은·광석을 고르게 거둔다" },
  { id: "farm", title: "곡물 징발령", tag: "밭을 늘리고 장인은 줄인다" },
  { id: "trade", title: "시장세 칙령", tag: "상인의 은을 더 짜낸다" },
  { id: "mine", title: "광역 징용령", tag: "갱도에 사람을 밀어 넣는다" },
];
const NOTCH = 38;

function LeverEdict({ s }: { s: GameState }) {
  const setPreset = useGame((z) => z.setPreset);
  const idx = Math.max(0, EDICTS.findIndex((e) => e.id === s.preset));
  const [gen, setGen] = useState(0);
  const first = useRef(true);
  const pick = (id: PresetId) => { if (id !== s.preset) { first.current = false; setGen((g) => g + 1); setPreset(id); } };
  const P = PRESETS[s.preset];
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const n = Math.min(EDICTS.length - 1, Math.max(0, idx + (e.key === "ArrowDown" ? 1 : -1)));
    pick(EDICTS[n]!.id);
  };
  return (
    <div className="grid grid-cols-[64px_1fr] gap-3 items-stretch" data-testid="lever-edict">
      {/* 철제 레일과 레버 */}
      <div role="radiogroup" aria-label="징수 칙령" onKeyDown={onKey} className="relative inset-slab" style={{ height: NOTCH * EDICTS.length + 8 }}>
        <span className="absolute left-1/2 top-3 bottom-3 w-[6px] -ml-[3px] bg-[#0d0a08] shadow-[inset_0_0_3px_#000,0_0_0_1px_#4a4439]" aria-hidden="true" />
        {EDICTS.map((e, i) => (
          <button key={e.id} type="button" role="radio" aria-checked={i === idx} aria-label={e.title} tabIndex={i === idx ? 0 : -1} onClick={() => pick(e.id)}
            className="absolute left-0 right-0 grid place-items-center" style={{ top: 4 + i * NOTCH, height: NOTCH }}>
            <i className={`block w-[26px] h-[3px] ${i === idx ? "bg-gold" : "bg-[#4a4439]"}`} style={{ boxShadow: "0 1px 0 #000" }} />
          </button>
        ))}
        <span key={gen} className={`lever-knob pointer-events-none absolute left-1/2 -ml-[17px] w-[34px] ${first.current ? "" : "clunk"}`} style={{ top: 4 + idx * NOTCH + (NOTCH - 26) / 2, transform: "translateY(0)", height: 26 }} aria-hidden="true">
          <i className="block w-full h-full rounded-[2px]" style={{ background: "radial-gradient(circle at 35% 30%, #d6bd7c, #8b7355 55%, #3d3126)", boxShadow: "0 3px 4px #000, inset 0 1px 0 rgba(255,240,190,.5), inset 0 -2px 3px rgba(0,0,0,.6)" }} />
        </span>
      </div>
      {/* 칙령서 */}
      <div className="parchment torn pl-3.5 pr-14 py-3 grid gap-1 content-start" style={{ minHeight: NOTCH * EDICTS.length + 8 }}>
        <span className="font-ui text-[10px] tracking-[0.2em] text-[#4a3a22]">징수 칙령서</span>
        <b key={s.preset} className="font-display text-[20px] leading-tight stamp-in-text" style={{ color: "#3a2a18", textShadow: "0 1px 0 rgba(255,245,210,.35)" }}>{EDICTS[idx]!.title}</b>
        <span className="text-[13px] text-[#3f3220]">{EDICTS[idx]!.tag}</span>
        <span className="font-ui text-[12px] text-[#4a3a22] tabular-nums">농 {Math.round(P.agri * 100)} · 상 {Math.round(P.comm * 100)} · 광 {Math.round(P.mine * 100)} <span className="text-[#5a4628]">(종료 결산 적용)</span></span>
        <span key={gen} className={`absolute right-3 bottom-3 w-[38px] h-[38px] grid place-items-center text-[#f2c9bd] text-[15px] font-display ${first.current ? "" : "stamp-in"}`}
          style={{ borderRadius: "46% 54% 50% 50% / 52% 48% 52% 48%", background: "radial-gradient(circle at 36% 30%, #b83a2c 0 12%, #7a1a14 50%, #4a0c09)", boxShadow: "0 2px 3px rgba(0,0,0,.6), inset 0 -2px 3px rgba(0,0,0,.5)", opacity: .9, transform: "rotate(-8deg)" }} aria-hidden="true">印</span>
      </div>
    </div>
  );
}

const ARROW = { 1: ["▲", "▲▲", "▲▲▲"], "-1": ["▼", "▼▼", "▼▼▼"] } as const;
function Plate({ name, value, low, k }: { name: string; value: string; low: boolean; k: EffectKey }) {
  const dot = useImpactDot(k);
  return (
    <div className={`nameplate ${low ? "low" : ""} ${dot ? (dot.dir > 0 ? "plate-up" : "plate-down") : ""}`} data-res={k}>
      <small>{name}{dot && <span className={`ml-1 text-[10px] ${dot.dir > 0 ? "text-[#a9c0a2]" : "text-[#e0907a]"}`}>{ARROW[dot.dir > 0 ? 1 : "-1"][dot.size - 1]}</span>}</small><b>{value}</b>
    </div>
  );
}

/** 상단 자원 선반(나무 판 위의 철제 명판 6개) + 징수 칙령 레버. 식량·광석·정화석은 t, 실링·인구·병력은 만. */
export function ResourcePanel({ s }: { s: GameState }) {
  const F = FACTIONS[s.faction];
  const V = s.faction === "voodoo";
  const fu = foodUseOf(s);
  const t = (n: number) => `${Math.round(n)}t`;
  const plates: [string, string, boolean, EffectKey][] = V
    ? [
        [F.popName, s.res.pop.toFixed(1) + "만", s.res.pop <= s.startPop * 0.3, "pop"],
        [F.armyName, s.res.army.toFixed(1) + "만", false, "army"],
        ["식량", t(s.res.food), s.res.food < fu * 2.5, "food"],
        ["먹이", t(s.res.prey), s.res.prey < preyUse(s.res.army) * 2.5, "prey"],
        ["실링", `${Math.round(s.res.silver)}만`, s.res.silver < 10, "silver"],
        [F.stratName, t(s.res.strat), false, "strat"],
      ]
    : [
        [F.popName, s.res.pop.toFixed(1) + "만", s.res.pop <= s.startPop * 0.3, "pop"],
        [F.armyName, s.res.army.toFixed(1) + "만", false, "army"],
        ["식량", t(s.res.food), s.res.food < fu * 2.5, "food"],
        ["실링", `${Math.round(s.res.silver)}만`, s.res.silver < 10, "silver"],
        ["광석", t(s.res.strat), false, "strat"],
        ["정화석", t(s.res.stone), s.res.stone < 4, "stone"],
      ];
  return (
    <div className="grid gap-3.5" data-testid="resource-panel">
      <div className="grid gap-2.5">
        <h3 className="eyebrow">비축 자원</h3>
        <div className="plank pt-[18px]">
          <div className="grid grid-cols-3 gap-x-2 gap-y-3.5">
            {plates.map(([n, v, low, k]) => <Plate key={n} name={n} value={v} low={low} k={k} />)}
          </div>
        </div>
        <span className="font-ui text-[11px] text-faint tabular-nums">계절마다 식량 {fu.toFixed(1)}t{V ? ` · 먹이 ${preyUse(s.res.army).toFixed(1)}t` : ""} 소비{V ? "" : " · 광석은 무구·방벽, 정화석은 오염 정화에 씁니다"}</span>
      </div>
      <div className="grid gap-2">
        <h3 className="eyebrow">징수 칙령 (레버)</h3>
        <LeverEdict s={s} />
      </div>
    </div>
  );
}
