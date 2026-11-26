# 전쟁 시스템 + 필요한 일러스트

> 상태: **구현됨, 일러스트 28장 적용 완료** (엔진 `packages/engine/src/war.ts`, 카드 `content.json`의 `warCards`, 화면 `apps/web/src/ui/War.tsx`).
> 아래 "확정한 규칙"은 사용자 답변을 반영한 것입니다.

## 1. 흐름

```
평시 ──(행동 추천 4칸에 가끔 "⚔ 전쟁 준비")──▶ 준비 1/2 ──(같은 상대로 한 번 더 / 판정값 80↑)──▶ 선전포고 가능
                                                                                       │ "⚔ 선전포고" (추천 칸 맨 앞, 행동권 없음)
타 세력이 선포 (우리 질서·민심 ≤ 50 이고 그 세력과 관계 ≤ 30 일 때 확률적으로) ─────────┤
                                                                                       ▼
            전시: 계절마다 전쟁 카드 2장 + 역병 사건 1장 · 상단에 늘 하얀 "🏳 항복" 버튼
                                                                                       ▼
            수도 점령(전선 100) / 군주 포박(추적 100) / 적 항복(적 피로 100) → 승리
            우리 수도 함락(전선 0) / 우리 군주 포박(추적 −100) / 우리 피로 100 / 항복 버튼 → 패배
                                                                                       ▼
            도시가 넘어가고 지도 색이 바뀜 · 4계절 휴전
```

## 2. 확정한 규칙

| 항목 | 규칙 |
|---|---|
| 준비 연속 | **계절을 넘겨도 이어짐.** 다른 행동·법령 공포/철회를 하면 끊김(선포 가능 상태는 유지) |
| 준비 판정 | 질서(부두교는 제어). 성공 시 준비 1단계, 같은 상대로 다시 성공하면 선포 가능, **판정값 80 이상이면 한 번에** 선포 가능. 실패하면 그 세력과 관계 −10, 준비 초기화 |
| 준비 비용 | 실링 4 · 광석 4 (부두교는 광석 4) + 행동권 1 |
| 추천 4칸 | 병력이 시작보다 20% 많거나 관계 30 이하 세력이 있으면 자주, 아니면 가끔 등장. 준비 중이면 항상 등장. 선포 가능하면 "선전포고"가 맨 앞에 고정 |
| AI 선포 | 계절 시작에 검사. 우리 **질서·민심 중 낮은 쪽 ≤ 50** 이고 **관계 ≤ 30** 이면 확률 10% + (30 − 관계)% (난이도 배율, 최대 60%). **부두교를 할 때는 제어·신앙**, 관계 대신 **은닉**으로 봄 |
| 전시 사건 | 계절마다 **전쟁 카드 2장 + 역병 사건 1장**(가운데) |
| 전쟁 판정 보정 | 병력 차이(우리 − 적 추정 전력) × 1.5, ±8 |
| 계절 경과 | 우리 피로 +6, 적 피로 +5 (전쟁이 끝없이 늘어지지 않게) |
| 항복 버튼 | 전시엔 상단 바에 **하얀 🏳 항복** 버튼이 늘 있음(한 번 더 눌러 확정). 스스로 항복하면 **자원·도시 1/3만** 내줌 |
| 패배 | 자원 **절반**(실링·식량·광석·정화석·먹이) 배상, 우리 비수도 도시 **절반(올림)** 양도, 민심 −15·질서 −10. 수도 함락이면 수도도 넘어감 |
| 승리 | 자원마다 우리 현재치의 50%(최소 20) 획득, 적 비수도 도시 **절반(올림)** 획득(수도 점령이면 적 수도까지), 정통성 +10, 진노 +5 |
| 군주 포박 패배 | 우리 군주가 포박되면(군주 추적 −100) **즉시 게임 종료 — 엔딩 "패배의 댓가"**(하얀 깃발). 수도 함락·항복은 배상 후 게임이 이어짐 |
| 정복왕 | 도시 13곳 중 **10곳**을 차지하는 순간 **즉시 승리 — 엔딩 "정복왕 — 백마를 탄 왕"** |
| 휴전 | 결판 후 그 세력과 **4계절** 동안 다시 전쟁 불가. "휴전 제안" 카드를 받아들이면 아무것도 오가지 않고 끝남 |
| 도시와 생산 | 처음보다 도시가 1개 많을 때마다 생산 **+4%**, 적으면 −4% (식량·실링·광석·정화석, 유지비는 그대로) |
| 수도·군주 | 아르칸달: 아이언 팽 · 영웅왕 전운 / 아이루스: 벨로링크 · 대공 / 부두교: **에테르 라티스 · 대사제** |
| 지도 | 도시마다 영향권(보로노이 칸)을 두고, 주인이 바뀐 도시의 땅을 새 주인 색으로 칠함. 점령된 도시는 새 주인 색 고리 |

