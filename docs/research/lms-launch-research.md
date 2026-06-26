# LMS 정식 런칭 리서치 / Echo

> 1기 2주차 (7/4 토) 출시 목표. 5개 영역.
> 작성: 2026-06-25 / 담당: Echo / 트리거: B0044 LMS Launch Phase 1 (Aria 로드맵)

---

## A. 파일 호스팅 옵션 비교

### 비용 시뮬레이션 (8회차 × 200MB = 1.6GB 저장 / cohort, 다운로드 회수별)

| 옵션 | 저장 비용/월 | egress | 1기 (17.6GB 다운) | 2기 (48GB) | 4기 (200GB) | 단일파일 limit | 통합 비용 |
|---|---|---|---|---|---|---|---|
| **Supabase Storage Pro** | $25 (100GB 포함) | 250GB 포함 후 $0.09/GB | $0 (이미 구독) | $0 | $0 | 500GB | **즉시 (1일 이내)** |
| Cloudflare R2 | $0.015/GB ≈ $0.024 | **무료 (영구)** | ~$0 | ~$0 | ~$0.05 | 5TB | 2~3일 (S3 SDK + presigned) |
| Backblaze B2 + CF CDN | $0.006/GB | 무료 (CF Alliance) | ~$0 | ~$0 | ~$0.01 | 10TB | 3~4일 (B2 + CF Workers) |
| Wasabi | $7/TB ≈ $0.014 | 무료 (1:1 ratio 제한) | $0 | $0 | $0 | 5TB | 3~4일 (S3 SDK) |
| AWS S3 | $0.023/GB | $0.09/GB | $1.6 | $4.3 | $18 | 5TB | 2~3일 |

### Findings

- **[HIGH] Supabase Storage Pro = 이미 구독 중인 $25 안에 1기·2기 다 들어옴** — 100GB 저장 + 250GB egress 포함. 우리 1기 1.6GB / 17.6GB 다운은 0.6% / 7% 사용. 4기까지 가도 200GB 다운 = 80% 안에서 끝남.
- **[HIGH] Supabase Storage = 500GB 단일 파일 limit (Pro 이상)** — 400MB PPT 가뿐히 처리.
- **[HIGH] Smart CDN + signed URL 캐시 재사용 = 대용량 다운로드 성능 최적화** — 동일 signed URL 재사용 시 edge cache hit.
- **[HIGH] Cloudflare R2 = egress 영구 무료 + S3 호환** — 코드 마이그레이션 시 endpoint URL 만 교체. 그러나 우리는 이미 Supabase 통합돼 있어 추가 통합 비용이 *현재 시점에선* 무가치.
- **[MED] Wasabi 의 "무료 egress" 는 1:1 ratio 제한** — 월 다운로드가 저장량보다 크면 추가 요금 또는 throttle. 부트캠프 패턴은 다운 >> 저장 (학생 10명 × 8회 다운로드) 이라 *위험*.
- **[MED] Backblaze B2 free egress 도 CF 경유 조건 필수** — 코드 컴플렉시티 증가 vs 비용 절감 미미.

### Recommendation

**Supabase Storage 로 1기 런칭 진행, 4기까지 그대로 갈 가능성 높음.** 이미 RLS + signed URL TTL 1h 패턴이 B0037 (career documents) 에 작동 중이라 코드 재사용 100%. 6/27 강의 시작까지 3일 남은 시점에서 새 storage 통합은 risk.

단 **5기 + (스케일 30명 이상 × 누적 자료 100GB+) 가 임박하면 그 시점에 R2 마이그레이션 고려**. R2 마이그레이션 백로그 ticket 만 등록.

---

## B. 한국 학생 친화 LMS UX 패턴

### Findings

