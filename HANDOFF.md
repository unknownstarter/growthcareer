# HANDOFF — Kenter Bootcamp → Growth Career

> **다음 세션 시작 시 가장 먼저 이 문서를 읽으세요.**
> 작성: 2026-04-29 · 사유: 폴더 리네이밍 + 우산 브랜드 전환 직전 컨텍스트 박제.

---

## 1. 한 줄 상황

Kenter Bootcamp 랜딩(14섹션 + 신청 폼 + Supabase RLS)을 완성한 상태에서, **Growth Career** 우산 브랜드로 리포지셔닝하고 **Fan to Pro** 를 첫 K-엔터 트랙으로 두기로 결정. 폴더/레포/도메인 정리가 다음 작업.

## 2. 새 브랜드 구조

- **우산 브랜드**: Growth Career
- **도메인**: `growthcareer.xyz` (가비아 등록 완료, Vercel 미연결)
- **GitHub**: `https://github.com/unknownstarter/growthcareer` (빈 placeholder, push 0회)
- **첫 프로그램**: Fan to Pro — K-엔터 직무 교육
- **라우팅**: `/` → 즉시 `/fan-to-pro` 리다이렉트 (옵션 B 채택). 향후 트랙 추가 시 `/programs/<slug>` 식으로 확장.

## 3. 마이그레이션 절차

### 3-A. 사용자가 수동 실행 (Cursor 닫고 터미널에서)

```bash
# 1. Cursor 의 dev 서버를 닫고 워크스페이스 종료
# 2. 폴더 리네임
mv /Users/noah/Kenter_bootcamp /Users/noah/growthcareer

# 3. 자동 메모리 디렉터리도 함께 이동 (키는 cwd 기반)
mv ~/.claude/projects/-Users-noah-Kenter-bootcamp \
   ~/.claude/projects/-Users-noah-growthcareer

# 4. Cursor 에서 /Users/noah/growthcareer 새로 열기
```

### 3-B. 새 세션의 AI 가 실행 (Phase 6c)

순서대로 진행:

1. **이 HANDOFF.md 를 끝까지 읽기** + `MEMORY.md`, `CLAUDE.md`, `docs/decisions/0001-stack-and-design-decisions.md` 재확인.
2. `package.json` `name` → `growthcareer`.
3. 소스 디렉터리 리네임:
   - `src/kenterbc/` → `src/programs/fan-to-pro/`
   - 모든 `@/src/kenterbc/...` import 경로 일괄 갱신 (Grep + Edit replace_all 권장).
4. 라우트 리네임:
   - `app/kenterbc/page.tsx` → `app/fan-to-pro/page.tsx`
   - `app/page.tsx` 의 `redirect("/kenterbc")` → `redirect("/fan-to-pro")`
5. 카피 갱신:
   - Footer 브랜드 `KENTER · BOOTCAMP` → `GROWTH CAREER` + 부제 *Fan to Pro · K-Entertainment Track*
   - `metadata.title` → `Fan to Pro · Growth Career`
   - `metadata.description` 의 "Kenter Bootcamp" 표현 정리
   - 서버 액션의 INSERT `source` 컬럼 값: `kenterbc-landing` → `fan-to-pro-landing` (런타임 변경, 마이그레이션 불필요)
6. CLAUDE.md 첫 줄 배너의 path 표기 갱신.
7. 검증:
   - `pnpm typecheck`
   - `pnpm preview --routes=/fan-to-pro`
   - `node tools/supabase-verify.mjs`
8. git 초기화 + 첫 푸시:
   ```bash
   git init && git branch -m main
   git add . && git status   # .env.local 빠졌는지 반드시 확인
   git commit -m "feat: initial Growth Career landing — Fan to Pro program"
   git remote add origin https://github.com/unknownstarter/growthcareer.git
   git push -u origin main
   ```
9. **Phase 9 (Vera)** 로 진행 — Vercel 프로젝트 생성 + env 등록 + 가비아 DNS → growthcareer.xyz 연결.

## 4. 완료된 작업 (2026-04-27 ~ 04-29)

### 디자인 시스템
- Tailwind v4 `@theme` 토큰 — 브랜드 4색(indigo/violet/purple/pink), fluid clamp() 디스플레이 5단계, Pretendard Variable 900 Black, 다크 전용.
- 솔리드 컬러 블록 패턴 (그라데이션 블렌드 ❌, 사용자 명시 거부).

### 14섹션 + Footer (모두 렌더링·반응형 검증됨)
1. **Hero** — 사용자 직접 검증 완료 (`feedback_hero_validated.md`).
2. Problem (indigo) · 3. Solution (purple) · 4. ValueCards · 5. Mentor (surface, 멘토 3인) · 6. Program (4 phase) · 7. Outcome (4 결과 + 갤러리) · 8. SocialProof (배경 이미지 + 4 stat) · 9. Guarantees (indigo, 3 보장) · 10. Bonus (surface, 6 perks) · 11. Pricing (pink 풀 블록, 880,000원, DEEPI 계좌) · 12. Testimonials (익명 6 + 만족도 + Sage 디스클로저) · 13. FAQ (10문항 `<details>` 아코디언) · 14. Apply Form (2-step `useActionState` + zod) · 15. Footer.

