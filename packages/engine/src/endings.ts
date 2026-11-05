// 엔딩 컬렉션 — 승리·패배·생존 유형마다 고유 문구. 화면은 id 로 달성 기록을 모읍니다.
import { SEASON_KO, FACTIONS, seasonOf, yearOf } from "./factions";
import { josa } from "./news";
import type { Decree, Ending, FactionId, GameState } from "./types";

export interface EndingDef {
  id: string;
  type: Ending["type"];
  /** 이 세력으로만 볼 수 있는 엔딩 (없으면 공통) */
  factions?: FactionId[];
  title: string;
  text: string;
}

const K: FactionId[] = ["arkandal", "iruth"];
export const ENDINGS: EndingDef[] = [
  // 승리
  { id: "v-arkandal-wall", type: "victory", factions: ["arkandal"], title: "철벽의 대륙", text: "방벽망이 완성되고 국경 안의 역병이 잦아들었습니다. 영웅왕 전운의 깃발이 대륙을 굽어봅니다." },
  { id: "v-iruth-cure", type: "victory", factions: ["iruth"], title: "치료제 완성", text: "벨로링크의 빙철 증류기에서 첫 치료제가 나왔습니다. 구울로 변해 가던 자들이 다시 이름을 부르기 시작합니다." },
  { id: "v-voodoo-grace", type: "victory", factions: ["voodoo"], title: "대륙 구울화", text: "대륙 감염 진척이 두 계절 연속 85를 넘었습니다. 죽은 자가 밭을 갈고, 산 자는 그 곁에서 무릎을 꿇습니다. 은총이 완성되었습니다." },
  // 패배 — 게이지 붕괴
  { id: "d-morale", type: "defeat", factions: K, title: "민심의 붕괴", text: "굶주린 군중이 곡창 문을 부수고 들어왔습니다. 왕의 초상은 광장의 모닥불에서 마지막으로 웃었습니다." },
  { id: "d-order", type: "defeat", factions: K, title: "질서의 붕괴", text: "야경대는 사라지고 성문은 아무도 지키지 않습니다. 구울과 약탈자가 같은 거리를 나눠 씁니다." },
  { id: "d-finance", type: "defeat", factions: K, title: "재정의 붕괴", text: "금고의 마지막 실링이 용병의 품으로 들어갔습니다. 다음 날 아침, 용병들은 반대편 깃발을 들고 있었습니다." },
  { id: "d-legit", type: "defeat", factions: K, title: "정통성의 붕괴", text: "귀족 의회가 왕관을 탁자 위에 내려놓았습니다. 누구도 그것을 다시 집어 들려 하지 않았습니다." },
  { id: "d-faith", type: "defeat", factions: ["voodoo"], title: "신앙의 붕괴", text: "제단의 불이 꺼졌습니다. 신도들은 하나둘 늪을 떠났고, 남은 구울만이 빈 예배당을 서성입니다." },
  { id: "d-control", type: "defeat", factions: ["voodoo"], title: "제어의 붕괴", text: "사슬이 끊겼습니다. 은총이라 부르던 것들이 처음으로 교단의 사제들을 먹었습니다." },
  { id: "d-offering", type: "defeat", factions: ["voodoo"], title: "제물의 붕괴", text: "바칠 것이 남지 않은 제단 앞에서, 대사제는 마지막 제물로 자신을 올렸습니다. 아무 일도 일어나지 않았습니다." },
  { id: "d-stealth", type: "defeat", factions: ["voodoo"], title: "대토벌", text: "교단의 은신처가 모두 드러났습니다. 아르칸달과 아이루스의 연합군이 제단을 불태웠습니다." },
  // 패배 — 그 밖의 원인
  { id: "d-empty", type: "defeat", title: "텅 빈 나라", text: "살아남은 자가 시작의 15%도 남지 않았습니다. 바람만이 빈 집의 문을 여닫습니다." },
  { id: "d-capital", type: "defeat", factions: K, title: "수도 함락", text: "감염도 100이 세 계절 동안 이어졌습니다. 수도의 성문이 안쪽에서 열렸습니다." },
  { id: "d-continent", type: "defeat", factions: K, title: "대륙 구울화", text: "구울 부두교의 은총이 대륙을 덮었습니다. 산 자의 왕국들은 동시에 침묵했습니다." },
  { id: "d-voodoo-cure", type: "defeat", factions: ["voodoo"], title: "치료제 완성", text: "아이루스가 치료제를 완성했습니다. 은총은 병으로 불리며 씻겨 나갔고, 교단은 이단으로 남았습니다." },
  { id: "d-voodoo-wall", type: "defeat", factions: ["voodoo"], title: "철벽의 대륙", text: "아르칸달의 방벽망이 완성되었습니다. 구울은 성벽 앞에서 멈추었고, 늪은 다시 늪이 되었습니다." },
  // 생존
  { id: "s-iruth-led", type: "survive", factions: ["arkandal"], title: "치료제 완성 — 아이루스 주도", text: "아이루스가 치료제를 완성했습니다. 아르칸달은 살아남았지만 대륙의 패권은 상인들에게 넘어갔습니다." },
  { id: "s-S", type: "survive", title: "생존 등급 S", text: "10년의 밤이 끝났습니다. 승리의 깃발은 없지만, 후대는 이 시대를 '버텨 낸 열 해'라고 부를 것입니다." },
  { id: "s-A", type: "survive", title: "생존 등급 A", text: "10년의 밤이 끝났습니다. 상처는 깊어도 나라는 곧게 서 있고, 아이들은 다시 들판에서 뜁니다." },
  { id: "s-B", type: "survive", title: "생존 등급 B", text: "10년의 밤이 끝났습니다. 승리 조건을 이루지는 못했지만, 나라는 아직 서 있습니다." },
  { id: "s-C", type: "survive", title: "생존 등급 C", text: "10년의 밤이 끝났습니다. 살아남았다고 말하기엔 잃은 것이 너무 많습니다." },
  { id: "s-D", type: "survive", title: "생존 등급 D", text: "10년의 밤이 끝났습니다. 깃발은 아직 걸려 있지만, 그 아래 설 사람이 거의 남지 않았습니다." },
];

