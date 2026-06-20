/**
 * Use case — cohort 생성 (draft) 또는 이미 있는 cohort 를 open 으로 전이.
 *
 * 책임:
 * - assertAdmin() (mutation 첫 줄)
 * - 입력 검증 (zod)
 * - repository 호출
 * - Result union 반환 (throw 금지)
 *
 * application 룰: Next/React import 금지. server-action 이 wrap 한다.
 */
import { z } from "zod";
import { assertAdmin } from "@/src/programs/fan-to-pro/infrastructure/auth/admin-role";
import {
  insertCohort,
  type InsertCohortInput,
} from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/cohort-repository";
import type { Cohort } from "@/src/programs/fan-to-pro/domain/entities/cohort";

const InputSchema = z
  .object({
    name: z.string().trim().min(1).max(40),
    starts_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    ends_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    ceremony_on: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    capacity: z.number().int().positive().max(1000),
    min_to_open: z.number().int().positive(),
    notes: z.string().max(1000).nullable().optional(),
  })
  .refine((v) => v.min_to_open <= v.capacity, {
    message: "min_to_open must be ≤ capacity",
    path: ["min_to_open"],
  })
  .refine((v) => v.starts_on < v.ends_on, {
    message: "starts_on must be < ends_on",
    path: ["starts_on"],
  });

export type OpenCohortInput = z.infer<typeof InputSchema>;
export type OpenCohortResult =
  | { status: "ok"; data: Cohort }
  | { status: "error"; error: string };

export async function openCohort(input: unknown): Promise<OpenCohortResult> {
  await assertAdmin();

  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", error: "invalidInput" };
  }

  try {
    const dto: InsertCohortInput = {
      name: parsed.data.name,
      starts_on: parsed.data.starts_on,
      ends_on: parsed.data.ends_on,
      ceremony_on: parsed.data.ceremony_on ?? null,
      capacity: parsed.data.capacity,
      min_to_open: parsed.data.min_to_open,
      status: "open",
      notes: parsed.data.notes ?? null,
    };
    const cohort = await insertCohort(dto);
    return { status: "ok", data: cohort };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return { status: "error", error: msg };
  }
}
