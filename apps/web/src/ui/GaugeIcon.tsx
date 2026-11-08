import type { GaugeKey } from "@guul/engine";

const P: Record<GaugeKey, React.ReactNode> = {
  morale: <path d="M8 14C2 9.5 1 5.5 4 3.6c2-1.1 3.6.1 4 1.4.4-1.3 2-2.5 4-1.4 3 1.9 2 5.9-4 10.4Z" />, // 민심 — 심장
  order: <path d="M8 1.5 14 3.4V8c0 3-2.7 5.4-6 6.6C4.700 13.400 2 11 2 8V3.4Z" />, // 질서 — 방패
  finance: <><circle cx="8" cy="8" r="6.3" /><path d="M8 4v8M5.900 6.300c.6-1 3.600-1 4.200 0M5.900 9.700c.6 1 3.600 1 4.200 0" /></>, // 재정 — 동전
  legit: <><path d="M8 1.500v13M3.800 5.500h8.400" /><circle cx="8" cy="5.500" r="2.200" /></>, // 신앙도 — 광륜 십자
  faith: <path d="M8 1.300c1.900 2.900 4.200 4.600 4.200 8A4.200 4.200 0 0 1 3.800 9.300c0-1.700.9-2.800 2-4.200.3 1.100.9 1.600 1.300 1.600C7 4.700 7.300 2.900 8 1.300Z" />, // 신앙 — 불꽃
  control: <><rect x="1.500" y="5.500" width="7" height="5" rx="2.500" /><rect x="7.500" y="5.500" width="7" height="5" rx="2.500" /></>, // 제어 — 사슬
  offering: <path d="M1.800 7h12.400c0 3.500-2.800 6.200-6.200 6.200S1.800 10.500 1.800 7ZM8 1.800V5.500" />, // 제물 — 제기
  stealth: <path d="M11.500 2A6 6 0 1 0 14 10.500 5 5 0 0 1 11.500 2Z" />, // 은닉 — 초승달
};

/** 게이지 이름 옆에 붙는 작은 선 아이콘 (현재 색을 따라갑니다) */
export function GaugeIcon({ k, className = "w-[14px] h-[14px]" }: { k: GaugeKey; className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={`${className} shrink-0`} fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{P[k]}</svg>
  );
}
