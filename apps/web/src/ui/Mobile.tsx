// 모바일(lg 미만) 전용 크롬: 위쪽 고정 상태 줄 + 아래쪽 탭 막대. 데스크톱 레이아웃은 건드리지 않습니다.
import { FACTIONS, GAUGE_LABEL, SEASON_KO, seasonOf, yearOf, type EffectKey, type GameState } from "@guul/engine";
import { Illus } from "../art/Art";
import { useImpactDot } from "./Impact";

const CREST: Record<string, string[]> = { arkandal: ["shield"], iruth: ["snowflake"], voodoo: ["eye"] };
const PHASE_SHORT: Record<GameState["phase"], string> = { start: "시작 결산", event: "사건", action: "행동", end: "종료 결산", over: "결말" };

/** 상태 칸 하나: 이름 · 수치 · (선택지 미리보기 중이면) ▲▼ 화살표 */
function Cell({ k, label, v, hostile }: { k: EffectKey; label: string; v: number; hostile?: boolean }) {
  const dot = useImpactDot(k);
  const danger = hostile ? v >= 61 : v <= 20;
  const arrow = dot ? (dot.dir > 0 ? "▲" : "▼").repeat(Math.min(dot.size, 2)) : "";
  const good = dot ? (dot.dir > 0) !== !!hostile : false;
  return (
    <div className={`grid justify-items-center leading-none py-1 rounded-[2px] ${dot ? "bg-[#2a2216] outline outline-1 outline-gold-dim" : ""}`}>
      <span className="font-ui text-[10px] text-faint whitespace-nowrap">{label}</span>
      <span className={`num text-[15px] mt-0.5 ${danger ? "text-blood" : "text-ink"}`}>{Math.round(v)}</span>
      <span className={`font-ui text-[9px] h-[10px] mt-px ${good ? "text-frost" : "text-[#d98a74]"}`} aria-hidden={!dot}>{arrow}</span>
    </div>
  );
}

/** 화면 위에 붙는 얇은 상태 줄 — 카드를 읽는 동안에도 게이지가 보이고, 선택지를 누르고 있으면 영향 방향이 뜹니다. */
export function MobileHud({ s }: { s: GameState }) {
  const F = FACTIONS[s.faction];
  const phase = s.phase === "event" ? `사건 ${s.eventIdx + 1}/${s.events.length}` : PHASE_SHORT[s.phase];
  return (
    <div className="mobile-hud lg:hidden sticky top-0 z-20 gutter" style={{ paddingTop: "max(6px, env(safe-area-inset-top, 0px))" }}>
      <div className="flex items-center gap-2 min-w-0 pb-1">
        <span className="w-5 h-5 shrink-0"><Illus keys={CREST[s.faction]} faction={s.faction} accent /></span>
        <b className="font-display text-[16px] leading-none truncate">{F.short}</b>
        <span className="font-ui text-[12px] text-muted whitespace-nowrap">{yearOf(s.turn)}년 {SEASON_KO[seasonOf(s.turn)]} · {s.turn}/40</span>
        <span className="ml-auto font-ui text-[11px] text-gold whitespace-nowrap border border-gold-dim rounded-[2px] px-1.5 py-px">{phase}</span>
      </div>
      <div className="grid grid-cols-7 gap-0.5 pb-1">
        <Cell k="infection" label="감염" v={s.infection[s.faction]} hostile />
        {F.gauges.map((k) => <Cell key={k} k={k} label={GAUGE_LABEL[k]} v={s.gauges[k]} />)}
        <Cell k="food" label="식량" v={s.res.food} />
        <Cell k="wrath" label="진노" v={s.wrath} hostile />
      </div>
    </div>
  );
}

export type MobileTab = "board" | "chron" | "rules" | "settings" | "title";
const TABS: { id: MobileTab; label: string; glyph: string }[] = [
  { id: "board", label: "상황판", glyph: "▦" },
  { id: "chron", label: "연대기", glyph: "☰" },
  { id: "rules", label: "규칙", glyph: "§" },
  { id: "settings", label: "설정", glyph: "⚙" },
  { id: "title", label: "처음으로", glyph: "⌂" },
];

/** 화면 아래 탭 막대 — 상황판(지도·자원·법령 등 전체 대시보드)과 시트들을 엽니다. */
export function MobileNav({ onOpen, active }: { onOpen: (t: MobileTab) => void; active: MobileTab | null }) {
  return (
    <nav className="mobile-nav lg:hidden fixed inset-x-0 bottom-0 z-20 grid grid-cols-5" aria-label="게임 메뉴"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)", paddingLeft: "env(safe-area-inset-left, 0px)", paddingRight: "env(safe-area-inset-right, 0px)" }}>
      {TABS.map((t) => (
        <button key={t.id} type="button" onClick={() => onOpen(t.id)} aria-pressed={active === t.id}
          className={`grid justify-items-center gap-0.5 py-2 min-h-[52px] font-ui text-[11px] ${active === t.id ? "text-gold" : "text-muted"}`}>
          <span className="text-[17px] leading-none" aria-hidden="true">{t.glyph}</span>{t.label}
        </button>
      ))}
    </nav>
  );
}
