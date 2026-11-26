// 전쟁 화면 조각: 전황 패널, 하얀 항복 버튼, 선포·결판 알림 배너.
import { useState } from "react";
import { CAPITAL, FACTIONS, RULER, josa, citiesOf, cityById, enemyArmy, type GameState } from "@guul/engine";
import { useGame } from "../store/store";
import { Illus } from "../art/Art";
import { HEADER_IDS, headerUrl } from "../art/headers";

/** 전시에 늘 떠 있는 하얀 항복 버튼 — 한 번 더 눌러야 항복 (실수 방지) */
export function SurrenderButton() {
  const war = useGame((z) => z.state?.war);
  const surrender = useGame((z) => z.surrenderWar);
  const [arm, setArm] = useState(false);
  if (!war) return null;
  return arm ? (
    <span className="inline-flex items-center gap-1">
      <button type="button" onClick={() => { setArm(false); surrender(); }} data-testid="surrender-confirm"
        className="min-h-[34px] px-2.5 py-1 rounded-[2px] border border-white bg-white text-[#1a1410] font-ui text-[12px] font-bold">정말 항복</button>
      <button type="button" onClick={() => setArm(false)} className="min-h-[34px] px-2 py-1 rounded-[2px] border border-line text-muted font-ui text-[12px]">취소</button>
    </span>
  ) : (
    <button type="button" onClick={() => setArm(true)} data-testid="surrender" title="언제든 항복할 수 있습니다. 스스로 항복하면 배상이 1/3로 줄어듭니다."
      className="min-h-[34px] px-2.5 py-1 rounded-[2px] border border-white text-white bg-white/10 hover:bg-white/20 font-ui text-[12px]">🏳 항복</button>
  );
}

function Track({ label, v, min = 0, left, right, color }: { label: string; v: number; min?: number; left: string; right: string; color: string }) {
  const pct = ((v - min) / (100 - min)) * 100;
  return (
    <div className="grid gap-0.5">
      <div className="flex justify-between font-ui text-[11px] text-faint"><span>{left}</span><span className="text-muted">{label} {v}</span><span>{right}</span></div>
      <div className="relative h-2 rounded-full bg-[#2a221a] overflow-hidden">
        {min < 0 && <span className="absolute left-1/2 top-0 bottom-0 w-px bg-[#5a4a38]" />}
        <span className="absolute top-0 bottom-0 left-0 rounded-full transition-[width] duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

/** 왼쪽 위: 전황 (전쟁 중에만) */
export function WarPanel({ s }: { s: GameState }) {
  const w = s.war;
  if (!w) {
    if (!s.warPrep && !s.warReady) return null;
    const f = s.warReady ?? s.warPrep!.target;
    return (
      <section className="bg-panel border border-[#6a3a2a] rounded px-3.5 py-2.5 font-ui text-[12px] text-[#e8b8a0]" data-testid="war-prep-status">
        ⚔ {s.warReady ? `${FACTIONS[f].short}에 선전포고할 수 있습니다 — 행동 칸 맨 앞의 "선전포고"` : `${josa(FACTIONS[f].short, "과", "와")}의 전쟁 준비 1/2 — 같은 상대로 한 번 더 준비하면 선포할 수 있습니다 (다른 행동을 하면 흐트러짐)`}
      </section>
    );
  }
  const E = FACTIONS[w.enemy], me = FACTIONS[s.faction];
  return (
    <section className="bg-panel border border-[#8a3a2a] rounded p-3.5 grid gap-2.5" data-testid="war-panel">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-[20px] text-[#e8a08a]">⚔ {josa(E.short, "과", "와")} 전쟁 중</h2>
        <span className="font-ui text-[11px] text-faint">{s.turn - w.since + 1}계절째 · 적 전력 약 {enemyArmy(s)}만 / 우리 {s.res.army}만</span>
      </div>
      <Track label="전선" v={w.front} left={`${cityById(CAPITAL[s.faction])?.name} (우리 수도)`} right={`${cityById(CAPITAL[w.enemy])?.name} (적 수도)`} color="linear-gradient(90deg,#8a3a2a,#e0b65a)" />
      <Track label="군주 추적" v={w.hunt} min={-100} left={`${RULER[s.faction]} 위험`} right={`${RULER[w.enemy]} 포박`} color="#c9a2f2" />
      <div className="grid grid-cols-2 gap-2">
        <Track label="우리 피로" v={w.weary} left="" right="항복" color="#d98a74" />
        <Track label="적 피로" v={w.enemyWeary} left="" right="적 항복" color="#8fc3d6" />
      </div>
      <p className="m-0 font-ui text-[11px] text-faint leading-snug">
        이기는 길: 전선 100(수도 점령) · 군주 추적 100(군주 포박) · 적 피로 100(항복). 군주 추적이 −100이 되면 우리 군주가 포박되어 그대로 게임이 끝납니다(패배의 댓가). 도시 10곳을 차지하면 정복왕으로 승리합니다. 계절마다 전쟁 카드 2장과 역병 사건 1장이 옵니다.
        도시 {citiesOf(s, s.faction).length}곳 ({me.short}) · {citiesOf(s, w.enemy).length}곳 ({E.short}).
      </p>
    </section>
  );
}

/** 선포·결판 알림 — 배너 자리에 크게. 누르면 닫힘 */
export function WarNoticeBanner() {
  const n = useGame((z) => z.rtNotice);
  const clear = useGame((z) => z.clearNotice);
  const faction = useGame((z) => z.state?.faction ?? "arkandal");
  if (!n) return null;
  const col = n.tone === "win" ? "#8a6212" : n.tone === "lose" ? "#7a1a14" : n.tone === "peace" ? "#2f5d6e" : "#7a2a14";
  return (
    <section className="rt-banner letter relative p-4 grid gap-2 justify-items-center text-center" aria-live="assertive" data-testid="war-notice">
      <span className="pointer-events-none absolute inset-1.5 border border-[#3e3328] rounded-[2px]" aria-hidden="true" />
      <span className="font-ui text-[11px] text-gold-dim">{n.tone === "war" ? "선전포고" : "전쟁의 끝"}</span>
      <h2 className="font-display text-[24px] leading-tight m-0" style={{ color: col }}>{n.title}</h2>
      <div className="w-full max-w-[300px]">
        {HEADER_IDS.has(n.img)
          ? <img src={headerUrl(n.img)} alt="" width={512} height={512} className="w-full aspect-square object-cover rounded-[4px] border border-line2" />
          : <div className="w-full aspect-square grid place-items-center rounded-[4px] border border-line2 bg-[#2a231b]"><Illus keys={n.tone === "peace" ? ["treaty", "banner"] : n.tone === "lose" ? ["banner", "fire"] : ["sword", "banner"]} faction={faction} accent className="w-3/4 h-3/4" /></div>}
      </div>
      <p className="m-0 text-[14.5px] leading-[1.6] font-medium text-[#3a2e22] max-w-[440px] [word-break:keep-all]">{n.text}</p>
      {n.lines.map((l) => <p key={l} className="m-0 font-ui text-[12.5px] text-[#4a3b2a]">{l}</p>)}
      <button type="button" className="btn mt-1" onClick={clear}>계속</button>
    </section>
  );
}
