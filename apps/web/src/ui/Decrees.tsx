import { FACTIONS, MAX_DECREES, decreeById, decreesFor, enactBlocker, isDecreeActive, labelOf, type Decree, type EffectKey, type GameState, type UpkeepKey } from "@guul/engine";
import { content, useGame } from "../store/store";
import { Illus } from "../art/Art";

const UPKEEP: Record<UpkeepKey, string> = { silver: "실링", strat: "", food: "식량", prey: "먹이" };
function effectText(s: GameState, d: Decree): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(d.effects) as [EffectKey, number][]) {
    if (!v) continue;
    const unit = k === "pop" || k === "army" ? "만" : "";
    out.push(`${labelOf(s, k)} ${v > 0 ? "+" : "−"}${Math.abs(v)}${unit}`);
  }
  if (d.wrath) out.push(`진노 +${d.wrath}`);
  return out;
}
function upkeepText(s: GameState, d: Decree): string {
  const parts = (Object.entries(d.upkeep) as [UpkeepKey, number][]).filter(([, v]) => v).map(([k, v]) => `${k === "strat" ? FACTIONS[s.faction].stratName : UPKEEP[k]} ${v}`);
  return parts.length ? parts.join(", ") : "없음";
}

/** 대시보드: 공포 중인 법령 아이콘 */
export function DecreeIcons({ s }: { s: GameState }) {
  return (
    <div className="grid gap-2"><h3 className="eyebrow">법령 {s.decrees.length}/{MAX_DECREES}</h3>
      {s.decrees.length === 0 ? <span className="font-ui text-[11px] text-faint">공포한 법령이 없습니다. 행동 단계에서 행동권 1개로 공포합니다.</span> : (
        <ul className="flex flex-wrap gap-1.5 m-0 p-0 list-none">
          {s.decrees.map((a) => {
            const d = decreeById(content, a.id); if (!d) return null;
            const tip = `${d.name} — 매 계절 ${effectText(s, d).join(", ")} · 유지비 ${upkeepText(s, d)}${d.repealText ? ` · 해제: ${d.repealText}` : ""}`;
            return (
              <li key={a.id} title={tip} aria-label={tip} className="flex items-center gap-1.5 bg-[#15120e] border border-gold-dim rounded-[2px] pl-1 pr-2 py-0.5">
                <span className="w-7 h-7 shrink-0 grid rounded-full bg-[#e6d8bb] p-0.5"><Illus keys={[d.icon]} faction={s.faction} accent className="w-full h-full" /></span>
                <span className="font-ui text-[12px] text-ink">{d.name}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** 행동 단계: 법령 공포·철회 패널 */
export function DecreePanel({ s }: { s: GameState }) {
  const enact = useGame((z) => z.enact);
  const repeal = useGame((z) => z.repeal);
  const list = decreesFor(s, content);
  return (
    <section className="grid gap-2 border-t border-line pt-3">
      <div className="flex justify-between items-baseline gap-2 flex-wrap">
        <h3 className="font-display text-[20px]">법령</h3>
        <span className="font-ui text-[12px] text-muted">공포·철회에 행동권 1개 · 동시에 {MAX_DECREES}개까지 · 유지비는 종료 결산에서 차감</span>
      </div>
      <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(230px,1fr))]">
        {list.map((d) => {
          const active = isDecreeActive(s, d.id);
          const why = active ? (s.ap <= 0 ? "행동권이 없습니다" : null) : enactBlocker(s, d);
          return (
            <div key={d.id} className={`grid gap-1.5 content-start bg-[#17130f] border rounded-[3px] p-2.5 ${active ? "border-gold" : "border-line"}`}>
              <div className="flex items-center gap-2"><span className="w-9 h-9 shrink-0 grid rounded-full bg-[#e6d8bb] p-1"><Illus keys={[d.icon]} faction={s.faction} accent className="w-full h-full" /></span>
                <b className="font-display text-[18px] font-normal leading-tight">{d.name}</b>{active && <span className="ml-auto font-ui text-[11px] text-gold">시행 중</span>}</div>
              <p className="m-0 text-[13px] text-muted">{d.desc}</p>
              <div className="font-ui text-[12px] text-[#d9cdb6]">매 계절: {effectText(s, d).join(" · ")}</div>
              <div className="font-ui text-[12px] text-faint">유지비: {upkeepText(s, d)}{d.repealText ? ` · 해제: ${d.repealText}` : ""}</div>
              <button className={active ? "btn" : "btn-gold !px-3 !py-1 !text-[13px]"} disabled={!!why} title={why ?? undefined}
                onClick={() => (active ? repeal(d.id) : enact(d.id))} >{active ? "철회 (행동권 1)" : "공포 (행동권 1)"}</button>
              {why && !active && <span className="font-ui text-[11px] text-blood">{why}</span>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
