# 픽셀/터미널 디자인 컨셉 — 체크포인트

> 목적: 2기(F2P) + GC 프리뷰의 픽셀/터미널 디자인 실험을 **언제든 롤백**할 수 있게 상태를 박제한다.
> 노아 요청 (2026-07-31): "언제든지 롤백할 수 있도록 적절한 문서에 체크포인트를 만들어놓고."

## 컨셉 요약 (concept B, full send)

- **픽셀 폰트**: Galmuri11 (한글 지원 픽셀 폰트, CDN `https://cdn.jsdelivr.net/npm/galmuri/dist/Galmuri11.woff2`) — 헤드라인/타이틀/섹션 구분에 사용
- **터미널 크롬**: Space Mono — 라벨/넘버/핸들/프롬프트 (`[01]`, `> NOW_CASTING`, 커서 라벨)
- **본문(설명글)**: Pretendard 유지 (가독성) — 노아: "설명글은 지금대로 폰트 스타일 적용"
- **CRT 스캔라인** 오버레이 + **네온 글로우**(핑크) + **청키 픽셀 버튼**(하드 오프셋 그림자, 누르면 밀림) + **샤프 2px 픽셀 보더** + **도트그리드 캔버스 배경**
- **터미널 윈도우 프레임**: 타이틀바 (`fan_to_pro.exe`, 신호등 dots, SEATS 카운터)
- **협업 커서**: 1기 8개국 학생 + Nino 이름. **팬 → 강의 → 경험 → 전문가 → 취업 여정 맵** 노드 사이를 오감
- 브랜드색(핑크 #ec4899 / 남보라 #6366f1) 유지, 다크

## 적용 파일 (프리뷰 전용, 라이브 아님)

- `app/[locale]/f2p2-preview/page.tsx` — F2P 2기 프리뷰
- `app/[locale]/f2p2-preview/glass.module.css` — 픽셀/터미널 유틸 (pixelFont, scanlines, pixelBtn, neon, windowBar, cursor float 등)
- `app/[locale]/gc-preview/page.tsx` — GC 메인 프리뷰 (glass.module.css 재사용)

**전역 `app/globals.css` 는 안 건드림** — 라이브 1기/어드민 회귀 방지 (CLAUDE.md §7.4, [[feedback_1st_cohort_frozen]]).

## 롤백 방법

이 체크포인트 = **승인된 픽셀 히어로 상태** (2026-07-31, 커서 여정 맵/전체 전파 이전).

백업 위치: `docs/design/checkpoints/2026-07-31-pixel-hero/`
- `f2p2-page.tsx.bak` → `app/[locale]/f2p2-preview/page.tsx`
- `f2p2-glass.module.css.bak` → `app/[locale]/f2p2-preview/glass.module.css`
- `gc-page.tsx.bak` → `app/[locale]/gc-preview/page.tsx`

롤백 = 위 .bak 파일을 원위치로 복사(cp) 하면 됨. git HEAD 참고: `6df0321`.

**픽셀 컨셉 자체를 버리고 이전(에디토리얼) 상태로 완전 롤백하려면**: 이 체크포인트가 이미 픽셀 상태이므로, 그 전 상태는 git 이력 또는 별도 백업 필요. 픽셀 도입 직전 상태가 필요하면 알려줄 것.

## 체크포인트 이력

| 날짜 | ID | 상태 | 비고 |
|---|---|---|---|
| 2026-07-31 | pixel-hero | F2P 히어로 = 터미널 윈도우 + Galmuri 픽셀 헤드라인 + 스캔라인 + 픽셀버튼 승인 | 커서 여정 맵/전체 전파 직전 |
