// 게임 진행(실시간): 지도 중심 레이아웃. 1초=1일(배속 적용)로 날짜가 흐르고,
// 사건은 예정된 날에 우측 배너 자리에 떠(그동안 날짜 시계 멈춤) 15초 제한시간 안에 선택 — 배속과 무관.
// 지도 아래엔 사건 로그가 쌓이고, 우측 상단에 날짜·배속 컨트롤.
import { useEffect, useRef, useState } from "react";
import { DIFFICULTIES, FACTIONS, REGION_NAME, actionsFor, canAfford, decreeById, josa, npcVisit, successChance, suggestPlays, WAR_PREP_ID, WAR_RAID_ID, WAR_PRESSURE_ID, warActionCard, warPrepCard, type Choice, type GameState, type RegionId } from "@guul/engine";
import { DAYS_PER_SEASON, content, rtDate, useGame } from "../store/store";
import { clockFrozen, deadlineMs } from "../store/rtClock";
import { BannerCard } from "./BannerCard";
import { WorldMap } from "./WorldMap";
import { RealtimeRoll } from "./D20Roll";
import { SurrenderButton, WarNoticeBanner } from "./War";
import { Dashboard } from "./Dashboard";
import { Illus } from "../art/Art";
import { ActiveDecreeBar, DecreePlay } from "./Decrees";
import { RelicBar } from "./RelicBar";

const SPEEDS = [1, 2, 5, 10];
const EV_START = 5, EV_SPAN = 60;          // 사건은 5~65일에 분산
const triggerDay = (i: number, n: number) => Math.round(EV_START + ((i + 0.5) / Math.max(1, n)) * EV_SPAN);
const CREST: Record<string, string[]> = { arkandal: ["shield"], iruth: ["snowflake"], voodoo: ["eye"] };

function bestChoice(s: GameState, choices: Choice[]): number {
  let bi = 0, best = -1;
  choices.forEach((c, i) => { if (!canAfford(s, c)) return; const p = successChance(s, c); if (p > best) { best = p; bi = i; } });
  return bi;
}
function bestAction(s: GameState): { id: string; i: number } | null {
  let pick: { id: string; i: number } | null = null, best = -1;
  for (const a of actionsFor(s, content)) a.card.choices.forEach((c, i) => { if (!canAfford(s, c)) return; const p = successChance(s, c); if (p > best) { best = p; pick = { id: a.id, i }; } });
  return pick;
}