- **[MED] 한국 대학 LMS 표준 = 강의자료 게시판 = 다운로드 / PDF 게시판 = 미리보기 + 다운로드 옵션** — 강사가 업로드 시 "다운로드 허용" 옵션 토글 가능 (목포대 / 한서대 LMS 매뉴얼).
- **[MED] 인프런 = 강사가 회차별 (lesson) 자료 업로드 + 학생 권한 별 자료 access** — 메인 강사 / 서브 강사 role 분리.
- **[MED] 패스트캠퍼스 = LMS Skillflo 별도 학습 관리 SaaS** — 자체 운영 + 학생 전용 공간.
- **[LOW] Google Drive 모바일 = 24h 다운로드 락 + 모바일 우회 불가** — 정확히 우리 6/25 사고와 같은 패턴. PC 에서만 폴더 우회 가능, 모바일은 우회 자체가 안 됨. "업계 공통 패턴" 확인.

### Recommendation

- **1기 = 다운로드 only (in-browser 미리보기 X)** — 400MB PPT 를 브라우저에서 미리보기 = 다운로드보다 무거움. 학생은 PC 에서 다운 + 모바일에서 봐도 충분. PDF 미리보기는 Wave 2.
- **회차 (week) 별 자료 grouping UI** — `/[cohortSlug]/student/materials` 페이지에 1주차/2주차/.../8주차 accordion.
- **"다운로드 허용" 토글은 1기 X** — 단순화. 모든 자료 다운로드 default 허용.
- **모바일 first 디자인** — 회차 list + 자료 카드 (제목 + 파일명 + size + 다운로드 버튼) / 토스 톤 라이트.

---

## C. 취업 정보 entity 모델

### Findings

- **[HIGH] LinkedIn = 8 섹션** — Experience / Certifications / Education / Skills / Languages / Honors-Awards / Volunteer / Projects. 각 섹션은 array. media (link/image/document) attach 가능.
- **[MED] 원티드 = 이력서 + talent pool + AI agent 분석** — 이력서 + 프로필 (희망 직무 / 회사) 분리. 프라이버시 = 회사 차단 + 면접 수락 전 PII blind.
- **[MED] 한국 자기소개서 표준 항목** = 성장과정 / 학창시절 / 성격 (장단점) / 지원동기 / 입사 후 포부. 배분: 지원동기 40% / 입사 후 포부 20% / 학교생활 20% / 성장과정·성격 각 10%.
- **[HIGH] K-pop 공연 진로 = 일반 IT/사무 직군과 진로 분기 다름** — 회사 (소속사) 분기 + 직무 (콘서트 PD / 기획 / A&R / 음향 / 영상) 분기. 단 entity 모델 자체는 LinkedIn 일반 구조 그대로 OK + `target_role_category` enum 만 K-pop 도메인 맞춤.

### Recommendation — entity 구조

ADR 0010 (applicants 영구 불변, LMS 학생 신규 entity) 준수.

**1기 minimum (7/4 런칭)**:

```sql
student_profile (student_id PK)
- name_ko, name_en, phone, birth_year, gender
- visa_type (외국인만)
- created_at, updated_at

student_career_target (student_id PK, FK)
- target_role_category enum (concert_pd | a_n_r | mgmt | marketing | video | sound | etc)
- target_companies text[] (자유 입력: "SM", "JYP", "하이브")
- desired_start_date date
- self_pitch text (300자, 본인을 한 줄로)

student_resume_item (id PK, student_id FK, type, ...)
- type enum (education | experience | certification | award | language | project)
- title, organization, start_date, end_date (nullable for current)
- description text
- credential_url text (nullable, 자격증 검증용)
- order_index int
```

**Wave 2 (7월 말 ~ 8월)**:
- `student_cover_letter` (자기소개서 다중 — 회사별로 1개씩 저장 가능)
- `student_self_assessment` (강점/약점 self)
- `student_external_link` (인스타 / 유튜브 / 포트폴리오 외부 link 다중)

