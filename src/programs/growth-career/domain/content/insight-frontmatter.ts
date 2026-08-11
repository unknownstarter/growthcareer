/**
 * InsightFrontmatter — content/insights/*.mdx frontmatter shape (raw).
 *
 * Slice C. Luna.
 *
 * 인사이트 코너 (Medium/Wanted형 아티클) 의 MDX frontmatter 와 1:1 매핑.
 * /stories 파이프라인 (story-frontmatter.ts) 을 미러링하되 콘텐츠 성격이 다름:
 *   story = 수료생 여정 카드 / insight = 재한 외국인 생활 정보 아티클.
 *
 * domain layer 룰: 외부 의존성 0 (zod 만). Next/React/Supabase import 금지.
 *
 * 필드 근거:
 *   - slug       : MDX 파일 slug (파일명 파싱 결과와 대조, 라우트 param)
 *   - title      : 아티클 큰 제목 (h1). §6.5 부호 규칙 준수 카피.
 *   - category   : 라벨 chip 문자열 (TOPIK / 한국어 / 금융 / 취업 / 생활 / 비자)
 *   - summary    : 리드 문단 (상세 상단 요약). 리스트 카드 설명으로도 사용.
 *   - thumbnail  : 리스트 카드 + 상세 히어로 이미지 경로 (public 하위 절대경로). 실사 스톡.
 *   - updatedAt  : "2026-08" 형태. 디스클레이머 날짜 + 리스트 정렬 tie-break.
 *   - sources    : 출처 링크 배열. 공식 1차 출처만. label + url.
 *   - locale     : ko | en. 파일명 prefix 와 무관, 이 필드로 필터.
 */
import { z } from "zod";

export const InsightSourceSchema = z.object({
  label: z.string().min(1),
  url: z.string().url(),
});
export type InsightSource = z.infer<typeof InsightSourceSchema>;

export const InsightFrontmatterSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  category: z.string().min(1),
  summary: z.string().min(1),
  // public 하위 경로 (예: /images/insight/topik.jpg). 없으면 이미지 생략.
  thumbnail: z.string().min(1).optional(),
  updatedAt: z.string().min(1),
  sources: z.array(InsightSourceSchema).default([]),
  locale: z.enum(["ko", "en"]).default("ko"),
});
export type InsightFrontmatter = z.infer<typeof InsightFrontmatterSchema>;
