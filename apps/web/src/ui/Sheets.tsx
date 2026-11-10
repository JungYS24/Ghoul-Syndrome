import { useEffect, useState } from "react";
import { getBgmVolume, setBgmVolume } from "../audio/bgm";
import { getSfxVolume, isMuted, onMuteChange, setMuted, setSfxVolume, thud } from "../audio/sfx";
import { GAUGE_LABEL, gradeTable, infStage, type GameState } from "@guul/engine";

/** 판정 등급표 (grades.json 자동 생성). compact = 온보딩 말풍선용 소형. */
export function GradeTable({ compact }: { compact?: boolean }) {
  const rows = gradeTable();
  return (
    <table className={`border-collapse font-ui w-full ${compact ? "text-[11px]" : "text-[12px]"}`}>
      <tbody>
        {rows.map((r) => (
          <tr key={r.name}>
            <td className="border-b border-line py-0.5 pr-1.5 whitespace-nowrap tabular-nums">{r.min}~{r.max}</td>
            <td className="border-b border-line py-0.5 pl-1.5">{r.name}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [onClose]);
  return (
    <>
      <div className="fixed inset-0 bg-black/55 z-30" onClick={onClose} aria-hidden="true" />
      <aside className="fixed inset-y-0 right-0 w-[min(460px,100%)] bg-panel border-l border-line2 z-40 overflow-auto grid gap-3.5 content-start shadow-[-20px_0_40px_-20px_#000]"
        style={{ padding: "calc(20px + env(safe-area-inset-top,0px)) max(18px,env(safe-area-inset-right,0px)) calc(20px + env(safe-area-inset-bottom,0px)) 18px" }} role="dialog" aria-modal="true" aria-label={title}>
        <div className="flex justify-between items-center"><h2 className="font-display text-[26px]">{title}</h2><button className="btn" onClick={onClose} autoFocus>닫기</button></div>
        {children}
      </aside>
    </>
  );
}

export function ChronicleSheet({ s, onClose }: { s: GameState; onClose: () => void }) {
  return (
    <Sheet title="연대기" onClose={onClose}>
      <ol className="grid gap-2.5 m-0 p-0 list-none">
        {s.chronicle.slice().reverse().map((c, i) => (
          <li key={i} className="grid grid-cols-[86px_1fr] gap-2.5 text-[14px] border-b border-line pb-2">
            <div><div className="font-ui text-[12px] text-gold-dim">{c.year}년 {c.season}</div><div className="font-ui text-[11px] text-faint">감염도 {c.infection} · {infStage(c.infection)}</div></div>
            <div>{c.text}</div>
          </li>
        ))}
        {!s.chronicle.length && <li className="text-muted">아직 기록이 없습니다.</li>}
      </ol>
    </Sheet>
  );
}

export function RulesSheet({ onClose }: { onClose: () => void }) {
  const grades: [string, string][] = [["89~100 (합)", "대성공 계열 (경이로운·대성공)"], ["50~88", "성공 계열 (엄청난~그래도 성공)"], ["40~49", "애매한 성공 (반쪽자리·애매한)"], ["18~39", "실패 계열 (아쉬운·실패·뼈아픈)"], ["1~17", "대실패 계열 (후유증 포함)"]];
  const stages: [string, string][] = [["0~30 소강", "효과 없음"], ["31~60 확산", "식량 생산 −10%"], ["61~90 창궐", "모든 판정 −5, 식량 −20%"], ["91~100 붕괴", "매 턴 붕괴 카드 추가"]];
  return (
    <Sheet title="규칙" onClose={onClose}>
      <div className="text-[14px] text-[#d9cdb6] grid gap-2.5">
        <p className="m-0">1턴은 3개월입니다. 759년 봄부터 768년 겨울까지 40턴을 다스립니다.</p>
        <h3 className="font-ui text-[12px] tracking-[0.1em] text-gold-dim font-medium mt-1">한 턴</h3>
        <p className="m-0">① 시작 결산(식량 소비, 감염도 갱신, 인구 손실) ② 사건 카드 3장(세력·공통·상황) ③ 행동권 2개(미사용 시 이월, 최대 3) ④ 종료 결산(생산·유지비, AI 세력) ⑤ 연대기 기록</p>
        <h3 className="font-ui text-[12px] tracking-[0.1em] text-gold-dim font-medium mt-1">주사위 (5d20)</h3>
        <p className="m-0">20면체 5개를 굴려 합(5~100)에 보정(능력치 (게이지−50)÷5, 선택지 난이도, 상태)을 더합니다. 합의 분포가 종 모양이라, 최종값을 백분위 rank로 바꿔 효과 배율(0.30~1.60)을 정합니다. 이로운 효과는 배율만큼 커지고, 해로운 효과는 잘 나올수록 줄며, 자원 비용은 고정입니다. 40 미만이면 실패 비용이 더해지고, 17 이하면 후유증 카드가 나옵니다.</p>
        <table className="border-collapse font-ui text-[12px] w-full">{grades.map(([a, b]) => <tr key={a}><td className="border-b border-line py-1 pr-1.5">{a}</td><td className="border-b border-line py-1 pl-1.5">{b}</td></tr>)}</table>
        <h3 className="font-ui text-[12px] tracking-[0.1em] text-gold-dim font-medium mt-1">구울 증후군</h3>
        <p className="m-0">계절 보정: 봄 0 · 여름 +4 · 가을 +2 · 겨울 −6 (아이루스 겨울 추가 −3). 매 턴 인구 × 감염도 ÷ 100 × 5%가 구울이 됩니다(잠복·발병 2계절 지연).</p>
        <table className="border-collapse font-ui text-[12px] w-full">{stages.map(([a, b]) => <tr key={a}><td className="border-b border-line py-1 pr-1.5">{a}</td><td className="border-b border-line py-1 pl-1.5">{b}</td></tr>)}</table>
        <h3 className="font-ui text-[12px] tracking-[0.1em] text-gold-dim font-medium mt-1">게이지 · 진노</h3>
        <p className="m-0">게이지({Object.values(GAUGE_LABEL).slice(0, 4).join("·")} 등)가 0이면 패배, 100이면 과잉 후유증 카드. 진노는 소각·처형·모독으로 오르고 30·60·90·100에서 생산이 줄며 100은 되돌릴 수 없습니다.</p>
        <h3 className="font-ui text-[12px] tracking-[0.1em] text-gold-dim font-medium mt-1">자원 단위</h3>
        <p className="m-0">식량·광석·정화석은 t, 실링·인구·병력은 만 단위입니다. 광석은 무구 제작과 방벽에, 정화석은 오염 정화(격리벽·정화 의식 등)에 쓰입니다. 부두교는 정화석 대신 먹이를 쓰고, 광석 자리는 재입니다.</p>
        <h3 className="font-ui text-[12px] tracking-[0.1em] text-gold-dim font-medium mt-1">승리</h3>
        <p className="m-0">아르칸달: 방벽 100 + 감염도 20 미만 · 아이루스: 공유 연구 100(치료제) · 부두교: 대륙 감염 진척(CI) 85를 2턴 연속. 부두교가 이기면 다른 둘은 함께 패배합니다. 40턴 종료 시 생존 등급으로 점수를 매깁니다.</p>
      </div>
    </Sheet>
  );
}

function Slider({ label, value, onChange, onCommit }: { label: string; value: number; onChange: (v: number) => void; onCommit?: () => void }) {
  return (
    <label className="grid gap-1 font-ui text-[13px] text-muted">
      <span className="flex justify-between"><span>{label}</span><span className="num tabular-nums text-ink">{Math.round(value * 100)}%</span></span>
      <input type="range" min={0} max={100} step={5} value={Math.round(value * 100)} onChange={(e) => onChange(Number(e.target.value) / 100)}
        onPointerUp={onCommit} onKeyUp={onCommit} className="w-full accent-[#8b7355]" aria-label={label} />
    </label>
  );
}

/** 설정 — 전체 화면, 소리 켜기/끄기, 배경음·효과음 음량 */
export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const [fs, setFs] = useState(typeof document !== "undefined" && !!document.fullscreenElement);
  const [bgm, setBgm] = useState(getBgmVolume());
  const [sfx, setSfx] = useState(getSfxVolume());
  const [muted, setM] = useState(isMuted());
  const canFs = typeof document !== "undefined" && !!document.fullscreenEnabled;
  useEffect(() => {
    const h = () => setFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", h);
    const off = onMuteChange(setM);
    return () => { document.removeEventListener("fullscreenchange", h); off(); };
  }, []);
  const toggleFs = async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch { /* 브라우저가 거부 */ }
  };
  return (
    <Sheet title="설정" onClose={onClose}>
      <div className="grid gap-5" data-testid="settings">
        <section className="grid gap-2">
          <h3 className="eyebrow">화면</h3>
          <button className="btn !py-2" onClick={toggleFs} disabled={!canFs} aria-pressed={fs}>{fs ? "전체 화면 끝내기" : "전체 화면으로 보기"}</button>
          {!canFs && <p className="m-0 font-ui text-[12px] text-faint">이 브라우저는 전체 화면 전환을 지원하지 않습니다(iPhone 등). 주소창 공유 메뉴의 "홈 화면에 추가"를 쓰면 전체 화면처럼 열립니다.</p>}
        </section>
        <section className="grid gap-3">
          <h3 className="eyebrow">소리</h3>
          <button className="btn !py-2" aria-pressed={muted} onClick={() => setMuted(!muted)}>{muted ? "소리 꺼짐 — 눌러서 켜기" : "소리 켜짐 — 눌러서 끄기"}</button>
          <Slider label="배경음" value={bgm} onChange={(v) => { setBgm(v); setBgmVolume(v); }} />
          <Slider label="효과음" value={sfx} onChange={(v) => { setSfx(v); setSfxVolume(v); }} onCommit={() => thud(0.6)} />
          <p className="m-0 font-ui text-[12px] text-faint">설정은 이 브라우저에 저장됩니다.</p>
        </section>
      </div>
    </Sheet>
  );
}