## 3. 3국 공용 전쟁 카드 (18장, 구현됨)

모든 카드는 세 세력이 같이 씁니다(문구에 특정 세력·도시 이름 없음). 선택지마다 결과 문장 5구간이 있습니다.

| # | 파일 id | 카드 | 선택지 | 나오는 조건 |
|---|---|---|---|---|
| 1 | `war-naval` | 해상전 | 함대로 정면 승부 / 항구를 걸어 잠그고 버틴다 | 항상 |
| 2 | `war-cavalry` | 기마전 | 기병 돌격 / 창병 방진으로 받아친다 | 항상 |
| 3 | `war-siege` | 공성전 | 공성 병기를 끌어온다 / 성을 에워싸 굶긴다 | 항상 (자주) |
| 4 | `war-night-raid` | 야습 | 어둠을 틈타 진영을 친다 / 경계를 두 배로 | 항상 |
| 5 | `war-supply` | 보급선 기습 | 호위대를 붙인다 / 적 보급선을 덮친다 | 항상 |
| 6 | `war-ambush` | 협곡 매복 | 협곡 위에 매복 / 우회해 진군 | 항상 |
| 7 | `war-river` | 도하전 | 밤에 강을 건넌다 / 부교를 놓는다 | 항상 |
| 8 | `war-spy` | 첩보전 | 첩자를 깊이 심는다 / 거짓 정보를 흘린다 | 항상 |
| 9 | `war-deserters` | 탈영 | 본보기로 처형 / 급료를 올린다 | 항상 |
| 10 | `war-mercenary` | 용병 계약 | 용병단을 산다 / 웃돈만 쥐여 준다 | 항상 |
| 11 | `war-prisoners` | 포로 | 포로를 교환 / 노역장에 보낸다 | 항상 |
| 12 | `war-plague-camp` | 역병 도는 진영 | 천막째 불태운다 / 병자를 적진으로 내몬다 | 항상 |
| 13 | `war-counterattack` | 적의 반격 | 진지를 사수 / 물러나 전열 정비 | 전선 ≤ 55 |
| 14 | `war-capital-siege` | 수도 포위 | 총공격 / 포위를 조인다 | 전선 ≥ 65 |
| 15 | `war-ruler-hunt` | 군주 추격 | 추격대를 보낸다 / 현상금을 건다 | 전선 ≥ 55 |
| 16 | `war-home-defense` | 수도 방어 | 시민까지 무장 / 군주를 피신시킨다 | 전선 ≤ 35 |
| 17 | `war-truce-offer` | 휴전 제안 | 휴전을 받아들인다 / 거절하고 밀어붙인다 | 적 피로 ≥ 40 |
| 18 | `war-surrender-demand` | 항복 권고 | 항복을 권한다 / 칼을 보낸다 | 적 피로 ≥ 60 |

## 4. 만들 일러스트 — 28장 = 4분할 시트 7장

전쟁 일러스트 26장 + 새 엔딩 배너 2장(**패배의 댓가**, **정복왕 / 백마를 탄 왕**) = **28장 = 2×2 시트 7장**.
시트마다 아래 STYLE 블록을 그대로 붙이고, PALETTE와 네 칸만 바꿔 넣으면 됩니다. 잘라 낸 칸은 512×512 WebP로 `apps/web/public/headers/<파일 id>.webp`에 넣습니다.

> 생성기 로고는 시트 오른쪽 아래, 즉 **④칸 오른쪽 아래 모서리**에 찍힙니다. STYLE 끝에 그 모서리를 빈 배경으로 두라는 문장을 넣어 두어, 로고가 그림 위가 아니라 빈 바탕에 찍혀 지우기 쉬워집니다(NPC 9장처럼 제가 지워 드릴 수도 있습니다).

### 공통 STYLE (모든 시트 동일)

