/**
 * Use case — 공개 JD 상세 (익명 client).
 *
 * slug 매칭. RLS 로 status='open' + closes_at 유효 필터가 걸림.
 * 결과 없음 = 404 처리 (page.tsx).
 */
import { z } from "zod";
import { fetchPublishedJobBySlugAnon } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/job-posting-repository";
import {
  JobPostingSlugSchema,
  type JobPosting,
} from "@/src/programs/fan-to-pro/domain/entities/job-posting";

const InputSchema = z.object({
  slug: JobPostingSlugSchema,
});

export type ReadJobBySlugInput = z.infer<typeof InputSchema>;
export type ReadJobBySlugResult =
  | { status: "ok"; data: JobPosting | null }
  | { status: "error"; error: string };

export async function readJobBySlug(
  input: unknown,
): Promise<ReadJobBySlugResult> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", error: "invalidInput" };
  }

  try {
    const data = await fetchPublishedJobBySlugAnon(parsed.data.slug);
    return { status: "ok", data };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return { status: "error", error: msg };
  }
}
