# PDF 가이드북 파이프라인 시행착오 (사전 박제)

**날짜**: 2026-07-12
**맥락**: 유니온픽처스 사전 교육 워크북 (`preshow-training-workbook`) 착수 직전, 지난 `stage-ops-guide-cohort-1.pdf` (B0054) 만들 때 lesson 박제 안 된 시행착오를 사전 박제. 노아 지시: "지난번 시행착오 반복되지 않게 레슨런 제대로 보고!"

## 무슨 일이 있었나 (지난 B0054 회고)

지난 stage-ops-guide 만들 때 (2026-06-27) 다음 문제가 반복 발생:

1. **부호 룰 새어들어감**: em dash / interpunct (`·`) / 곡선 따옴표 / 단일 ellipsis (`…`) 가 카피에 섞임. 렌더 후 PDF 육안 확인 시점에 발견 → 다시 grep 후 sed 로 치환 → 재렌더. 2회 반복.
2. **Playwright 폰트 로드 실패**: Pretendard CDN 로드 대기 1.2s 로 짧았음. 첫 렌더 시 시스템 fallback 폰트로 export 됨. 대기 시간 늘려 재렌더.
3. **A4 페이지 넘김 짤림**: `page-break-inside: avoid` 를 sub-topic wrapper 에 안 걸어서 표 중간 짤림. `<div class="sub-block">` 마다 wrapper 추가 후 재렌더.
4. **preview.mjs 가 docs/screenshots/ 루트 파일 wipe**: 이 lesson 은 이미 박제 (`2026-06-04`) + preview.mjs 패치 완료. 서브디렉터리는 보존됨.
5. **이미지 외부 링크 실패**: OG 이미지·로고 를 URL 로 넣었더니 Playwright 렌더 시 로드 실패. `data:` URI base64 인라인으로 전환.

## 왜 일어났나

- **부호**: 콘텐츠 작성 시점에 CLAUDE.md §6.5 룰 확인 안 함. 특히 Echo 가 리서치 결과를 붙일 때 원문 부호가 그대로 남음.
- **폰트**: Playwright 기본 `networkidle` 대기 + 1.2s 는 CDN latency 변동에 취약.
- **페이지 넘김**: `page-break-inside: avoid` 룰이 CSS best practice 이지만 적용 위치 (wrapper 안 wrapper) 를 잘 못 잡으면 안 먹힘.
- **preview wipe**: 별건이지만 산출물 저장 위치 실수 방지 위해 다시 리마인더.

## 어떻게 막을까 (역반영)

### 1. 부호 스캔 자동화

PDF export 직전 (또는 HTML 완성 직후) 반드시 실행:

```bash
node tools/check-pdf-copy.mjs tools/preshow-training-workbook.html
```

실행 파일 신설. 검사 대상 부호:
- `—` (em dash, U+2014)
- `–` (en dash, U+2013)  # 숫자 범위 제외
- `·` (interpunct, U+00B7)
- `…` (ellipsis, U+2026)
- `“” ‘’` (곡선 따옴표, U+201C~U+201D, U+2018~U+2019)

발견 시 exit 1 + 위치 · 문맥 출력. PDF export 스크립트 (`pdf-preshow-training-workbook.mjs`) 상단에서 자동 호출 후 실패 시 export 중단.

### 2. Playwright 폰트 대기 강화

`waitForTimeout(1200)` → `waitForTimeout(2500)` + `document.fonts.ready` 체크.

```js
await page.goto(HTML, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(2500);
```

### 3. 페이지 넘김 wrapper 룰 (CSS)

sub-topic 단위 wrapper 마다 명시적으로:

```css
.sub-block {
  page-break-inside: avoid;
  break-inside: avoid;  /* modern browsers */
  margin-bottom: 24px;
}
```

Sub-block 안 표·도식·이미지도 개별 wrapper 로 감싸고 같은 룰 적용.

### 4. 이미지 인라인 원칙

로고·아이콘·도식은 SVG 인라인 또는 `data:image/png;base64,` URI. 외부 URL 금지.

### 5. 부호 스캔 훅 (settings.json)

`.claude/settings.json` 의 PostToolUse hook 에 HTML 파일 대상 부호 스캔 추가 검토. (기존 훅 확인 후 결정)

## 역반영 위치

- **본 lesson 신설**: `docs/lessons/2026-07-12-pdf-guidebook-pitfalls.md`
- **README 인덱스 갱신**: `docs/lessons/README.md`
- **CLAUDE.md §7.6 신설**: "PDF 가이드북 표준 파이프라인" — 부호 스캔 + 폰트 대기 + 페이지 넘김 + 이미지 인라인 4 룰
- **tool 신설**: `tools/check-pdf-copy.mjs` (부호 스캔)
- **PDF export 스크립트 통합**: 새 export 스크립트는 반드시 상단에서 check-pdf-copy 호출 후 실패 시 중단

## 다음 사고 방지 체크 (self-check)

새 PDF 산출물 만들 때마다:

- [ ] `check-pdf-copy.mjs` PASS
- [ ] Playwright `document.fonts.ready` + 2.5s 대기
- [ ] sub-block wrapper 마다 `page-break-inside: avoid`
- [ ] 이미지 = 인라인 (SVG or data URI)
- [ ] 출력 = `docs/screenshots/onepager/` 서브디렉터리
