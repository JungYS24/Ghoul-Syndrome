import { ownedRelics, type GameState } from "@guul/engine";
import { content, useGame } from "../store/store";

/** 사건 카드 아래: 가진 유물을 쓰면 이 사건을 선택지 대신 유물로 처리합니다. */
export function RelicBar({ s }: { s: GameState }) {
  const use = useGame((z) => z.useRelicNow);
  const relics = ownedRelics(s, content);
  if (!relics.length) return null;
  return (
    <div className="grid gap-1.5 border-t border-line pt-3" data-testid="relic-bar">
      <span className="eyebrow">유물 — 쓰면 이 사건을 선택지 대신 처리합니다</span>
      <div className="flex flex-wrap gap-2">
        {relics.map((r) => (
          <button key={r.id} type="button" onClick={() => use(r.id)} title={r.desc}
            className="text-left font-ui text-[13px] px-3 py-1.5 rounded-[3px] border border-gold-dim text-gold hover:border-gold bg-[#2a2216]">
            ◆ {r.name}<span className="block text-[11px] text-muted">{r.choice.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