```
STYLE (keep identical across every sheet in this set): one single SQUARE image, cleanly divided into a 2x2 grid of FOUR separate square panels, a thin dark gutter (~3% of width) between panels and a matching margin on the outer edge so each panel can be cropped out as an independent square icon. Each panel is a SELF-CONTAINED illustration, its subject centered with comfortable padding (nothing important touches a panel edge). Art style: flat vector heraldic illustration with a medieval woodcut feel; bold uniform 2px-weight dark outlines; NO gradients, NO photo realism, NO 3D; limited flat palette; dark charcoal background #14110e in every panel; iconic, simple, legible at small size. ABSOLUTELY NO text, letters, numbers, runes or labels anywhere (scrolls and maps show only blank lines). No outer decorative frame. Consistent lighting and line weight across all four panels. Keep the bottom-right corner of panel ④ as plain empty background.
```

### 시트 1 — 선포와 준비

```
PALETTE for this sheet: blood crimson + tarnished iron grey accent, war-drum dread mood.

Four panels:
① a war map pinned to a drill board with crossed spears and a marching drum
② a torn treaty scroll pierced by an upright sword; a lit beacon brazier
③ a closed city gate with a blood-stained enemy banner planted before it; a war horn
④ a broken spear lying across a sealed peace scroll; an olive branch
```

### 시트 2 — 승리와 패배

```
PALETTE for this sheet: aged gold + ember red accent, triumph-and-ruin mood.

Four panels:
① a victory banner planted on a captured castle tower; small flames below
② an empty toppled crown wrapped in heavy chains; a shackle key
③ a surrender scroll stamped with a wax seal; a sword laid flat beside it
④ a burning castle keep behind a fallen torn banner on the ground
```

### 시트 3 — 새 엔딩 2장 + 결정적 전쟁 카드

```
PALETTE for this sheet: bone white + cold steel blue + aged gold accent, solemn and final mood.

Four panels:
① a tattered white flag on a short pole above a spilled coin chest and a handed-over city key (the price of defeat)
② a crowned king on a rearing white horse holding a raised sword, a small row of conquered castle towers behind (the conqueror)
③ a besieged city wall with a scaling ladder and a siege tower; a rising column of smoke
④ a dropped crown on a forest path; a hunting horn and scattered arrows
```

### 시트 4 — 들판과 물의 전투

```
PALETTE for this sheet: storm teal + iron grey + amber spark accent, open-battlefield mood.

Four panels:
① a burning warship prow ramming another hull among waves
② a charging armored warhorse with a lance and a streaming pennant
③ a pontoon bridge over a swollen river; a shield floating on the water
④ a narrow rocky canyon with a drawn longbow and a quiver on the cliff edge
```

### 시트 5 — 성과 진영의 전투

```
PALETTE for this sheet: fire orange + soot black + iron accent, siege-and-fire mood.

Four panels:
① a wooden trebuchet hurling a flaming stone at a fortress wall
② a crescent moon over a burning tent; a torch and a curved dagger
③ a wall of overlapping round shields with spears pointing forward
④ a city gate barred with a heavy beam; a pitchfork and a militia helmet before it
```

### 시트 6 — 군영

```
PALETTE for this sheet: muddy ochre + worn leather brown + tarnished silver accent, weary-camp mood.

Four panels:
① an overturned supply cart with spilled grain sacks; a broken wheel with an arrow stuck in it
② an empty army tent with its flap open; abandoned boots and a dropped helmet
③ a heavy coin purse on a war drum; a broad mercenary sword and a gauntlet
④ a row of iron shackles chained to a post; a jailer key ring
```

### 시트 7 — 첩보·역병·협상

```
PALETTE for this sheet: sickly plague green + parchment beige + candle amber accent, intrigue-and-pestilence mood.

Four panels:
① an open eye over a folded map with a dagger; a single candle
② a sick-tent with a hanging plague lantern; a clawed ghoul hand reaching from under the flap
③ a white flag carried on a lance beside a sealed envoy letter
④ a rolled demand scroll with a heavy seal laid on a broken shield
```

### 파일 이름표 (자른 뒤 이 이름으로 저장)

| 시트 | ① | ② | ③ | ④ |
|---|---|---|---|---|
| 1 | war-prep | war-declare | war-declared-on-us | war-truce |
| 2 | war-win-capital | war-win-ruler | war-win-surrender | war-lose |
| 3 | end-d-war-price | end-v-conqueror | war-capital-siege | war-ruler-hunt |
| 4 | war-naval | war-cavalry | war-river | war-ambush |
| 5 | war-siege | war-night-raid | war-counterattack | war-home-defense |
| 6 | war-supply | war-deserters | war-mercenary | war-prisoners |
| 7 | war-spy | war-plague-camp | war-truce-offer | war-surrender-demand |
