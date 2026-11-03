// 평면 벡터 20면체 — 육각 윤곽 + 정면 삼각면
interface Props { value: number; state: "idle" | "rolling" | "landed"; highlight?: "max" | "min" | null }
const HEX = "50,4 90,27 90,73 50,96 10,73 10,27";
const TRI = "50,24 75,66 25,66";
export function D20({ value, state, highlight }: Props) {
  const face = highlight === "max" ? "#f0d58a" : highlight === "min" ? "#e2a493" : "#eadcbc";
  const side = highlight === "max" ? "#cfa752" : highlight === "min" ? "#b4513a" : "#bfae88";
  return (
    <svg viewBox="0 0 100 100" className="block w-full h-full" aria-hidden="true">
      <polygon points={HEX} fill={side} stroke="#2a2118" strokeWidth="2.5" strokeLinejoin="round" />
      <polygon points="50,4 90,27 50,24" fill="#d6c7a2" stroke="#2a2118" strokeWidth="2" strokeLinejoin="round" />
      <polygon points="50,4 10,27 50,24" fill="#cdbd97" stroke="#2a2118" strokeWidth="2" strokeLinejoin="round" />
      <polygon points="90,27 90,73 75,66" fill="#a99873" stroke="#2a2118" strokeWidth="2" strokeLinejoin="round" />
      <polygon points="10,27 10,73 25,66" fill="#b3a27c" stroke="#2a2118" strokeWidth="2" strokeLinejoin="round" />
      <polygon points="25,66 75,66 50,96" fill="#9d8c68" stroke="#2a2118" strokeWidth="2" strokeLinejoin="round" />
      <polyline points="90,27 75,66 90,73 75,66 50,96 25,66 10,73 25,66 10,27 50,24 90,27" fill="none" stroke="#2a2118" strokeWidth="2" strokeLinejoin="round" />
      <polygon points={TRI} fill={face} stroke="#2a2118" strokeWidth="2" strokeLinejoin="round" />
      <text x="50" y="57" textAnchor="middle" dominantBaseline="middle"
        style={{ font: `${state === "landed" ? 24 : 20}px "Song Myung", serif`, transition: "font-size .2s" }} fill="#1d150a">
        {value}
      </text>
    </svg>
  );
}
