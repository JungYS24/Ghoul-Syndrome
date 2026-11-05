import { useEffect, useState } from "react";
import { AFTERMATH_AT_OR_BELOW, FACTIONS, GAUGE_HELP, GAUGE_LABEL, INFECTION_STAGES, ON_FAIL_BELOW, SEASON_KO, SEASON_MOD, type GameState, type Season } from "@guul/engine";
import { GradeTable } from "./Sheets";
import { TIP_TARGET, onboardingOff, setOnboardingOff, tipsForTurn, type TipId } from "./tour";

const storage = () => { try { return typeof window !== "undefined" ? window.localStorage : null; } catch { return null; } };

function TipBody({ id, s }: { id: TipId; s: GameState }) {
  const F = FACTIONS[s.faction];
  if (id === "gauges") return (
    <>
      <p className="m-0">대시보드(모바일은 화면 위 요약 줄)의 게이지 넷이 나라의 체력입니다. <b>하나라도 0이 되면 패배</b>, 100이 되면 과잉 후유증 카드가 나옵니다.</p>
      <ul className="m-0 pl-4 grid gap-0.5">{F.gauges.map((k) => <li key={k}><b className="text-ink">{GAUGE_LABEL[k]}</b> — {GAUGE_HELP[k]}</li>)}</ul>
    </>
  );
  if (id === "dice") return (
    <>
      <p className="m-0">모든 선택은 <b>20면체 5개(5d20)</b>로 판정합니다. 합(5~100)에 게이지 보정을 더한 최종값이 등급을 정합니다. <b>{ON_FAIL_BELOW} 미만</b>이면 실패 비용이 붙고, <b>{AFTERMATH_AT_OR_BELOW} 이하</b>면 후유증 카드가 이어집니다.</p>
      <div className="max-h-[180px] overflow-auto pr-1"><GradeTable compact /></div>
    </>
  );
  if (id === "infection") return (
    <>
      <p className="m-0">감염도는 계절마다 저절로 오릅니다. 구간을 넘을 때마다 대가가 커집니다.</p>
      <table className="border-collapse font-ui text-[12px] w-full"><tbody>{INFECTION_STAGES.map((st) => <tr key={st.name}><td className="border-b border-line py-0.5 pr-1.5 whitespace-nowrap">{st.min}~{st.max} {st.name}</td><td className="border-b border-line py-0.5 pl-1.5">{st.effect}</td></tr>)}</tbody></table>
    </>
  );
  if (id === "actions") return (
    <p className="m-0">사건 카드를 넘기면 <b>행동권</b> 단계입니다. 계절마다 2개가 생기고, 쓰지 않으면 다음 계절로 이월됩니다(최대 3). 승리 진척({F.victory})은 주로 행동으로 쌓입니다.</p>
  );
  const seasons: Season[] = ["spring", "summer", "autumn", "winter"];
  return (
    <p className="m-0">계절이 감염 확산을 바꿉니다: {seasons.map((x) => `${SEASON_KO[x]} ${SEASON_MOD[x] >= 0 ? "+" : ""}${SEASON_MOD[x]}`).join(" · ")}{s.faction === "iruth" ? " (아이루스 겨울 추가 −3)" : ""}. 감염도 칸의 "다음 계절 보정"을 보고 여름 전에 대비하세요.</p>
  );
}
const TITLE: Record<TipId, string> = { gauges: "게이지 네 개", dice: "5d20 판정과 등급", infection: "감염도 구간", actions: "행동권", seasons: "계절과 확산" };

/** 첫 3턴 말풍선 안내. 건너뛰기 = 이번 판만, 다시 보지 않기 = 브라우저에 저장. */
export function Onboarding({ s }: { s: GameState }) {
  const [off, setOff] = useState(() => onboardingOff(storage()));
  const [skipped, setSkipped] = useState(false);
  const [closedTurn, setClosedTurn] = useState(0);
  const [step, setStep] = useState(0);
  const tips = tipsForTurn(s.turn);
  useEffect(() => setStep(0), [s.turn]);
  const visible = !off && !skipped && closedTurn !== s.turn && tips.length > 0 && s.phase !== "over";
  const id = visible ? tips[Math.min(step, tips.length - 1)]! : null;

  // 가리키는 대시보드 영역 강조
  useEffect(() => {
    const target = id ? TIP_TARGET[id] : undefined;
    if (!target) return;
    const el = document.querySelector(`[data-tour="${target}"]`);
    el?.classList.add("tour-focus");
    return () => el?.classList.remove("tour-focus");
  }, [id]);

  if (!id) return null;
  const last = step >= tips.length - 1;
  return (
    <section className="tour-bubble relative bg-[#2a2216] border border-gold-dim rounded p-3.5 grid gap-2 text-[14px] text-[#d9cdb6]" role="note" aria-label={`안내: ${TITLE[id]}`}>
      <div className="flex justify-between items-center gap-2">
        <span className="eyebrow">안내 {tips.length > 1 ? `${step + 1}/${tips.length}` : `· ${s.turn}턴`}</span>
        <button className="font-ui text-[12px] text-muted underline" onClick={() => setSkipped(true)}>건너뛰기</button>
      </div>
      <h3 className="font-display text-[20px] text-ink">{TITLE[id]}</h3>
      <TipBody id={id} s={s} />
      <div className="flex flex-wrap gap-2 items-center justify-between mt-0.5">
        <button className="font-ui text-[12px] text-faint underline" onClick={() => { setOnboardingOff(storage()); setOff(true); }}>다시 보지 않기</button>
        <div className="flex gap-1.5">
          {step > 0 && <button className="btn" onClick={() => setStep(step - 1)}>이전</button>}
          <button className="btn-gold !px-4 !py-1.5 !text-[13px]" onClick={() => (last ? setClosedTurn(s.turn) : setStep(step + 1))}>{last ? "알겠습니다" : "다음"}</button>
        </div>
      </div>
    </section>
  );
}
