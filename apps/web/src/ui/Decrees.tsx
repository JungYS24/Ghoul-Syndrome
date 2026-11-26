import { FACTIONS, MAX_DECREES, decreeById, enactBlocker, labelOf, type Decree, type EffectKey, type GameState, type UpkeepKey } from "@guul/engine";
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

/** 행동 추천 칸에 들어가는 법령 한 장 (누르면 행동권 1개로 공포) */
export function DecreePlay({ s, d }: { s: GameState; d: Decree }) {
  const enact = useGame((z) => z.enact);
  const why = enactBlocker(s, d);
  return (
    <button type="button" onClick={() => enact(d.id)} disabled={!!why} title={why ?? d.desc} data-testid="play-decree"
      className="text-left bg-[#17130f] border border-gold-dim rounded-[3px] p-2.5 grid gap-1 content-start hover:border-gold transition-colors disabled:opacity-40">
      <span className="flex items-center gap-2">
        <span className="w-7 h-7 shrink-0 grid rounded-full bg-[#e6d8bb] p-0.5"><Illus keys={[d.icon]} faction={s.faction} accent className="w-full h-full" /></span>
        <b className="font-display text-[17px] font-normal leading-tight">{d.name}</b>
        <span className="ml-auto font-ui text-[10.5px] text-gold border border-gold-dim rounded-[2px] px-1 shrink-0">법령</span>
      </span>
      <span className="font-ui text-[11.5px] text-[#d9cdb6] leading-snug">매 계절 {effectText(s, d).join(" · ")}</span>
      <span className="font-ui text-[11px] text-faint leading-snug">유지비 {upkeepText(s, d)}</span>
    </button>
  );
}

/** 시행 중인 법령 — 한 줄로, 철회 버튼(행동권 1) */
export function ActiveDecreeBar({ s }: { s: GameState }) {
  const repeal = useGame((z) => z.repeal);
  if (!s.decrees.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 font-ui text-[12px]" data-testid="active-decrees">
      <span className="text-faint">시행 중 {s.decrees.length}/{MAX_DECREES}:</span>
      {s.decrees.map((a) => {
        const d = decreeById(content, a.id); if (!d) return null;
        return (
          <span key={a.id} className="inline-flex items-center gap-1 border border-gold-dim rounded-[2px] pl-1.5 pr-0.5 py-0.5" title={`매 계절 ${effectText(s, d).join(", ")} · 유지비 ${upkeepText(s, d)}`}>
            {d.name}
            <button type="button" disabled={s.ap <= 0} onClick={() => repeal(d.id)} className="px-1 text-faint hover:text-blood disabled:opacity-40" aria-label={`${d.name} 철회 (행동권 1)`} title="철회 (행동권 1)">✕</button>
          </span>
        );
      })}
    </div>
  );
}
