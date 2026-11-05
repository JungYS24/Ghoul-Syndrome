import { infStage, type GameState, type RegionId } from "@guul/engine";
import { useGame } from "../store/store";
import { regionCollapsed, regionOpacity } from "./mapShade";

type Zone = "arkandal" | "iruth" | "neutral";
// 단순화한 대륙: 서쪽 아르칸달 군국, 동쪽 해안 아이루스 공국, 남쪽 중앙 라벤 폐허(중립지)
const ZONES: Record<Zone, { d: string; label: [number, number]; name: string }> = {
  arkandal: { d: "M18 34 L118 18 L146 70 L112 122 L44 134 L12 86 Z", label: [70, 76], name: "아르칸달" },
  iruth: { d: "M186 22 L292 30 L308 92 L282 152 L212 142 L180 84 Z", label: [244, 84], name: "아이루스" },
  neutral: { d: "M112 122 L146 70 L180 84 L212 142 L192 186 L102 182 L68 152 Z", label: [142, 140], name: "라벤 폐허" },
};

/** 대시보드 확산 지도 — 감염도에 따라 구역 색이 진해집니다. 부두교는 구역을 눌러 확산 대상을 고릅니다. */
export function ContinentMap({ s }: { s: GameState }) {
  const setTarget = useGame((z) => z.setTarget);
  const V = s.faction === "voodoo";
  const canPick = V && s.phase === "action";
  return (
    <figure className="m-0 grid gap-1">
      <svg viewBox="0 0 320 200" className="w-full h-auto block rounded-[3px] bg-[#101418] border border-line" role="img"
        aria-label={`대륙 확산 지도: ${(Object.keys(ZONES) as Zone[]).map((z) => `${ZONES[z].name} 감염도 ${s.infection[z]}`).join(", ")}`}>
        <defs>
          <pattern id="sea" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 6 Q2 4 4 6 T8 6" stroke="#1d2a33" fill="none" strokeWidth="1" /></pattern>
        </defs>
        <rect width="320" height="200" fill="url(#sea)" />
        {(Object.keys(ZONES) as Zone[]).map((z) => {
          const inf = s.infection[z];
          const mine = z === s.faction;
          const targeted = V && s.target === z;
          return (
            <g key={z} onClick={canPick ? () => setTarget(z as RegionId) : undefined} style={canPick ? { cursor: "pointer" } : undefined}>
              <path d={ZONES[z].d} fill="#211b15" stroke="none" />
              <path d={ZONES[z].d} fill="#93a548" fillOpacity={regionOpacity(inf)} className="transition-[fill-opacity] duration-700"
                stroke={regionCollapsed(inf) ? "#b4513a" : mine ? "#cfa752" : targeted ? "#9b5de5" : "#54473a"}
                strokeWidth={mine || targeted || regionCollapsed(inf) ? 2.5 : 1.2} strokeDasharray={targeted ? "5 3" : undefined} strokeLinejoin="round" />
              <text x={ZONES[z].label[0]} y={ZONES[z].label[1] - 6} textAnchor="middle" className="font-ui" fontSize="12" fill="#ebe0cb" stroke="#14110e" strokeWidth="3" paintOrder="stroke">{ZONES[z].name}</text>
              <text x={ZONES[z].label[0]} y={ZONES[z].label[1] + 10} textAnchor="middle" className="font-ui" fontSize="11" fill="#ebe0cb" stroke="#14110e" strokeWidth="3" paintOrder="stroke">{inf} · {infStage(inf)}</text>
            </g>
          );
        })}
        {/* 부두교 본거지: 라벤 폐허 남쪽 늪 */}
        <g aria-hidden="true"><circle cx="128" cy="170" r="4" fill="#9b5de5" fillOpacity={V ? 0.9 : 0.5} /><text x="136" y="174" fontSize="9" fill="#d8c3f3" className="font-ui">교단</text></g>
      </svg>
      <figcaption className="font-ui text-[11px] text-faint flex flex-wrap gap-x-3">
        <span><i className={`inline-block w-2.5 h-2.5 align-middle mr-1 border ${V ? "border-dashed border-[#9b5de5]" : "border-gold"}`} />{V ? "점선: 확산 대상" : "금테: 우리 땅"}</span>
        <span>색이 진할수록 감염도가 높음{canPick ? " · 구역을 눌러 확산 대상 지정" : ""}</span>
      </figcaption>
    </figure>
  );
}
