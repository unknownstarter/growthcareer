# ADR 0020 - SaaS 파생 프로젝트를 Factor 로 분리

날짜: 2026-09-24
상태: 채택

---

## 배경

2026-09-23 세션부터 노아가 그로스커리어의 디자인 시스템과 운영 규율을 템플릿화해 다른 프로덕트를 만드는 논의를 시작했다. 1인 SaaS 사례 리서치, 비IT 니치 발굴, 결제 레일 조사, 프로덕트 파이프라인 설계가 전부 이 레포 안에서 진행됐다.

노아가 직접 물었다. "이런 대화를 계속 여기 그로스커리어 프로젝트에서 하는 게 맞을지 걱정돼."

## 결정

**`~/factor` 를 형제 폴더로 신설하고 SaaS 파생 작업 전체를 이관한다.** GitHub 레포는 `unknownstarter/factor` (private).

## 이유

1. **그로스커리어는 라이브 운영 사이트다.** 1기 수료증 검증이 이 DB 를 조회하고 2기 신청 데이터가 들어 있다. §7.4 프로덕션 보호 룰이 걸린 레포에 실험 코드가 섞이면 배포마다 사고 표면이 넓어진다
2. **CLAUDE.md 가 팬투프로 도메인 룰로 가득하다.** 모집 페이지 동결, LMS 영역 보호, 어드민 3탭 변경 금지, 수료증 발급 주체, 비자 문구 금지. 새 제품 세션마다 이게 전부 로드되면 토큰 낭비이고, 더 위험한 건 존재하지 않는 대상에 룰이 적용되는 것이다
3. **메모리가 cwd 기준으로 갈린다.** SaaS 관련 결정이 그로스커리어 메모리에 쌓이면 새 프로젝트에서 맥락이 안 따라온다
4. **레포 전략을 GitHub 템플릿 방식으로 정했다.** 그 결정 자체가 분리를 전제한다
5. **타이밍**: 코드가 아직 한 줄도 없어 이사 비용이 최저점이다

## 이전 범위

에이전트 11명 (Juno, Cora 신규), 운영 매뉴얼, 브랜치 워크플로, 디자인 시스템 레퍼런스, 유리 히어로 렌더링 기법, 도메인 무관 레슨 8건, 리서치 4건, UI 컴포넌트 15종, 도구 3종. 총 63 파일.

## 남는 것

그로스커리어에는 이 ADR 만 남는다. 2026-09-25 에 사본까지 정리해 **완전 분리**를 마쳤다.

여기서 삭제한 것 (전부 `~/factor` 에 정본 있음):

| 삭제한 경로 | Factor 정본 |
|---|---|
| `docs/research/2026-09-24-solo-saas-niche-opportunities.md` | `~/factor/docs/research/2026-09-24-solo-saas-niche-opportunities.md` |
| `docs/research/2026-09-24-ai-gap-niches.md` | `~/factor/docs/research/2026-09-24-ai-gap-niches.md` |
| `docs/research/2026-09-24-payment-rails-korea.md` | `~/factor/docs/research/2026-09-24-payment-rails-korea.md` |
| `docs/research/2026-09-25-finance-ops-and-smb-workflow.md` | `~/factor/docs/research/2026-09-25-finance-ops-and-smb-workflow.md` |
| `docs/specs/B0084-product-factory-starter.md` | `~/factor/docs/specs/B0084-product-factory-starter.md` |

남겨둔 것: `.claude/agents/juno.md` (수익성 심판) 와 `cora.md` (고객 페르소나 검수). 둘 다 그로스커리어의 가격 결정과 랜딩 검수에도 쓰이는 역할이라 로스터에 유지한다.

⚠️ **B0084 번호 충돌 주의**: 그로스커리어 백로그의 B0084 는 Outcomes 페이지 (ADR 0015 / 0016, `docs/specs/B0083-platform-evolution-*.md` 참조) 다. Factor 로 간 스타터 spec 이 같은 번호를 쓰고 있으니, Factor 쪽에서 자체 번호 체계로 다시 매기는 게 맞다. 그로스커리어에서 B0084 는 Outcomes 페이지 하나만 가리킨다.

SaaS 관련 작업이 다시 필요하면 `cd ~/factor` 로 세션을 시작한다. 여기서는 만들지도, 갱신하지도 않는다.

## 되돌리기

Factor 는 독립 레포라 그로스커리어에 영향이 없다. 분리가 실패하면 Factor 를 버리고 자산만 다시 가져오면 된다.
