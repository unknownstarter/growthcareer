# Session Archive

세션 단락이 끝날 때마다 `WORKING-SESSION.md` 의 스냅샷을 여기에 박제한다.

## 명명 규칙

`SESSION-YYYY-MM-DD-{short-title}.md`

예:
- `SESSION-2026-06-08-wave-2-shipped.md`
- `SESSION-2026-06-15-wave-3-출결.md`

## 언제 아카이브?

- 큰 단락이 끝났을 때 (Wave / 큰 feature 완료, B0007 풀 사이클 등)
- 또는 주 1회 정기
- `WORKING-SESSION.md` 가 너무 길어질 때 (~500줄+) 도 강제 분리

## 아카이브 후

- `WORKING-SESSION.md` 는 **새 작업 상태로 덮어쓰기**
- 아카이브 파일은 read-only (이력 보존)
- 필요 시 BACKLOG.md 의 done 항목들도 한 달 단위로 CHANGELOG 로 이관 (BACKLOG 헤더 룰 참조)
