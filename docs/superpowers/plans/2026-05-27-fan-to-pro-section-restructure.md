# Plan — Fan to Pro 모집 페이지 섹션 재구성

> 작성일: 2026-05-27
> 작성자: Noah + Claude (Aria · Echo · Luna 합의)
> 상태: 사용자 컨펌 대기

---

## 목적 (Why)

현재 모집 페이지가 14섹션으로 *난잡* 하다는 사용자 체감.
근본 원인은 섹션 수보다 **(1) 섹션 간 메시지 중복** 과 **(2) 각 섹션의 단일 목표가 흐릿** 한 것.
결과 = 임팩트 옅어지고 컨버전 흐름 약해짐.

이번 작업으로 다음을 달성한다.
- 각 섹션이 *유일한 목표 1개* 만 답한다 (= 메시지 충돌 0)
- 각 섹션의 핵심 메시지가 *3초 안에 박힌다* (= 디자인 컨셉의 임팩트 회복)
- 모든 섹션이 결국 *"지금 신청"* 으로 수렴한다 (= 컨버전 흐름 단일화)

---

## 범위 (In Scope)

- **UI 구조·레이아웃·시각 위계** 만 변경
- 현재 14섹션을 10섹션으로 재구성 (Hero 포함):
  - **삭제**: ValueCards, Bonus
  - **흡수**: Outcome → Value / Guarantees → Pricing / SocialProof 일부 → Eligibility / Bonus 비자 가이드 → Pricing
  - **유지**: Hero, FAQ, Apply (현 상태 그대로)
- 가장 난잡한 섹션 (Value, Pricing & Guarantees, Mentor) 의 시각 의사결정 = Superpower preview 라우트로 시안 비교

## 비범위 (Out of Scope)

- **카피 문장 변경 X** — 사용자 명시: "지금의 워딩과 내용을 막 변경하진 말아줘"
- **정책·도메인 데이터 변경 X** — program.ts / faq.ts 등 도메인 상수 그대로
- **디자인 토큰 변경 X** — 색상·타이포 스케일·spacing 그대로
- **Hero · FAQ · Apply 섹션 손대지 않음** — 사용자 만족 / 잔여 의심 해소 / 컨버전 폼은 현 상태 유지

---

## 전제 (합의된 사실)

1. **Aria 매트릭스 통과**: 7섹션의 단일 목표·핵심 메시지·CTA 연결·UI 임팩트 장치 정의 완료
2. **디자인 컨셉 유지**: Pretendard Black, 다크 전용, 브랜드 5색 솔리드 블록 (그라데이션 X), 간결 + 임팩트
3. **외국인 유학생 페르소나**: D-2 / D-4 / D-10 / E-시리즈, 한국어 중급+, K-pop 업계 취업 희망
4. **정책 정정 (2026-05-27)**: 공연 프로젝트 참여 = *수료자 전원 보장 X*, *우수 수강생만 기회*. 향후 카피 작업 시 잔재 제거 필요 (이번 단계에서는 카피 안 건드림)
5. **GA4 스크롤 깊이 이벤트는 추가 안 함** — 가설 기반 진행, 1기 결과 보고 차기 결정
6. **Superpower 워크플로우 적용**: Plan → Spec → (시각 결정 필요 시) Preview 라우트 → 사용자 픽 → 본 구현

---

## 단계별 작업 계획 (WBS)

### Phase 1 — Plan 합의 (지금 이 문서)
- [x] Plan md 초안 작성
- [ ] 사용자 컨펌

### Phase 2 — Spec 작성
- [ ] `docs/superpowers/specs/2026-05-27-fan-to-pro-section-restructure-design.md`
- [ ] 7섹션 각각의 UI 컴포넌트 트리 + ASCII 와이어프레임 + 디자인 토큰 매핑
- [ ] 시각 결정이 필요한 섹션 = preview 시안 옵션 정의 (각 섹션당 2-3안)

### Phase 3 — Preview 라우트 + 시안 카드
- [ ] `/app/preview/section-restructure/page.tsx` 임시 라우트
- [ ] `noindex` 메타 + `robots.ts` 차단 (production 노출 방지)
- [ ] 시안 카드 컴포넌트 (실제 React 컴포넌트로 렌더, 도메인 데이터 import 해서 카피는 그대로)
- [ ] 각 시안에 "이걸 골랐어" 버튼 → `navigator.clipboard.writeText("[picked] Value 옵션-B")` + 토스트
- [ ] 비교 가능한 시안 배치:
  - **Value** 섹션: 옵션 A (3장 솔리드 블록) / B (1열 큰 카드) / C (2x2 그리드)
  - **Pricing & Guarantees** 섹션: 옵션 A (split-screen) / B (스택형 단일 컬럼) / C (가격 카드 + 보장 풋노트)
  - **Mentor** 섹션: 옵션 A (현재 풀 카드 3개) / B (인용 중심 압축) / C (탭 전환)

### Phase 4 — 빌드 검증 + URL 안내
- [ ] `pnpm build` + tsc 통과
- [ ] localhost preview 또는 vercel preview 배포 URL 안내
- [ ] 사용자가 preview 페이지에서 시안 픽 → 클립보드 복사 → 채팅에 paste

### Phase 5 — 본 구현 (별도 차수, 이번 plan 의 범위 X)
- 사용자 픽 결과로 실제 섹션 파일 수정
- 삭제 대상 (ValueCards, Bonus) 정리
- 흡수 작업 (Outcome → Value 등)
- 빌드 + 커밋 + 푸시
- *이 단계는 새 plan 으로 분리*

---

## 위험 / 완화

| 위험 | 완화책 |
|---|---|
| Preview 라우트가 production 으로 노출 | `metadata.robots = "noindex,nofollow"` + `robots.ts` 에서 `/preview/*` disallow |
| 한 번에 너무 많은 시안 = 사용자 피로 | 우선순위 3섹션 (Value · Pricing&Guarantees · Mentor) 부터. 나머지는 Spec md 에 wireframe 만 |
| 시안 컴포넌트가 실제 코드 import 통해 도메인 오염 | preview 라우트는 *읽기 전용*. domain/program.ts 등 *읽기만*, 쓰기 X |
| Superpower 워크플로우 처음 적용 → 사용자 mental model 어긋남 | Phase 1 (이 plan) 에서 *원칙·산출물 형식* 을 사용자가 검토할 기회 제공 |
| "공연 = 우수자만" 정정이 시안 카피에 반영 안 됨 | 시안은 *현재 도메인 데이터 그대로* 사용 (정책 정정은 별도 차수). preview 의 카피는 *임시 상태* 임을 spec md 에 명시 |

---

## Done When

- 사용자가 이 plan 의 4가지에 OK:
  1. 범위 (UI 만, 카피·정책 X)
  2. 우선순위 시안 대상 3섹션 (Value · Pricing&Guarantees · Mentor)
  3. Superpower 라우트 방식 (preview + 클립보드 픽)
  4. Phase 5 (본 구현) 는 별도 차수로 분리하는 것

- Plan 확정 후 즉시 Phase 2 (Spec 작성) 진입.