### 백엔드 / Supabase
- 프로젝트: **fantopro** (ref `rykqzenbjcggzrruryeq`, Seoul 리전)
- 마이그레이션 적용: `supabase/migrations/20260429000000_applicants.sql` (테이블 + 인덱스 + 트리거 + RLS)
- 보안 모델: RLS enabled, 정책 0개, anon/authenticated 권한 회수, service_role 만 접근.
- 환경 변수: `.env.local` 3개 (URL / anon / service_role) — gitignored.
- 검증 도구: `tools/supabase-verify.mjs` (4/4 통과).
- 서버 액션: `src/kenterbc/application/submit-application.ts` (Supabase 미구성 시 `ok_local` 폴백).

### 자동화 도구
- `tools/preview.mjs` — Playwright 4 viewport 캡처. 기존 dev 서버 reuse, 없으면 spawn.
- `tools/capture-url.mjs` — 외부 URL fullPage + innerText.
- `tools/fetch-stock.mjs` — Unsplash 스톡 다운로드.
- `tools/supabase-verify.mjs` — DB 4단계 점검.

## 5. 잔여 작업

| Phase | 담당 | 내용 |
|-------|------|------|
| **6c** | 다음 AI | §3-B 의 9단계 리브랜딩. 이게 가장 먼저. |
| 7 | Mira | 폼 e2e (Playwright submit → Supabase 검증), 반응형 회귀, a11y, Lighthouse. |
| 8 | Sage | service_role 노출 점검, 후기 디스클로저 검수, 약관/개인정보 페이지 채우기, robots.txt(preview noindex). |
| 9 | Vera | Vercel 프로젝트 생성 + env 등록 + 가비아 → Vercel DNS, 프로덕션 배포. |

## 6. 미정 / 사용자 입력 대기

- 멘토 이름·바이오 (`src/.../domain/program.ts` 의 `MENTORS`)
- 누적 공연·관객수 수치 (`social-proof.tsx`)
- DEEPI 은행명·계좌번호 (`domain/pricing.ts` `bank.bankName/accountNumber`)
- 만족도 표본 수 N (`domain/testimonials.ts` `SATISFACTION.sampleSize`)
- 사업자등록번호·대표·통신판매업 신고 (`footer.tsx` dl)
- 환불·결제·개인정보·이용약관 페이지 본문 (현재 #anchor 만 존재)

## 7. 핵심 참조 파일

- `CLAUDE.md` — 12단계 워크플로우, 9 페르소나, Vercel 디폴트
- `docs/decisions/0001-stack-and-design-decisions.md` — 11개 ADR
- `docs/skills/visual-preview.md` — `pnpm preview` 사용 규칙
- `kenterbootcamp_prd.md` — 원본 PRD (브랜드 변경 후 `prd/fan-to-pro.md` 로 이동 권장)
- `~/.claude/projects/-Users-noah-growthcareer/memory/MEMORY.md` — 자동 메모리 인덱스 (리네임 후 경로)

## 8. 주의사항

- `.env.local` 은 gitignored — 첫 커밋 직전 `git status` 로 반드시 확인.
- `supabase/migrations/20260429000000_applicants.sql` 는 이미 원격 적용됨. 재실행 시 `IF NOT EXISTS` 가드로 안전하지만 불필요.
- Cursor 의 dev 서버를 종료한 뒤 폴더 이름을 바꿔야 lock 충돌이 없음.
- 자동 메모리 키는 cwd 의 `/` → `-` 치환 + `_` → `-` 치환. 폴더명만 옮기면 키 안 맞으니 §3-A 의 `mv` 두 줄 모두 실행 필요.
- `Kenter_bootcamp` / `kenterbc` 라는 단어가 코드/문서에 남으면 검색·SEO 에 누수. Grep 으로 일괄 점검.

## 9. 검증된 패턴 (지키기)

- **Hero 7요소**: 흑백·실루엣 이미지 / 두 방향 그라데이션 / Pretendard 900 Black / 솔리드 색 분리 / ScarcityBadge / 4-체크박스 밀도 / strike + 할인가 (`feedback_hero_validated.md`).
- **2-step 폼**: 클라이언트 `step` state + `useActionState` + zod 분리/머지 + Supabase null `ok_local` 폴백 (`feedback_apply_form_pattern.md`).
- **Visual Preview**: 사용자에게 `pnpm dev` 시키지 말고 `pnpm preview` 로 직접 캡처해 보여주기 (`feedback_visual_preview.md`).
- **후기 익명화 + 디스클로저**: 풀네임/사진 금지, 이니셜+국적+지망만, 하단 합성·익명화 안내 (`feedback_testimonial_disclosure.md`).
