// 모바일(lg 미만) 전용 아래쪽 탭 막대. 데스크톱 레이아웃은 건드리지 않습니다.

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
