/**
 * Use case — cohort 의 sessions 일괄 생성.
 *
 * Wave 0 1기 시드 보강용. 일반적으로 마이그레이션 seed 가 처리하지만 운영자가
 * 추가 sessions 만들 때 사용.
 */
import { z } from "zod";
import { assertAdmin } from "@/src/programs/fan-to-pro/infrastructure/auth/admin-role";
import {
  insertSessionsBulk,
  type InsertSessionInput,
} from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/session-repository";
import { fetchCohortById } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/cohort-repository";
import type { Session } from "@/src/programs/fan-to-pro/domain/entities/session";

const SessionInputSchema = z
  .object({
    title: z.string().trim().min(1).max(100),
    location: z.string().max(200).nullable().optional(),
    starts_at: z.string(),
    ends_at: z.string(),
    idx: z.number().int().positive().nullable().optional(),
    day_of_week: z.enum(["saturday", "sunday"]).nullable().optional(),
    topic: z.string().max(200).nullable().optional(),
    instructor_id: z.string().uuid().nullable().optional(),
  })
  .refine((s) => s.starts_at < s.ends_at, {
    message: "starts_at must be < ends_at",
    path: ["starts_at"],
  });

const InputSchema = z.object({
  cohort_id: z.string().uuid(),
  sessions: z.array(SessionInputSchema).min(1).max(100),
});

export type CreateSessionsInput = z.infer<typeof InputSchema>;
export type CreateSessionsResult =
  | { status: "ok"; data: Session[] }
  | { status: "error"; error: string };

export async function createSessions(
  input: unknown,
): Promise<CreateSessionsResult> {
  await assertAdmin();

  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", error: "invalidInput" };
  }

  try {
    // cohort 존재 검증.
    const cohort = await fetchCohortById(parsed.data.cohort_id);
    if (!cohort) return { status: "error", error: "cohortNotFound" };

    const dtos: InsertSessionInput[] = parsed.data.sessions.map((s) => ({
      cohort_id: parsed.data.cohort_id,
      instructor_id: s.instructor_id ?? null,
      title: s.title,
      location: s.location ?? null,
      starts_at: s.starts_at,
      ends_at: s.ends_at,
      idx: s.idx ?? null,
      day_of_week: s.day_of_week ?? null,
      topic: s.topic ?? null,
      status: "scheduled",
    }));
    const sessions = await insertSessionsBulk(dtos);
    return { status: "ok", data: sessions };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return { status: "error", error: msg };
  }
}
