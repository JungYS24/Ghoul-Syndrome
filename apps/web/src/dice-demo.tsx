import { useState } from "react";
import { createRoot } from "react-dom/client";
import { createRng, judge, roll5d20 } from "@guul/engine";
import { DiceRoller } from "./dice/DiceRoller";
import { MuteToggle } from "./ui/MuteToggle";
import "./index.css";

// 주사위 단독 데모: 시드를 바꾸며 결과·연출을 확인
function Demo() {
  const [seed, setSeed] = useState(20260759);
  const [mod, setMod] = useState(0);
  const [k, setK] = useState(0);
  const rng = createRng(seed + k * 7919);
  const dice = roll5d20(rng);
  const j = judge(dice, mod);
  const force = (target: "crit" | "fumble") => {
    for (let t = 1; t < 50000; t++) { const d = roll5d20(createRng(t)); const jj = judge(d, mod); if ((target === "crit" && jj.final >= 73) || (target === "fumble" && jj.final <= 29)) { setSeed(t); setK(0); return; } }
  };
  return (
    <div className="gutter max-w-[720px] mx-auto py-6 grid grid-cols-[minmax(0,1fr)] gap-4">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div><div className="eyebrow">구울 증후군 · 컴포넌트 데모</div><h1 className="font-display text-[34px] leading-tight">5d20 주사위</h1></div>
        <MuteToggle />
      </header>
      <div className="flex flex-wrap gap-2 items-center font-ui text-[13px] text-muted">
        <label>시드 <input className="bg-panel border border-line px-2 py-1 w-28 tabular-nums" value={seed} onChange={(e) => setSeed(Number(e.target.value) || 1)} /></label>
        <label>보정 <input type="number" className="bg-panel border border-line px-2 py-1 w-16" value={mod} onChange={(e) => setMod(Number(e.target.value) || 0)} /></label>
        <button className="btn" onClick={() => setK(k + 1)}>다시 굴리기</button>
        <button className="btn" onClick={() => force("crit")}>대성공 시드 찾기</button>
        <button className="btn" onClick={() => force("fumble")}>대실패 시드 찾기</button>
      </div>
      <div className="bg-panel border border-line rounded">
        <DiceRoller key={`${seed}-${k}-${mod}`} roll={{ dice, sum: j.sum, modifier: mod, final: j.final, gradeName: j.grade.name, tone: j.grade.tone, mult: j.mult }} title="데모 판정" onDone={() => setK(k + 1)} />
      </div>
      <p className="font-ui text-[12px] text-faint">결과(주사위 {dice.join(", ")} → 최종 {j.final}, rank {j.rank})는 굴리기 전에 이미 정해져 있습니다. 애니메이션은 그 결과를 보여 줄 뿐입니다.</p>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<Demo />);
