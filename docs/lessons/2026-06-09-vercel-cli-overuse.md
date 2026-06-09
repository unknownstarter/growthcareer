# 2026-06-09 — `vercel --prod` 직접 호출 과다로 일일 quota 도달

## 무슨 일이 있었나

오늘 commit 7번 (silent fail hotfix → SuccessBlock → nationality → placeholder → viewer role → hotfix → 재시도) 마다 **`vercel --prod --yes` 를 직접 호출**. UTC 6/9 자정 (KST 09:00) 부터 시작한 daily quota 가 hotfix `3cf5ad3` 시점에 한도 도달. `api-deployments-free-per-day` 에러로 hotfix 가 production 에 못 들어감.

사용자가 결국 Vercel Pro 로 upgrade 해서 해결. 비용 발생.

## 왜 일어났나

- GitHub push → Vercel auto deploy 가 정상 작동했어야 한다. momo-web 은 같은 계정에서 정상.
- 내가 매 commit 후 "확실히 production 에 들어가게 하려고" `vercel --prod --yes` 를 추가 호출. push 의 auto deploy 가 들어올 때까지 안 기다림.
- 결과: 같은 commit 에 대해 2번 deployment (auto + manual) 생성 가능 + manual 자체로 quota 소모.

## 어떻게 막을까

1. **`git push` 만으로 production 배포 시도하는 게 default**. Vercel 의 GitHub integration 이 정상이면 push 가 곧 배포 trigger
2. **`vercel --prod --yes` 는 다음 경우에만**:
   - GitHub push 트리거가 명백히 실패 (10+ 분 지나도 새 deployment 안 보임)
   - GitHub integration 자체 점검 후에도 안 들어올 때
   - hotfix 가 즉시 들어가야 하는 사고 대응 시점
3. **Vera 가 배포할 때도 같은 정책**. push 가 충분하면 push 만 하고 wait

## 관련 박제

- memory: `feedback_vercel_cli_overuse.md`
- CLAUDE.md §7 (Vercel Defaults) 에 "배포는 push 가 default" 한 줄 추가
