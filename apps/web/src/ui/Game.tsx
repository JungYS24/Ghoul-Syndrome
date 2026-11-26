// 게임 화면 — 실시간 모드 하나만 있습니다. 1초 = 1일로 날짜가 흐르고, 사건은 우측 배너 자리에 뜹니다.
import { useEffect, useState } from "react";
import type { GameState } from "@guul/engine";
import { useGame } from "../store/store";
import { Dashboard } from "./Dashboard";
import { ChronicleSheet, RulesSheet, SettingsSheet, Sheet } from "./Sheets";
import { MobileNav, type MobileTab } from "./Mobile";
import { Onboarding } from "./Onboarding";
import { WarPanel } from "./War";
import { RealtimeDriver, RealtimeTopBar, RealtimeSlot, RealtimeFlash, RealtimeActionHint, EventLog } from "./Realtime";

export function Game({ s }: { s: GameState }) {
  const toTitle = useGame((z) => z.toTitle);
  const [sheet, setSheet] = useState<null | "chron" | "rules" | "settings" | "board">(null);
  const openTab = (t: MobileTab) => { if (t === "title") toTitle(); else setSheet(sheet === t ? null : t); };
  // 시트가 열려 있는 동안 날짜 시계와 제한시간을 멈춤
  const setModalOpen = useGame((z) => z.setModalOpen);
  useEffect(() => { setModalOpen(sheet !== null); }, [sheet, setModalOpen]);
  useEffect(() => () => setModalOpen(false), [setModalOpen]);

  return (
    <>
      <RealtimeDriver />
      <section className="gutter max-w-[1180px] mx-auto pt-3 pb-28 lg:pb-10">
        <RealtimeTopBar s={s} menu={<>
          <button className="btn !px-2 !py-1 !text-[12px]" onClick={() => setSheet("chron")}>연대기</button>
          <button className="btn !px-2 !py-1 !text-[12px]" onClick={() => setSheet("rules")}>규칙</button>
          <button className="btn !px-2 !py-1 !text-[12px]" onClick={() => setSheet("settings")}>설정</button>
          <button className="btn !px-2 !py-1 !text-[12px]" onClick={toTitle}>처음으로</button>
        </>} />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,540px)] items-start">
          <div className="grid gap-3 order-last lg:order-none">
            <WarPanel s={s} />
            <Onboarding key={s.seed} s={s} />
            <RealtimeActionHint s={s} />
            <Dashboard s={s} />
          </div>
          {/* 우측: 배너 자리(결정이 없으면 지도) + 사건 기록. 데스크톱에선 화면에 붙어 따라옴 */}
          <div className="grid gap-3 lg:sticky lg:top-[64px] lg:max-h-[calc(100vh-72px)] lg:overflow-y-auto lg:overflow-x-hidden lg:pr-1">
            <RealtimeSlot s={s} />
            <EventLog />
          </div>
        </div>
      </section>
      <RealtimeFlash />
      {sheet === "chron" && <ChronicleSheet s={s} onClose={() => setSheet(null)} />}
      {sheet === "rules" && <RulesSheet onClose={() => setSheet(null)} />}
      {sheet === "settings" && <SettingsSheet onClose={() => setSheet(null)} />}
      {sheet === "board" && <Sheet title="상황판" onClose={() => setSheet(null)}><Dashboard s={s} className="!p-3" /></Sheet>}
      <MobileNav onOpen={openTab} active={sheet} />
    </>
  );
}
