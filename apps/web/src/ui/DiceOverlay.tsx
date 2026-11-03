import { useGame } from "../store/store";
import { DiceRoller } from "../dice/DiceRoller";
import { FACTIONS, REGION_NAME, labelOf, type AppliedEffect, type GameState } from "@guul/engine";

function chip(s: GameState, a: AppliedEffect, fail: boolean) {
  const unit = a.key === "pop" || a.key === "army" ? "만" : "";
  const n = a.key === "pop" || a.key === "army" ? Math.abs(a.delta).toFixed(1) : String(Math.abs(Math.round(a.delta)));
  const t = `${a.label} ${a.delta > 0 ? "+" : "−"}${n}${unit}`;
  return <span key={(fail ? "f" : "") + a.key + a.label} className={`chip ${a.good ? "text-frost border-[#3d5560]" : "text-[#d98a74] border-[#5a3328]"} ${fail ? "border-dashed" : ""}`}>{fail ? "실패 시 " : ""}{t}</span>;
}

export function DiceOverlay() {
  const dice = useGame((z) => z.dice);
  const dismiss = useGame((z) => z.dismissDice);
  const s = useGame((z) => z.state);
  if (!dice || !s) return null;
  const o = dice.outcome;
  const chips = [...o.applied.map((a) => chip(s, a, false)), ...o.failApplied.map((a) => chip(s, a, true))];
  return (
    <div className="fixed inset-0 bg-black/80 grid place-items-center z-50 backdrop-blur-sm"
      style={{ padding: "20px max(16px,env(safe-area-inset-right,0px)) 20px max(16px,env(safe-area-inset-left,0px))" }}>
      <div className="w-[min(480px,100%)] bg-panel border border-line2 rounded p-4 max-h-full overflow-auto">
        <DiceRoller
          autoRoll
          roll={{ dice: o.dice, sum: o.sum, modifier: o.statMod + o.choiceMod + o.stateMod, final: o.final, gradeName: o.grade.name, tone: o.grade.tone, mult: o.mult }}
          title={`${dice.cardTitle} · ${dice.choiceLabel}`}
          onDone={dismiss}>
          <div className="grid gap-2 justify-items-center">
            <div className="font-ui text-[12px] text-muted">판정 {o.stat} · {o.aftermath ? "후유증 카드가 다음에 등장" : o.failApplied.length ? "실패 비용 발생" : "온전히 반영"}</div>
            <div className="flex flex-wrap gap-1 justify-center max-w-[400px]">{chips.length ? chips : <span className="chip border-line text-muted">변화 없음</span>}</div>
          </div>
        </DiceRoller>
      </div>
    </div>
  );
}
