/**
 * StoryFrontmatter — MDX frontmatter 원본 shape (raw).
 *
 * B0083 Phase 1 Slice 2b. Iris.
 *
 * 이 스키마는 `content/stories/*.mdx` 의 frontmatter 필드와 1:1 매핑되며,
 * presentation wire shape (`showcase/types.ts` 의 `StoryFrontmatter`) 과는
 * 다르다. 매핑은 use case (`fetch-stories-for-showcase.ts`) 에서 수행.
 *
 * domain layer 룰: 외부 의존성 0 (zod 만). Next/React/Supabase import 금지.
 *
 * 필드 근거:
 *   - slug                  : MDX 파일 slug (파일명 파싱 결과와 대조)
 *   - name                  : 실명 (`anonymous=true` 시 presentation 에서 이니셜 처리)
 *   - anonymous             : 얼굴 blur + 이름 이니셜 처리 여부
 *   - nationality           : 예 "인도네시아 → 서울". 국기 이모지 X (Echo 리서치)
 *   - cohort_showcase_slug  : cohorts.showcase_slug 와 매핑 (join 판단용)
 *   - visa_journey          : ["D-2 학생비자", "F-4"] 등 순서 있음
 *   - current_role          : "SM Entertainment / Global A&R" 등 nullable
 *   - quotes                : 배열. presentation 은 첫 요소를 대표 quote 로 사용
 *   - photo_path            : `story-photos/...` bucket 경로 (nullable X, "" 허용)
 *   - locale                : `ko` | `en`. 파일명 prefix 와 일치해야 함
 *   - published_at          : ISO date. featured 정렬 tie-break 에 사용
 *   - featured              : 우산 랜딩 노출 여부
 */
import { z } from "zod";

export const StoryFrontmatterSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  anonymous: z.boolean().default(false),
  nationality: z.string(),
  cohort_showcase_slug: z.string(),
  visa_journey: z.array(z.string()).default([]),
  current_role: z.string().nullish(),
  quotes: z.array(z.string()).default([]),
  photo_path: z.string(),
  locale: z.enum(["ko", "en"]).default("ko"),
  published_at: z.string(),
  featured: z.boolean().default(false),
});
export type StoryFrontmatter = z.infer<typeof StoryFrontmatterSchema>;
