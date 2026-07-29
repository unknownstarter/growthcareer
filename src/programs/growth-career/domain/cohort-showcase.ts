/**
 * CohortShowcase entity. ADR 0016 Phase 1.
 *
 * /cohorts/[showcaseSlug] 공개 라우트가 사용하는 read-only view.
 * 기존 Cohort entity 는 LMS 운영용 (state machine + invariant). 변경 X.
 *
 * 이 entity 는 "공개 노출 가능한 cohort" 만 표현:
 *   - showcase_slug IS NOT NULL 인 row 만 대상
 *   - hero_stat / thumbnail_path 는 nullable (콘텐츠 채우기 전 단계 허용)
 *
 * domain layer 룰: 외부 의존성 0 (zod 만). Next/React/Supabase import 금지.
 */
import { z } from "zod";

/**
 * Cohort 대표 지표. JSONB 로 저장 → 스키마 확장 여지.
 *
 * 예:
 *   { label: '수료 인원', value: 10, denominator: 10,
 *     definition: 'paid AND attendance >= 75% AND cohort completed',
 *     audit_date: '2026-07-25' }
 *
 * denominator: 분모 (전체 인원). null 이면 절대값 지표.
 * definition:  지표 산출 근거 (감사 시 확인).
 * audit_date:  최종 감사일 (ISO date). null 이면 아직 확정 전.
 */
export const HeroStatSchema = z.object({
  label: z.string().min(1),
  value: z.number(),
  denominator: z.number().nullable(),
  definition: z.string().min(1),
  audit_date: z.string().nullable(),
});
export type HeroStat = z.infer<typeof HeroStatSchema>;

/**
 * Cohort 공개 전시용 view.
 *
 * 필드 매핑:
 *   - id / program_id / course_id / created_at : 기존 cohorts row 그대로
 *   - slug            : LMS 라우팅용 nanoid (변경 X)
 *   - showcase_slug   : 신규 human-readable slug (전시 라우팅용)
 *   - starts_at / ends_at : cohorts.starts_on / ends_on (ISO date)
 *                     showcase view 에서는 timestamp 로 승격 없이 date 문자열 유지
 *   - status          : 기존 상태 (draft/open/enrollment_closed/in_progress/completed/cancelled)
 *   - hero_stat       : 신규 JSONB (nullable)
 *   - thumbnail_path  : cohort-thumbnails bucket 경로 (nullable)
 */
export const CohortShowcaseSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  showcase_slug: z.string().min(1),
  program_id: z.string().uuid(),
  course_id: z.string().uuid().nullable(),
  starts_at: z.string(),
  ends_at: z.string(),
  status: z.string(),
  hero_stat: HeroStatSchema.nullable(),
  thumbnail_path: z.string().nullable(),
  created_at: z.string(),
});
export type CohortShowcase = z.infer<typeof CohortShowcaseSchema>;
