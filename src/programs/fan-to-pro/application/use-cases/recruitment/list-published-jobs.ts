/**
 * Use case — 공개 JD 리스트 (익명 client).
 *
 * anon Supabase client 사용. RLS 정책 (`p_job_postings_public_read`) 이
 * status='open' + closes_at 유효 필터를 담당.
 *
 * 인증 검증 없음 — 익명 열람 대상. SEO / 공유 링크 진입.
 */
import { z } from "zod";
import {
  fetchPublishedJobsAnon,
  type FetchPublishedJobsFilter,
} from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/job-posting-repository";
import { EmploymentTypeSchema } from "@/src/programs/fan-to-pro/domain/entities/job-posting";
import type { JobPostingListItem } from "@/src/programs/fan-to-pro/domain/entities/job-posting";

const InputSchema = z.object({
  programId: z.string().uuid().optional(),
  roleCategory: z.string().min(1).max(100).optional(),
  employmentType: EmploymentTypeSchema.optional(),
  remoteOnly: z.boolean().optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().nonnegative().optional(),
});

export type ListPublishedJobsInput = z.infer<typeof InputSchema>;
export type ListPublishedJobsResult =
  | { status: "ok"; data: JobPostingListItem[] }
  | { status: "error"; error: string };

export async function listPublishedJobs(
  input: unknown = {},
): Promise<ListPublishedJobsResult> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", error: "invalidInput" };
  }

  try {
    const filter: FetchPublishedJobsFilter = {
      programId: parsed.data.programId,
      roleCategory: parsed.data.roleCategory,
      employmentType: parsed.data.employmentType,
      remoteOnly: parsed.data.remoteOnly,
      limit: parsed.data.limit ?? 20,
      offset: parsed.data.offset ?? 0,
    };
    const data = await fetchPublishedJobsAnon(filter);
    return { status: "ok", data };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return { status: "error", error: msg };
  }
}
