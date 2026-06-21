# 원페이저 HTML → A4 PDF 페이지 분할 문제 / Echo 리서치

> 작성: 2026-06-21 · 담당: Echo · 트리거: cohort 1 leave-behind PDF 변환 시 카드/표가 페이지 가운데서 잘리는 현상

## 1. 문제 정의

`tools/onepager-cohort-1.html` (3섹션 자연 흐름) 을 PDF 로 변환할 때 카드 / 표 행 / 문단이 페이지 경계에서 어색하게 잘림.

**시도 + 실패한 것**

1. `@page` + `page-break-after` + `break-inside: avoid` 만 → 브라우저 Cmd+P 시 카드 가운데서 잘림.
2. Playwright `page.pdf({ format: 'A4', preferCSSPageSize: true })` → 같은 문제 (같은 Chromium 엔진).
3. 5페이지 fixed `height: 297mm; overflow: hidden` → 잘림은 막지만 디자인이 어색해서 사용자 거부.

## 2. 근본 원인

Chromium (Playwright / Puppeteer 공통) 의 `break-inside: avoid` 가 **flex / grid / table 컨테이너 안에서 자주 무시됨**. 다년간 알려진 한계.

- [puppeteer#8708 — break-inside table 무시](https://github.com/puppeteer/puppeteer/issues/8708)
- 결과: flex/grid 로 짠 카드 그리드 (우리 phase-grid / mentor-grid) 가 정확히 이 케이스.

## 3. 툴 비교

| 툴 | 방식 | 한글 | break 컨트롤 | 학습 비용 | 우리 fit |
|---|---|---|---|---|---|
| **Paged.js + Chrome/Playwright** | JS polyfill 이 DOM 을 사전 fragment | 우수 | 상 (flex/grid 안에서도 동작) | 낮음 | ★★★★★ |
| Playwright `page.pdf()` 단독 | Chromium print 엔진 | 우수 | 중 (위 한계) | 최저 | ★★ |
| WeasyPrint (Python) | 네이티브 paged media | 양호 | 상 | 중 (Python 환경) | ★★ |
| wkhtmltopdf | 구식 WebKit | 양호 | 중 | 낮음 | ★ (2020+ 사장) |
| Prince XML | 상용 paged media 엔진 | 우수 | 최상 | 낮음 | ★★ (유료) |
| `@react-pdf/renderer` | JSX → PDF | 우수 | 최상 (직접 통제) | 높음 (CSS 서브셋) | ★ (디자인 재작성) |
| Vivliostyle | Paged.js 유사 polyfill | 우수 (CJK 강점) | 상 | 중 | ★★★ |

## 4. CSS Paged Media 실전 (Chrome / Playwright)

**확실히 동작**
- `@page { size: A4; margin: ... }`
- `break-before/after: page`
- `widows: 3; orphans: 3;`
- `@media print`

**Paged.js 필요한 영역**
- `break-inside: avoid` 가 flex/grid/table 안에서 무시
- `@page :first` / `:left` / `:right` 차등 margin
- `@top-center { content: ... }` running header
- `counter(page)` 페이지 번호

## 5. 한글 + Pretendard 안정화

```css
html { font-family: 'Pretendard', system-ui; }
:lang(ko), body {
  word-break: keep-all;
  line-break: strict;
  overflow-wrap: break-word;
}
```

`<html lang="ko">` 확인. `word-break: keep-all` 은 한국어에서만 자연스럽다 (일본어/중국어는 `normal`).

- [MDN word-break](https://developer.mozilla.org/en-US/docs/Web/CSS/word-break)
- [csswg-drafts#4285](https://github.com/w3c/csswg-drafts/issues/4285)

## 6. 업계 사례

- **Stripe / SaaS 1페이지 인보이스**: HTML 템플릿 + Puppeteer/Playwright. 1페이지짜리는 페이지 경계 문제 없음.
- **여러 페이지 leave-behind / 리포트 / 책**: Paged.js + Chrome headless 가 OSS 사실상 표준 (pagedmedia.org reference).
- **고복잡 인쇄 (출판물)**: Prince XML 또는 InDesign.
- **앱 내 동적 invoice (Vercel/Workers)**: `@react-pdf/renderer` (Chromium binary 못 올려서 어쩔 수 없이).

우리 케이스 = 3페이지 한국어 leave-behind, 1회용, Tailwind/Pretendard 재사용 = **Paged.js 카테고리 정확히 매치**.

## 7. 최종 권장

### Paged.js polyfill 1줄 + CSS 미세 보강 + Chrome 인쇄 또는 Playwright

**왜**
- 코드 수정 최소 (기존 `@page` / `break-after` / `break-inside` CSS 그대로 더 잘 동작)
- 5페이지 fixed 방식 대신 자연 흐름 유지하면서 카드 안 잘림
- OSS (MIT), 로컬, 추가 인프라 0
- 한글/Pretendard 는 브라우저가 동일 렌더 → keep-all 만 추가
- 1회용이라 다음 cohort 때 같은 HTML 만 고치면 됨

### 적용 단계

1. **HTML `<head>` 에 polyfill 추가**
   ```html
   <script src="https://unpkg.com/pagedjs/dist/paged.polyfill.js"></script>
   ```
   (또는 self-host: `pnpm add -D pagedjs`)

2. **한글 줄바꿈 + 폰트 안정화 CSS 추가**
   ```css
   :lang(ko), body {
     word-break: keep-all;
     line-break: strict;
     overflow-wrap: break-word;
   }
   ```

3. **카드/문단 break 보호 명시**
   ```css
   .phase-card, .mentor-card, .schedule-row, .info-list li,
   .callout, .meta-strip, .info-box {
     break-inside: avoid;
   }
   h1, h2 { break-after: avoid; }
   p { orphans: 3; widows: 3; }
   ```

4. **Playwright 스크립트에 Paged.js 대기 로직**
   ```js
   await page.waitForFunction(() => window.PagedPolyfill !== undefined);
   await page.waitForTimeout(1500); // fragmenting 완료 대기
   await page.pdf({ format: 'A4', printBackground: true });
   ```

5. **검증**: 생성된 PDF 페이지별 확인, 잘림 없으면 종료.

### 함정

- **CDN unpkg** 는 production 자동화 부적합 → 1회용이면 OK, 반복이면 self-host
- **Paged.js fragmenting 끝 전에 `page.pdf()` 호출 → 빈 페이지/일부만 캡처** (위 waitForFunction 필수)
- **`@page` 한 사이즈만 가능** — 표지 다른 사이즈 같은 요구는 별도 파일
- **이미지에 `break-inside: avoid` 빠뜨리면** 가운데 잘림
- **CI 환경에 Pretendard 없으면** `@font-face` 명시 로드 + `document.fonts.ready` 대기

## 8. 참고

- [Paged.js GitHub (MIT)](https://github.com/pagedjs/pagedjs/)
- [Paged.js 공식 — Web design for print](https://pagedjs.org/en/documentation/5-web-design-for-print/)
- [Doppio — Mastering Paged.js essential tips](https://doppio.sh/blog/mastering-paged-js-essential-tips-for-creating-precision-pdfs-from-html)
- [W3C CSS Paged Media Level 3](https://www.w3.org/TR/css-page-3/)
- [Smashing — Breaking Boxes with CSS Fragmentation](https://www.smashingmagazine.com/2019/02/css-fragmentation/)
- [PDF4 — HTML to PDF benchmark 2026](https://pdf4.dev/blog/html-to-pdf-benchmark-2026)
- [DocRaptor — CSS Paged Media 가이드](https://docraptor.com/css-paged-media)