**핵심 설계 결정**:
- **`student_profile` 은 `applicants` 와 분리** — applicants 의 visa/name 은 신청 시 snapshot, student 는 LMS 활용 시 갱신 가능
- **`student_resume_item` 은 polymorphic 한 단일 테이블** (LinkedIn 패턴 + Wanted 패턴) — type 으로 분기. 추가 type 늘리기 쉬움.
- **자기소개서 = 다중 (회사별)** — 한 학생이 SM 1장 + JYP 1장 다 저장 가능. 한국 채용 패턴.

---

## D. 학생 onboarding 흐름

### Findings

- **[HIGH] Supabase magic link = 60초 rate limit + 1시간 만료 + 1회 사용** — 우리 10명 invite 패턴에 충분.
- **[HIGH] Magic link 베스트 프랙티스** = (1) 발송 후 로딩 indicator (2) 성공 메시지 "이메일 확인하세요" (3) rate limit / invalid email 에러 핸들 (4) 템플릿 커스터마이즈
- **[MED] 외국인 학생 친화 = 영문 magic link 가 임시 비밀번호 안내보다 단순** — 임시 PW 는 카톡/이메일 분실 + change-password 2단계 부담. magic link 는 클릭 1번.

### Recommendation — 1기 onboarding 흐름

**6/27 강의 시작 전까지 10명 invite 완료 시나리오**:

1. **운영자 invite** (admin UI) — 학생 이메일 입력 + 이름 + cohort 지정 → `student_profile` row 생성 + `must_change_password=true` 임시 계정 + `student_invitations` row
2. **카톡 / 이메일 으로 안내** — "Fan to Pro 1기 LMS 가 열렸어요. 다음 링크로 접속해서 비밀번호를 설정해 주세요."
3. **학생 첫 로그인** — `/auth/login` 임시 PW → `/auth/change-password` 강제 → `/[cohortSlug]/student` 진입
4. **첫 진입 시 환영 메시지 + 빈 상태 explanation** — "1주차 강의 자료는 6/27 토 오전에 업로드됩니다. 그 전까지 본인 프로필을 채워 주세요." → `student_profile` + `student_career_target` 입력 권유

**Magic link 는 1기 X, Wave 2 검토**:
1. B0032 done 의 임시 PW + change-password 흐름이 이미 작동
2. 7/4 까지 3일 남았는데 magic link UX 새로 짜는 risk
3. 외국인 학생 1기는 0~1명 수준 — 일반 흐름으로 충분
4. magic link 의 진짜 가치는 *재방문 시* — 1기는 첫 진입이 80% 임팩트

**Wave 2 권장**: 학생이 7일 이상 미접속 시 자동 magic link 이메일 reminder → 클릭으로 즉시 로그인.

---

## E. 강사 access 결정

### Findings

- **[MED] 인프런 = 메인/서브 강사 role 분리, 둘 다 자료 업로드 + 학생 정보 열람 가능**
- **[MED] 한국 대학 LMS = 강사 = 자료 업로드 + 학생 출결 mark + 성적 입력 기본 권한** — 학생 PII 열람은 학교마다 다름

### Recommendation — 1기 강사 access = NO (운영자 대행 유지)

**근거**:
1. **1기 강사 3인 + 자료 업로드 8회 = 운영자가 직접 처리하는 비용이 강사 onboarding 비용보다 낮음** (강사당 30분 × 3명 = 1.5시간 vs 강사 LMS 진입 + 매뉴얼 작성 + 디버깅)
2. **노아 본인이 1기 강사 + 운영자 = dogfooding 으로 충분** — 강사 UI 가 어떻게 동작해야 하는지 노아 1인 검증 OK
3. **강사 LMS access = 새로운 권한 표면** — 1기 라이브 운영 중 새 권한 도입 = CLAUDE.md §7.4 의 "신규 권한 표면 변경 시 Sage 검토 필수" 트리거
4. **1기 = 운영 안정성 우선, 2기 = 기능 확장 우선** 원칙

