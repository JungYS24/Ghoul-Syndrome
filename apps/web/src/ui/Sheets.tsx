import { useEffect } from "react";
import { AFTERMATH_AT_OR_BELOW, GAUGE_LABEL, INFECTION_STAGES, ON_FAIL_BELOW, gradeTable, infStage, type GameState, type Grade } from "@guul/engine";

export const TONE_CLASS: Record<Grade["tone"], string> = {
  crit: "text-gold-hi", great: "text-gold", success: "text-frost", partial: "text-[#c9b48a]", fail: "text-[#d98a74]", fumble: "text-blood", after: "text-blood",
};

/** grades.json 에서 자동 생성되는 등급표 */
export function GradeTable({ compact }: { compact?: boolean }) {
  const rows = gradeTable();
  return (
    <table className="border-collapse font-ui text-[12px] w-full">
      <tbody>{rows.map((r) => (
        <tr key={r.name}>
          <td className={`border-b border-line pr-1.5 tabular-nums whitespace-nowrap ${compact ? "py-0.5" : "py-1"}`}>{r.min === r.max ? r.min : `${r.min}~${r.max}`}</td>
          <td className={`border-b border-line pl-1.5 ${compact ? "py-0.5" : "py-1"} ${TONE_CLASS[r.tone]}`}>{r.name}{r.max < ON_FAIL_BELOW ? " · 실패 비용" : ""}{r.max <= AFTERMATH_AT_OR_BELOW ? " · 후유증" : ""}</td>
        </tr>
      ))}</tbody>
    </table>
  );
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
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
  return (
    <Sheet title="규칙" onClose={onClose}>
      <div className="text-[14px] text-[#d9cdb6] grid gap-2.5">
        <p className="m-0">1턴은 3개월입니다. 759년 봄부터 768년 겨울까지 40턴을 다스립니다.</p>
        <h3 className="font-ui text-[12px] tracking-[0.1em] text-gold-dim font-medium mt-1">한 턴</h3>
        <p className="m-0">① 시작 결산(식량 소비, 감염도 갱신, 인구 손실) ② 사건 카드 3장(세력·공통·상황) ③ 행동권 2개(행동 또는 법령 공포·철회, 미사용 시 이월, 최대 3) ④ 종료 결산(생산·유지비·법령, AI 세력 소식) ⑤ 연대기 기록. 어떤 선택은 몇 계절 뒤 연쇄 사건을 부르고, 그때의 판정 등급에 따라 상황이 달라집니다.</p>
        <h3 className="font-ui text-[12px] tracking-[0.1em] text-gold-dim font-medium mt-1">주사위 (5d20)</h3>
        <p className="m-0">20면체 5개를 굴려 합(5~100)에 보정(능력치 (게이지−50)÷5, 선택지 난이도, 상태)을 더합니다. 합의 분포가 종 모양이라, 최종값을 백분위 rank로 바꿔 효과 배율(0.30~1.60)을 정합니다. 이로운 효과는 배율만큼 커지고, 해로운 효과는 잘 나올수록 줄며, 자원 비용은 고정입니다. 최종값 {ON_FAIL_BELOW} 미만이면 실패 비용이 더해지고, {AFTERMATH_AT_OR_BELOW} 이하면 후유증 카드가 나옵니다.</p>
        <GradeTable />
        <h3 className="font-ui text-[12px] tracking-[0.1em] text-gold-dim font-medium mt-1">구울 증후군</h3>
        <p className="m-0">계절 보정: 봄 0 · 여름 +4 · 가을 +2 · 겨울 −6 (아이루스 겨울 추가 −3). 매 턴 인구 × 감염도 ÷ 100 × 5%가 구울이 됩니다(잠복·발병 2계절 지연).</p>
        <table className="border-collapse font-ui text-[12px] w-full"><tbody>{INFECTION_STAGES.map((st) => <tr key={st.name}><td className="border-b border-line py-1 pr-1.5 whitespace-nowrap">{st.min}~{st.max} {st.name}</td><td className="border-b border-line py-1 pl-1.5">{st.effect}</td></tr>)}</tbody></table>
        <h3 className="font-ui text-[12px] tracking-[0.1em] text-gold-dim font-medium mt-1">게이지 · 진노</h3>
        <p className="m-0">게이지({Object.values(GAUGE_LABEL).slice(0, 4).join("·")} 등)가 0이면 패배, 100이면 과잉 후유증 카드. 진노는 소각·처형·모독으로 오르고 30·60·90·100에서 생산이 줄며 100은 되돌릴 수 없습니다.</p>
        <h3 className="font-ui text-[12px] tracking-[0.1em] text-gold-dim font-medium mt-1">승리</h3>
        <p className="m-0">아르칸달: 방벽 100 + 감염도 20 미만 · 아이루스: 공유 연구 100(치료제) · 부두교: 대륙 감염 진척(CI) 85를 2턴 연속. 부두교가 이기면 다른 둘은 함께 패배합니다. 40턴 종료 시 생존 등급으로 점수를 매깁니다.</p>
      </div>
    </Sheet>
  );
}
