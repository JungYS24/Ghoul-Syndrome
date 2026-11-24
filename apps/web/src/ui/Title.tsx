import { useState } from "react";
import { DIFFICULTIES, DIFFICULTY_IDS, ENDINGS, FACTIONS, LEGACY_PERKS, FACTION_IDS, type Difficulty, type FactionId } from "@guul/engine";
import { content } from "@guul/content";
import { useGame } from "../store/store";
import { Illus } from "../art/Art";
import { MuteToggle } from "./MuteToggle";
import { RulesSheet, SettingsSheet } from "./Sheets";
import { parseShare } from "../store/share";
import { VERSION_LABEL } from "./version";

const shared = typeof window !== "undefined" ? parseShare(window.location.search) : {};

const CREST: Record<FactionId, string[]> = { arkandal: ["shield"], iruth: ["snowflake"], voodoo: ["eye"] };

export function Title() {
  const start = useGame((z) => z.start);
  const startRealtime = useGame((z) => z.startRealtime);
  const hasSave = useGame((z) => z.hasSave);
  const saveInfo = useGame((z) => z.saveInfo);
  const cont = useGame((z) => z.continueSave);
  const book = useGame((z) => z.book);
  const [seed, setSeed] = useState(() => String(shared.seed ?? Math.floor(Math.random() * 900000) + 100000));
  const [diff, setDiff] = useState<Difficulty>(shared.difficulty ?? "normal");
  const [mode, setMode] = useState<"turn" | "realtime">("realtime");
  const begin = (id: FactionId) => { const sd = (parseInt(seed, 10) || 1) >>> 0; if (mode === "realtime") startRealtime(id, sd, diff); else start(id, sd, diff); };
  const [rules, setRules] = useState(false);
  const [settings, setSettings] = useState(false);
  const legacy = useGame((z) => z.legacy);
  const buyPerk = useGame((z) => z.buyPerk);
  const got = ENDINGS.filter((e) => book[e.id]).length;
  const seg = (on: boolean, danger = false) =>
    `px-3 py-1.5 rounded-[2px] border font-ui text-[13px] ${on ? (danger ? "border-blood text-blood bg-[#2a1712]" : "border-gold text-gold bg-[#2a2216]") : "border-line text-muted hover:text-ink"}`;
  return (
    <section className="lobby gutter max-w-[980px] mx-auto pb-10" style={{ paddingTop: "max(18px, env(safe-area-inset-top, 0px))" }}>
      {/* 상단: 작은 표기 + 규칙·설정·소리 */}
      <div className="flex justify-between items-center gap-3">
        <span className="eyebrow">The Game of Peace</span>
        <div className="flex gap-1.5">
          <button className="btn !py-1 !px-2.5 !text-[12px]" onClick={() => setRules(true)}>규칙</button>
          <button className="btn !py-1 !px-2.5 !text-[12px]" onClick={() => setSettings(true)}>설정</button>
          <MuteToggle />
        </div>
      </div>

      {/* 제목 */}
      <header className="text-center py-8 sm:py-10 grid gap-2 justify-items-center">
        <h1 className="font-display text-[clamp(46px,10vw,88px)] leading-none">구울 <span className="text-gold">증후군</span></h1>
        <p className="text-muted m-0 max-w-[56ch] text-[15px] [word-break:keep-all]">시신이 다시 일어나는 대륙. 세 세력 중 하나로 40계절을 버티십시오.</p>
        <details className="max-w-[640px] text-left mt-1">
          <summary className="font-ui text-[12px] text-gold-dim cursor-pointer text-center list-none">배경 이야기 ▾</summary>
          <div className="grid gap-1.5 mt-2 p-3.5 border-l-2 border-gold-dim bg-gradient-to-r from-[#1f1a14] to-transparent text-[14px] text-muted">
            <div><b className="text-ink font-bold">749년, 발푸르기스의 밤.</b> 마도왕 필립스 프리오는 재가 되고 불의 신 그니스는 소멸했습니다. 인공신 스틱스 아이루스가 아이루스 공국을 지키고, 여신 샤리아의 진노는 0으로 돌아왔습니다.</div>
            <div><b className="text-ink font-bold">752년, 라벤 폐허.</b> 몰락한 마도왕국의 옛 영토에서 구울 증후군이 처음 발병했습니다. 물린 사람은 한 계절 뒤 같은 것이 됩니다.</div>
            <div><b className="text-ink font-bold">759년 봄.</b> 세 세력은 서로를 구원자이자 감염원으로 의심합니다. 여신은 침묵하지만, 무고한 피는 여전히 셈하고 있습니다.</div>
          </div>
        </details>
      </header>

      {hasSave && (
        <div className="mb-5 flex flex-wrap items-center gap-2.5 p-3 border border-gold-dim rounded bg-[#1f1a14]" data-testid="continue-banner">
          <span className="font-ui text-[13px] text-muted">저장된 통치{saveInfo ? ` — ${FACTIONS[saveInfo.faction].short} · ${saveInfo.turn}/40턴` : ""}</span>
          <button className="btn-gold !py-1.5 ml-auto" onClick={cont}>이어하기</button>
        </div>
      )}
      {shared.seed !== undefined && (
        <p className="font-ui text-[13px] text-gold text-center m-0 mb-3">공유 링크 — 시드 {shared.seed}{shared.difficulty ? ` · ${DIFFICULTIES[shared.difficulty].name}` : ""}</p>
      )}

      {/* 설정 한 줄: 진행 방식 · 난이도 · 시드 */}
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2.5 mb-5">
        <div className="flex items-center gap-1" role="group" aria-label="진행 방식">
          <button type="button" aria-pressed={mode === "realtime"} onClick={() => setMode("realtime")} className={seg(mode === "realtime")} title="시간이 흐르고 15초 안에 선택 (배속·일시정지 가능)">실시간</button>
          <button type="button" aria-pressed={mode === "turn"} onClick={() => setMode("turn")} className={seg(mode === "turn")} title="한 단계씩 천천히">턴제</button>
        </div>
        <div className="flex items-center gap-1" role="group" aria-label="난이도">
          {DIFFICULTY_IDS.map((d) => (
            <button key={d} type="button" aria-pressed={diff === d} onClick={() => setDiff(d)} title={DIFFICULTIES[d].desc} className={seg(diff === d, d === "hell")}>{DIFFICULTIES[d].name}</button>
          ))}
        </div>
        <label htmlFor="seed" className="flex items-center gap-1.5 font-ui text-[12px] text-faint">시드
          <input id="seed" inputMode="numeric" value={seed} onChange={(e) => setSeed(e.target.value.replace(/\D/g, ""))}
            className="bg-panel border border-line text-ink px-2 py-1.5 rounded-[2px] w-[92px] font-ui text-[13px] tabular-nums" />
        </label>
      </div>

      {/* 세력 선택: 한 문장 + 승리 조건 (강점·약점은 마우스를 올리면) */}
      <div className="grid gap-3 sm:grid-cols-3">
        {FACTION_IDS.map((id) => {
          const F = FACTIONS[id];
          return (
            <button key={id} onClick={() => begin(id)} title={`강점: ${F.strength}\n약점: ${F.weakness}`}
              className={`text-left bg-panel border rounded p-4 grid gap-2 content-start hover:border-gold-dim hover:-translate-y-0.5 transition-all ${shared.faction === id ? "border-gold" : "border-line"}`} data-faction={id}>
              <div className="flex items-center gap-2.5">
                <span className="w-10 h-10 shrink-0"><Illus keys={CREST[id]} faction={id} accent /></span>
                <h2 className="font-display text-[24px] leading-tight">{F.name}</h2>
              </div>
              <p className="m-0 text-[14px] text-[#d9cdb6]">{F.tagline}</p>
              <p className="m-0 font-ui text-[12px] text-faint">승리 · {F.victoryText}</p>
              <span className="font-ui text-[13px] text-gold mt-0.5">{shared.faction === id ? "공유된 판으로 시작 →" : "시작 →"}</span>
            </button>
          );
        })}
      </div>

      {/* 부가 정보는 접어 둠 */}
      <div className="grid gap-2 mt-8">
        <details className="border border-line rounded-[3px] bg-[#15120e]">
          <summary className="flex justify-between items-center px-3.5 py-2.5 cursor-pointer list-none">
            <span className="eyebrow">엔딩 컬렉션</span><span className="font-ui text-[12px] text-muted tabular-nums">{got} / {ENDINGS.length} ▾</span>
          </summary>
          <div className="px-3.5 pb-3.5"><EndingCollection /></div>
        </details>
        <details className="border border-line rounded-[3px] bg-[#15120e]" data-testid="legacy-panel">
          <summary className="flex justify-between items-center px-3.5 py-2.5 cursor-pointer list-none">
            <span className="eyebrow">역사의 유산</span><span className="font-ui text-[12px] text-gold">{legacy.points}점 ▾</span>
          </summary>
          <div className="px-3.5 pb-3.5 grid gap-1.5">
            <p className="m-0 font-ui text-[12px] text-faint">엔딩을 볼 때마다 점수를 얻고(승리 3, 생존 1~3, 패배 1~, 어려움 +1, 지옥 +2), 영구 보너스를 삽니다. 시드 공유 링크에는 포함되지 않습니다.</p>
            <div className="grid gap-1.5 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
              {LEGACY_PERKS.map((p) => {
                const owned = legacy.perks.includes(p.id);
                return (
                  <button key={p.id} type="button" disabled={owned || legacy.points < p.cost} onClick={() => buyPerk(p.id)}
                    className={`text-left font-ui text-[12px] p-2 rounded-[3px] border ${owned ? "border-gold text-gold" : "border-line text-muted"} disabled:opacity-60`}>
                    <b className="text-ink font-medium">{p.name}</b> {owned ? "✓ 보유" : `· ${p.cost}점`}<span className="block text-faint">{p.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </details>
      </div>

      {/* 바닥글: 버전·수정 시각 (빌드할 때 자동 기록) */}
      <footer className="mt-8 pt-3 border-t border-line flex flex-wrap justify-between gap-2 font-ui text-[11px] text-faint">
        <span data-testid="version">{VERSION_LABEL}</span>
        <span>카드 {content.cards.length}장 · <a className="text-gold-dim underline" href="./dice.html">주사위 데모</a> · <a className="text-gold-dim underline" href="./art.html">일러스트</a></span>
      </footer>
      {rules && <RulesSheet onClose={() => setRules(false)} />}
      {settings && <SettingsSheet onClose={() => setSettings(false)} />}
    </section>
  );
}

const TYPE_LABEL = { victory: "승리", defeat: "패배", survive: "생존" } as const;
const TYPE_CLASS = { victory: "text-gold border-gold-dim", defeat: "text-blood border-[#5a3328]", survive: "text-frost border-[#3d5560]" } as const;

/** 엔딩 컬렉션 — IndexedDB 에 저장된 달성 기록 */
function EndingCollection() {
  const book = useGame((z) => z.book);
  return (
    <ul className="m-0 p-0 list-none grid gap-1.5 [grid-template-columns:repeat(auto-fill,minmax(190px,1fr))]" aria-label="엔딩 컬렉션">
      {ENDINGS.map((e) => {
        const rec = book[e.id];
        const who = e.factions ? e.factions.map((f) => FACTIONS[f].short).join("·") : "공통";
        return (
          <li key={e.id} className={`bg-panel border rounded-[3px] px-2.5 py-2 grid gap-0.5 ${rec ? "border-line2" : "border-line opacity-60"}`} title={rec ? e.text : "아직 보지 못한 결말"}>
            <span className="flex items-center gap-1.5 font-ui text-[11px]"><span className={`px-1 border rounded-[2px] ${TYPE_CLASS[e.type]}`}>{TYPE_LABEL[e.type]}</span><span className="text-faint">{who}</span></span>
            <b className="font-display text-[17px] font-normal leading-tight">{rec ? e.title : "？？？"}</b>
            {rec && <span className="font-ui text-[11px] text-faint tabular-nums">{rec.count}회 · 최고 {DIFFICULTIES[rec.bestDifficulty].name}</span>}
          </li>
        );
      })}
    </ul>
  );
}