export function endingDef(id: string): EndingDef {
  const d = ENDINGS.find((e) => e.id === id);
  if (!d) throw new Error(`엔딩 없음: ${id}`);
  return d;
}
export function makeEnding(id: string, extra: Partial<Pick<Ending, "score" | "grade">> = {}): Ending {
  const d = endingDef(id);
  return { id: d.id, type: d.type, title: d.title, text: d.text, ...extra };
}
/** 세력이 볼 수 있는 엔딩 목록 */
export function endingsFor(f: FactionId): EndingDef[] {
  return ENDINGS.filter((e) => !e.factions || e.factions.includes(f));
}

/**
 * 연대기를 요약한 맞춤 후기 1~2문장. 난수를 쓰지 않습니다.
 * 1) 감염도가 가장 높았던 계절과 결말, 2) 공포한 법령과 판정 기록.
 */
export function epilogueOf(s: GameState, decrees: Pick<Decree, "id" | "name">[] = []): string {
  const F = FACTIONS[s.faction];
  const e = s.ended;
  const peak = s.chronicle.reduce<GameState["chronicle"][number] | null>((m, c) => (!m || c.infection > m.infection ? c : m), null);
  const when = peak ? `${peak.year}년 ${peak.season}` : `${yearOf(s.turn)}년 ${SEASON_KO[seasonOf(s.turn)]}`;
  const verb = !e ? "아직 싸우고 있다" : e.type === "victory" ? "끝내 승리를 거두었다" : e.type === "defeat" ? "끝내 무너졌다" : "끝까지 버텨 냈다";
  const first = `감염도가 ${s.maxInfection}까지 치솟았던 ${when}을 지나, ${josa(F.short, "은", "는")} ${s.turn}계절 만에 ${verb}.`;
  const names = s.decreeHistory.map((id) => decrees.find((d) => d.id === id)?.name).filter((n): n is string => !!n);
  const one = names[0] ?? "";
  const law = !names.length ? "" : names.length > 1 ? `「${one}」 등 법령 ${names.length}개를 공포했고, ` : `「${one}」${josa(one, "을", "를").slice(one.length)} 공포했고, `;
  const t = s.tally;
  const rolls = t.rolls ? `${t.rolls}번의 판정에서 대성공 ${t.great}번, 대실패 ${t.fumble}번을 겪었다.` : "주사위는 한 번도 굴러가지 않았다.";
  return `${first} ${law}${rolls}`;
}
