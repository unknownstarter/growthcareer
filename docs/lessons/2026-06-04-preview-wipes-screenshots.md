# Lesson — `pnpm preview` 가 코워크 배너 산출물 20장을 wipe 한 사고

**Date**: 2026-06-04
**Severity**: 중 (산출물 손실, 재생성 가능)
**Status**: 복구 완료 · 재발 방지 적용 완료
**Owner**: Vera (DevOps) + 사용자

---

## 1. 무슨 일이 일어났나 (Timeline)

1. 코워크 광고 배너 v2 4장(`mw-ko-v2`, `mw-en-v2`, `app-ko-v2`, `app-en-v2`) 작업 완료. 기존 6장 포함 총 **20개 산출물**(10 PNG + 10 SVG) 이 `docs/screenshots/kowork/` 에 저장됨.
2. 별개 작업으로 강사 소개 순서 변경 (`INSTRUCTORS` 배열 재배열) 수행.
3. 강사 섹션 시각 검증을 위해 `pnpm preview --routes=/fan-to-pro` 실행.
4. preview 스크립트가 종료된 후 `ls docs/screenshots/kowork/` → **No such file or directory**. 20장 전부 사라짐.

---

## 2. 근본 원인 (Root Cause)

`tools/preview.mjs:78` 의 다음 한 줄이 원인.

```js
await rm(OUT_DIR, { recursive: true, force: true });
await mkdir(OUT_DIR, { recursive: true });
```

`OUT_DIR = path.resolve("docs/screenshots")`. preview 는 매 실행마다 출력 폴더를 *재귀적으로* 통째 비우고 재생성하도록 짜여 있었음. **서브디렉터리에 들어있는 다른 워크플로우의 산출물을 보호하는 가드가 없었음.**

설계 의도: preview 는 `<route>-<viewport>.png` 형태의 평면 파일만 다루므로 *자기 소유의 폴더* 라고 가정.

실제: 다른 워크플로우(코워크 배너 파이프라인)도 같은 폴더를 출력지로 쓰고 있었음. **공유 폴더에 대한 단독 소유 가정이 깨지면서 사고 발생.**

---

## 3. 영향 범위 (Blast Radius)

- 손실: `docs/screenshots/kowork/` 의 모든 파일 (PNG 10 + SVG 10 = 20개, 약 5.2MB)
- 손실되지 *않은* 것 — 다행히 다 살아있었음:
  - 소스 HTML: `tools/kowork-banner-pc.html`
  - 캡처 스크립트: `tools/clip-kowork.mjs`
  - SVG 임베드 스크립트: `tools/embed-kowork-images.mjs`
  - 베리파이 스크립트: `tools/verify-kowork-svg.mjs`
  - 원본 자산: `public/images/stock/*.jpg`
  - 리서치 노트: `docs/research/kowork-banner-research.md`
- 즉, **소스만 보존되었고 산출물만 휘발**. 전량 재생성으로 완전 복구 가능.

---

## 4. 복구 (Recovery)

복구는 약 5분 소요. 절차:

1. `mkdir -p docs/screenshots/kowork`
2. `node tools/clip-kowork.mjs` → PNG 10장 재생성
3. SVG 10장 수작업 재작성 (좌표/문구는 HTML/CSS 와 이전 SVG 패턴에서 파생)
4. `node tools/embed-kowork-images.mjs` → 배경 이미지 base64 임베드
5. 시각 검증 (PC-KO, MW-KO-v2, App-KO-v2) → PNG 와 SVG-from-base64 가 동일하게 렌더되는지 확인

---

## 5. 재발 방지 (Prevention)

### 5.1 코드 변경 — `tools/preview.mjs` 패치 적용

`rm(OUT_DIR, { recursive: true, force: true })` 를 `clearOutDirFiles(OUT_DIR)` 로 교체. 새 함수는 **top-level 파일만 삭제, 서브디렉터리는 보존**.

```js
async function clearOutDirFiles(dir) {
  // Only delete top-level files; preserve subdirectories so curated
  // artifacts (e.g. docs/screenshots/kowork) survive preview runs.
  await mkdir(dir, { recursive: true });
  const entries = await readdir(dir);
  await Promise.all(
    entries.map(async (name) => {
      const full = path.join(dir, name);
      const st = await stat(full);
      if (st.isFile()) await rm(full, { force: true });
    }),
  );
}
```

이제 `docs/screenshots/<topic>/` 형태의 서브폴더는 preview 가 건드리지 않음.

### 5.2 규약 — 캡처 산출물은 무조건 서브디렉터리에

향후 어떤 워크플로우든 `docs/screenshots/` 에 캡처 결과물을 저장할 때는 **반드시 `docs/screenshots/<topic>/` 서브폴더 안에**. 루트에 직접 쓰면 여전히 preview 가 지움 (의도된 동작).

좋은 예: `tools/clip-kowork.mjs` 의 `outDir = docs/screenshots/kowork`.

### 5.3 운영 가드 — preview 실행 전 status 체크

destructive script (preview, clip, embed 등) 를 실행하기 전:

1. `git status docs/screenshots/` 로 uncommitted 산출물 유무 확인
2. 있다면 커밋하거나 별도 백업 후 실행

이 룰은 메모리 `feedback_preview_wipes_screenshots.md` 에 저장됨.

### 5.4 절차 가드 — 위험 도구 실행 전 사용자 컨펌

CLAUDE.md "Executing actions with care" 의 정신을 따라:
- `rm`, destructive npm scripts, 그 외 폴더 wipe 가능한 도구는 **다른 워크플로우의 결과물이 같은 폴더에 살고 있을 가능성** 을 매번 의식
- 의심스러우면 사용자에게 알리고 실행 전 컨펌

---

## 6. 메타 교훈

1. **공유 폴더는 단독 소유 가정을 깨뜨린다.** 도구 A 가 자기 폴더라고 가정하고 wipe 해버리면 도구 B 의 산출물이 휘말림. 폴더 단위로 owner 를 명확히 나누거나, wipe 범위를 보수적으로(top-level only) 설정해야 함.
2. **소스가 살아있으면 산출물은 5분이면 복구된다.** 이 사고가 가벼웠던 이유는 HTML/스크립트/원본 자산이 별개 폴더에 있었기 때문. *생성 가능한 결과물* 과 *생성에 필요한 소스* 를 같은 디렉터리에 두지 말 것.
3. **destructive 도구의 기본값을 보수적으로 잡자.** `rm -rf` 같은 wipe 동작은 narrow scope 가 안전. 위 패치가 정확히 이 원칙을 따른다.

---

## 7. 관련 링크

- 패치된 코드: `tools/preview.mjs`
- 메모리: `~/.claude/projects/-Users-noah-growthcareer/memory/feedback_preview_wipes_screenshots.md`
- 코워크 배너 리서치: `docs/research/kowork-banner-research.md`
- CHANGELOG entry: `[2026-06-04]` 의 *Fixed* 섹션