**2기+ 강사 access 도입 시 단계적 권장**:
- **Phase 1**: 강사가 본인 cohort 자료 업로드 가능 (자기 회차만)
- **Phase 2**: 강사가 본인 회차 출결 mark
- **Phase 3**: 강사가 본인 cohort 학생 career documents 열람 (career consulting 용)

---

## 최종 권장 (각 영역별 1순위)

| 영역 | 1순위 결정 | 1기 액션 (7/4 까지) | 미래 검토 시점 |
|---|---|---|---|
| A. 파일 호스팅 | **Supabase Storage 그대로** | B0037 패턴 그대로 회차별 자료 업로드 UI | 5기+ 또는 누적 100GB+ 시 R2 |
| B. UX | **회차별 accordion + 다운로드 only** | `/student/materials` + `/admin/materials` 신규 페이지 | Wave 2: PDF 미리보기 / 다운로드 토글 |
| C. 취업 정보 | **student_profile + student_career_target + student_resume_item (polymorphic)** | 3 테이블 마이그레이션 + 빈 상태 권유 | Wave 2: cover_letter 다중 + external_link |
| D. Onboarding | **임시 PW + change-password (B0032 그대로)** | invite 카톡 / 이메일 템플릿 + 첫 진입 환영 UI | Wave 2: 7일 미접속 시 magic link reminder |
| E. 강사 access | **1기 NO (운영자 대행)** | 강사 LMS 진입 차단 + 운영자 자료 업로드 | 2기 Phase 1: 강사 자료 업로드 |

## Open Questions

1. **회차별 자료 entity 이름은?** — `lesson_materials` (회차 단위) vs `cohort_files` (cohort 단위). Sophia ADR 0011 의 `lecture_materials` 채택 권장.
2. **자료 다운로드 audit 1기부터 박을지?** — 학생당 다운로드 시각 + IP 기록은 추후 자료 유출 조사 시 필요. Sage 관점.
3. **카톡 invite 메시지는 알림톡 (verified) 인가, 친구톡 (unverified) 인가?** — 알림톡이 신뢰도 높지만 템플릿 승인 시간 필요.
4. **외국인 학생 비율이 정말 0~1명인가?** — applicants 의 visa_type 분포로 확인 필요. 5명 이상이면 magic link 우선순위 ↑.

## 결론

**7/4 토 런칭 가능. 핵심**:
1. Supabase Storage 그대로
2. B0032 + B0037 패턴 그대로
3. 새 마이그레이션 3개 (`student_profile` + `student_career_target` + `student_resume_item`) + 자료 entity 1개 (`lecture_materials`)
4. 강사 access 는 1기 SKIP

새 통합 / 새 인증 시스템 도입 = 0건 → §7.4 의 Sage 검토 트리거 최소화 → 운영 안정성 ✓.

## 참고

- [Supabase Pricing](https://supabase.com/pricing) / [Storage Pricing](https://supabase.com/docs/guides/storage/pricing) / [File Limits](https://supabase.com/docs/guides/storage/uploads/file-limits)
- [Cloudflare R2 Pricing](https://developers.cloudflare.com/r2/pricing/) / [Presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)
- [LinkedIn Profile Guide 2026 (Coursera)](https://www.coursera.org/articles/linkedin-profile)
- [Wanted 메인](https://www.wanted.co.kr/) / [OpenAPI](https://openapi.wanted.jobs/api-docs/v1/)
- [한국 자기소개서 표준 (HAIJOB)](https://www.haijob.co.kr/blog/) / [잡코리아 합격 자소서](https://www.jobkorea.co.kr/starter/passassay)
- [Supabase Magic Link](https://supabase.com/docs/guides/auth/auth-email-passwordless)
- [목포대 LMS 매뉴얼](https://lms.mokpo.ac.kr/local/ubion/manual/contents/manual_f/3.CourseResource.pdf)
- [인프런 강사 가이드](https://inflab-1.gitbook.io/inflearn/course-create/draft/setting)