// ───────── 날짜 클록 구동 ─────────
export function RealtimeDriver() {
  const realtime = useGame((z) => z.realtime);
  const accRef = useRef(0), lastRef = useRef(0);
  useEffect(() => {
    if (!realtime) return;
    let raf = 0; lastRef.current = performance.now();
    const loop = () => {
      const now = performance.now(); const dt = now - lastRef.current; lastRef.current = now;
      const st = useGame.getState(); const s = st.state;
      if (s && st.realtime && st.screen === "game" && !s.ended && !clockFrozen(st)) {
        const npc = s.phase === "end" ? npcVisit(s) : null;
        const decision = st.eventActive || !!st.openAction || !!npc;
        if (!decision) {
          if (s.phase === "start") { st.rtGoEvents(); accRef.current = 0; }
          else if (s.phase === "event") {
            if (st.dayOffset >= triggerDay(s.eventIdx, s.events.length)) st.rtSetEventActive(true);
            else { accRef.current += (dt / 1000) * st.speed; if (accRef.current >= 1) { const a = Math.floor(accRef.current); accRef.current -= a; st.rtSetDay(st.dayOffset + a); } }
          } else if (s.phase === "action") {
            if (st.dayOffset >= DAYS_PER_SEASON) { st.rtFinishTurn(); accRef.current = 0; }
            else { accRef.current += (dt / 1000) * st.speed; if (accRef.current >= 1) { const a = Math.floor(accRef.current); accRef.current -= a; st.rtSetDay(Math.min(DAYS_PER_SEASON, st.dayOffset + a)); } }
          } else if (s.phase === "end") { st.rtAdvance(); accRef.current = 0; }
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [realtime]);
  return null;
}

// ───────── 제한시간 게이지 ─────────
function DeadlineBar({ onTimeout, onAuto }: { onTimeout: () => void; onAuto: () => void }) {
  const [remain, setRemain] = useState(1);
  const [budget, setBudget] = useState(0);
  const leftRef = useRef(0), lastRef = useRef(0), firedRef = useRef(false);
  useEffect(() => {
    const st0 = useGame.getState();
    const bud = deadlineMs(st0.auto, st0.speed);
    leftRef.current = bud; lastRef.current = performance.now(); firedRef.current = false; setBudget(bud);
    let raf = 0;
    const loop = () => {
      const now = performance.now(); const dt = now - lastRef.current; lastRef.current = now;
      const st = useGame.getState();
      if (!clockFrozen(st)) {
        leftRef.current -= dt; setRemain(Math.max(0, leftRef.current / bud));
        if (leftRef.current <= 0 && !firedRef.current) { firedRef.current = true; (st.auto ? onAuto : onTimeout)(); return; }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const secs = Math.ceil((remain * budget) / 1000);
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-2">
      <div className="h-1.5 bg-[#100d0b] border border-line rounded-[1px] overflow-hidden" aria-hidden="true">
        <i className={`block h-full ${remain < 0.3 ? "bg-blood" : "bg-gold"}`} style={{ width: `${Math.round(remain * 100)}%`, transition: "width .1s linear" }} />
      </div>
      <span className={`font-ui text-[12px] tabular-nums ${remain < 0.3 ? "text-blood" : "text-muted"}`} aria-live="off">{secs}초</span>
    </div>
  );
}

// ───────── 사건/행동/알현 배너 (우측 배너 자리, 비모달) ─────────
// 팝업으로 화면을 덮지 않아, 선택지에 마우스를 올리면 좌측 대시보드의 자원·게이지 변화가 그대로 보입니다.
export function RealtimeSlot({ s }: { s: GameState }) {
  const rolling = useGame((z) => !!z.rtRoll);
  const notice = useGame((z) => !!z.rtNotice);
  if (rolling) return <RealtimeRoll s={s} />;
  if (notice) return <WarNoticeBanner />;
  return <RealtimeDecision s={s} fallback={<WorldMap s={s} />} />;
}
function RealtimeDecision({ s, fallback }: { s: GameState; fallback: React.ReactNode }) {
  const setPreview = useGame((z) => z.setPreview);
  const openAction = useGame((z) => z.openAction);
  const eventActive = useGame((z) => z.eventActive);
  const rtEvent = useGame((z) => z.rtEvent);
  const rtSkip = useGame((z) => z.rtSkip);
  const rtAction = useGame((z) => z.rtAction);
  const rtWarPrep = useGame((z) => z.rtWarPrep);
  const rtWarAction = useGame((z) => z.rtWarAction);
  const rtNpc = useGame((z) => z.rtNpc);
  const closeActionCard = useGame((z) => z.closeActionCard);
  const auto = useGame((z) => z.auto);

  const npc = s.phase === "end" ? npcVisit(s) : null;
  let kind: "event" | "action" | "npc" | null = null;
  if (openAction) kind = "action";
  else if (eventActive && s.phase === "event") kind = "event";
  else if (npc) kind = "npc";
  const bannerKey = kind === "action" ? `act-${openAction}` : kind === "event" ? `ev-${s.turn}-${s.eventIdx}` : kind === "npc" ? `npc-${s.turn}` : "none";
  // 배너가 바뀌거나 사라지면 남아 있던 미리보기를 지움
  useEffect(() => () => setPreview(null), [bannerKey, setPreview]);
  if (!kind) return <>{fallback}</>;

  let card, onPick: (i: number, b?: Parameters<typeof rtEvent>[1]) => void, onTimeout: () => void, onAuto: () => void, title: string, key: string, extra: React.ReactNode = null;
  if (kind === "action" && openAction === WAR_PREP_ID) {
    // 전쟁 준비: 선택지 = 상대 세력
    const wc = warPrepCard(s);
    card = wc; title = wc.title; key = "act-war-prep";
    onPick = (i, b) => rtWarPrep(i, b);
    onTimeout = () => closeActionCard();
    onAuto = () => closeActionCard();
    extra = <button className="btn justify-self-start" onClick={closeActionCard}>다른 행동 고르기</button>;
  } else if (kind === "action" && (openAction === WAR_RAID_ID || openAction === WAR_PRESSURE_ID)) {
    // 전시 행동권 행동 (게릴라 습격·정치적 압박)
    const wc = warActionCard(s, openAction);
    card = wc; title = wc.title; key = `act-${openAction}`;
    onPick = (i, b) => rtWarAction(openAction, i, b);
    onTimeout = () => closeActionCard();
    onAuto = () => rtWarAction(openAction, bestChoice(s, wc.choices));
    extra = <button className="btn justify-self-start" onClick={closeActionCard}>다른 행동 고르기</button>;
  } else if (kind === "action") {
    const act = actionsFor(s, content).find((a) => a.id === openAction) ?? content.actions.find((a) => a.id === openAction)!;
    card = { ...act.card, kind: `행동 · ${act.name}` }; title = act.name; key = `act-${act.id}`;
    onPick = (i, b) => rtAction(act.id, i, b);
    onTimeout = () => closeActionCard();
    onAuto = () => rtAction(act.id, bestChoice(s, act.card.choices));
    extra = <button className="btn justify-self-start" onClick={closeActionCard}>다른 행동 고르기</button>;
  } else if (kind === "event") {
    card = s.events[s.eventIdx]!; title = card.title; key = `ev-${s.turn}-${s.eventIdx}`;
    onPick = (i, b) => rtEvent(i, b);
    onTimeout = () => rtSkip();
    onAuto = () => rtEvent(bestChoice(s, card!.choices));
    extra = <><RelicBar s={s} /><button className="btn !text-[12px] !px-2.5 justify-self-start" onClick={rtSkip}>이 사건 넘기기</button></>;
  } else {
    card = npc!.card; title = npc!.npc.name; key = `npc-${s.turn}`;
    onPick = (i, b) => rtNpc(i, b);
    onTimeout = () => rtNpc(npc!.card.choices.length - 1);
    onAuto = () => rtNpc(bestChoice(s, npc!.card.choices));
  }

  const label = kind === "event" ? `사건 ${s.eventIdx + 1}/${s.events.length}` : kind === "npc" ? `연말 알현 · ${npc!.npc.name} (${npc!.npc.role})` : `행동 · ${title}`;
  return (
    <section className="rt-banner grid gap-2" aria-label={`결정: ${title}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="eyebrow text-gold">{label}</span>
        <span className="hidden lg:inline font-ui text-[11px] text-faint">선택지에 마우스를 올리면 왼쪽에 변화가 보입니다</span>
      </div>
      <BannerCard key={key} s={s} card={card!} onPick={onPick}>
        <div className="grid gap-2">
          {/* 행동은 스스로 고르는 것이라 사람에게는 제한시간이 없습니다(카드가 열린 동안 날짜도 멈춤). 자동 진행만 타이머로 고름. */}
          {(kind !== "action" || auto) && <DeadlineBar key={key} onTimeout={onTimeout} onAuto={onAuto} />}
          {extra && <div className="grid gap-2">{extra}</div>}
        </div>
      </BannerCard>
    </section>
  );
}

// ───────── 상단 바 (날짜 + 배속) ─────────
export function RealtimeTopBar({ s, menu }: { s: GameState; menu?: React.ReactNode }) {
  const dayOffset = useGame((z) => z.dayOffset);
  const speed = useGame((z) => z.speed), paused = useGame((z) => z.paused), auto = useGame((z) => z.auto);
  const setSpeed = useGame((z) => z.setSpeed), togglePause = useGame((z) => z.togglePause), toggleAuto = useGame((z) => z.toggleAuto);
  const d = rtDate(s.turn, dayOffset);
  const F = FACTIONS[s.faction];
  return (
    <div className="rt-bar sticky z-30 bg-panel border border-line2 rounded px-3 py-2 mb-3 grid gap-2 lg:flex lg:items-center lg:gap-4" style={{ top: "env(safe-area-inset-top, 0px)" }}>
      <div className="flex items-center gap-2 min-w-0 lg:flex-1">
        <span className="w-6 h-6 shrink-0"><Illus keys={CREST[s.faction]} faction={s.faction} accent /></span>
        <b className="font-display text-[17px] leading-none whitespace-nowrap">{F.short}</b>
        <span className="font-ui text-[12px] text-muted hidden sm:inline">{s.difficulty !== "base" ? DIFFICULTIES[s.difficulty].name : ""}</span>
        {menu && <div className="hidden lg:flex gap-1 ml-2">{menu}</div>}
        <div className="ml-auto text-right">
          <div className="font-display text-[17px] sm:text-[19px] leading-none text-gold tabular-nums whitespace-nowrap">여신력 {d.year}년 {d.month}월 {d.day}일</div>
          <div className="font-ui text-[11px] text-faint">{d.season} · {s.turn}/40계절{paused ? " · 일시정지" : ""}</div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 justify-between lg:justify-end">
        {s.war && <span className="font-ui text-[12px] text-[#e8a08a] whitespace-nowrap" data-testid="war-chip">⚔ {josa(FACTIONS[s.war.enemy].short, "과", "와")} 전쟁</span>}
        <SurrenderButton />
        <button className="btn !px-3 !py-1 !text-[13px] min-h-[34px]" onClick={togglePause} aria-pressed={paused} aria-label={paused ? "재개" : "일시정지"}>{paused ? "▶" : "⏸"}</button>
        <div className="flex gap-1">
          {SPEEDS.map((n) => (
            <button key={n} className={`min-w-[38px] min-h-[34px] px-2 py-1 rounded-[2px] border font-ui text-[12px] tabular-nums ${speed === n ? "border-gold text-gold bg-[#2a2216]" : "border-line text-muted"}`}
              aria-pressed={speed === n} onClick={() => setSpeed(n)}>{n}×</button>
          ))}
        </div>
        <button className={`min-h-[34px] px-2.5 py-1 rounded-[2px] border font-ui text-[12px] ${auto ? "border-gold text-gold bg-[#2a2216]" : "border-line text-muted"}`} aria-pressed={auto} onClick={toggleAuto}>자동</button>
      </div>
    </div>
  );
}

// ───────── 사건 로그 ─────────
const TONE_COLOR: Record<string, string> = { crit: "text-gold", great: "text-gold", success: "text-frost", partial: "text-ink", fail: "text-[#d98a74]", fumble: "text-blood", after: "text-blood" };
export function EventLog() {
  const log = useGame((z) => z.rtLog);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const el = ref.current; if (el) el.scrollTop = el.scrollHeight; }, [log]);
  return (
    <div className="grid gap-1 bg-panel border border-line rounded px-3 py-2">
      <h3 className="eyebrow">사건 기록</h3>
      <div ref={ref} className="grid gap-1 max-h-[160px] overflow-auto font-ui text-[12px] leading-snug">
        {log.length === 0 ? <span className="text-faint">시간이 흐르면 여기에 소식이 쌓입니다.</span>
          : log.map((e) => <div key={e.id} className="grid grid-cols-[auto_1fr] gap-x-2"><span className="text-faint tabular-nums whitespace-nowrap">{e.date.replace("여신력 ", "")}</span><span className={TONE_COLOR[e.tone ?? ""] ?? "text-ink"}>{e.text}</span>{e.detail && <span className="col-start-2 text-muted [word-break:keep-all]">{e.detail}</span>}</div>)}
      </div>
    </div>
  );
}

// 판정 결과 잠깐 표시 (모달 대신 토스트) + 자동 소거
export function RealtimeFlash() {
  const flash = useGame((z) => z.flash);
  const clearFlash = useGame((z) => z.clearFlash);
  const speed = useGame((z) => z.speed);
  useEffect(() => { if (!flash) return; const t = window.setTimeout(clearFlash, Math.max(500, 900 / speed)); return () => clearTimeout(t); }, [flash, clearFlash, speed]);
  if (!flash) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-28 z-40 grid place-items-center" aria-live="polite">
      <div className={`quick-pop font-display text-[34px] px-5 py-2 border border-line2 rounded ${TONE_COLOR[flash.tone] ?? "text-ink"}`} style={{ background: "rgba(26,21,18,.92)" }}>{flash.grade}</div>
    </div>
  );
}

// 행동 단계 안내 (팝업이 아닌 좌측 패널에서 행동을 고르게)
export function RealtimeActionHint({ s }: { s: GameState }) {
  const openActionCard = useGame((z) => z.openActionCard);
  const rtFinishTurn = useGame((z) => z.rtFinishTurn);
  const dayOffset = useGame((z) => z.dayOffset);
  const declare = useGame((z) => z.declareWar);
  if (s.phase !== "action") return null;
  const plays = suggestPlays(s, content);
  const left = Math.max(0, DAYS_PER_SEASON - Math.floor(dayOffset));
  return (
    <section className="bg-panel border border-gold-dim rounded p-3.5 grid gap-2.5">
      <div className="flex justify-between items-center gap-2"><h2 className="font-display text-[20px]">행동 — 계절 마감까지 {left}일</h2>
        <span className="font-ui text-[12px] text-muted">행동권 {s.ap}</span></div>
      {/* 행동·법령을 한데 모아 지금 상황에 맞는 4가지만 — 행동권을 쓸 때마다 다시 고릅니다 */}
      {plays.length > 0 ? (
        <div className="grid grid-cols-2 gap-2" data-testid="plays">
          {plays.map((p) => {
            if (p.kind === "decree") { const d = decreeById(content, p.id); return d ? <DecreePlay key={p.id} s={s} d={d} /> : null; }
            if (p.kind === "declare") return (
              <button key="declare" onClick={declare} data-testid="play-declare"
                className="text-left bg-[#2a1712] border border-blood rounded-[3px] p-2.5 grid gap-0.5 content-start hover:bg-[#3a1d16] transition-colors">
                <b className="font-display text-[17px] font-normal text-[#f0b8a0]">⚔ 선전포고</b><span className="font-ui text-[11.5px] text-[#e8b8a0] leading-snug">{josa(FACTIONS[p.id as "iruth"].short, "과", "와")} 전쟁을 시작합니다 (행동권 없음)</span></button>
            );
            if (p.kind === "warprep") return (
              <button key="warprep" onClick={() => openActionCard(WAR_PREP_ID)} data-testid="play-warprep"
                className="text-left bg-[#17130f] border border-[#6a3a2a] rounded-[3px] p-2.5 grid gap-0.5 content-start hover:border-blood transition-colors">
                <b className="font-display text-[17px] font-normal">⚔ 전쟁 준비</b><span className="font-ui text-[11.5px] text-muted leading-snug">{s.warPrep ? `${josa(FACTIONS[s.warPrep.target].short, "과", "와")}의 준비 1/2 — 한 번 더` : "두 세력 중 하나와의 전쟁을 준비합니다"}</span></button>
            );
            if (p.kind === "waract") { const wc = warActionCard(s, p.id); return (
              <button key={p.id} onClick={() => openActionCard(p.id)} data-testid="play-waract"
                className="text-left bg-[#17130f] border border-[#6a3a2a] rounded-[3px] p-2.5 grid gap-0.5 content-start hover:border-blood transition-colors">
                <b className="font-display text-[17px] font-normal text-[#f0b8a0]">⚔ {wc.title}</b><span className="font-ui text-[11.5px] text-muted leading-snug">{p.id === WAR_RAID_ID ? "전선 상승 · 병력 손실" : "적 피로 상승 · 실링 소모"}</span></button>
            ); }
            const a = actionsFor(s, content).find((x) => x.id === p.id);
            if (!a) return null;
            return (
              <button key={a.id} onClick={() => openActionCard(a.id)} data-testid="play-action"
                className="text-left bg-[#17130f] border border-line rounded-[3px] p-2.5 grid gap-0.5 content-start hover:border-gold transition-colors">
                <b className="font-display text-[17px] font-normal">{a.name}</b><span className="font-ui text-[11.5px] text-muted leading-snug">{a.desc}</span></button>
            );
          })}
        </div>
      ) : <p className="m-0 font-ui text-[12px] text-faint">행동권을 모두 썼습니다. 남은 날이 지나면 계절이 마감됩니다.</p>}
      <TargetPicker s={s} />
      <ActiveDecreeBar s={s} />
      <button className="btn-gold" onClick={rtFinishTurn}>지금 계절 마치기{s.ap > 0 ? ` (행동권 ${s.ap} 이월)` : ""}</button>
    </section>
  );
}

// 부두교: 확산 대상 고르기 (지도에서 지역을 눌러도 됨)
function TargetPicker({ s }: { s: GameState }) {
  const setTarget = useGame((z) => z.setTarget);
  if (s.faction !== "voodoo") return null;
  const opts: RegionId[] = ["arkandal", "iruth", "neutral"];
  return (
    <div className="flex items-center gap-2 font-ui text-[12px] text-muted flex-wrap">
      <span>확산 대상:</span>
      {opts.map((o) => <button key={o} onClick={() => setTarget(o)} aria-pressed={s.target === o}
        className={`px-2 py-1 rounded-[2px] border ${s.target === o ? "border-gold text-gold bg-[#2a2216]" : "border-line"}`}>{REGION_NAME[o]} ({s.infection[o]})</button>)}
    </div>
  );
}
