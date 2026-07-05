/**
 * ProgramRow entity — DB `programs` 테이블 row.
 *
 * B0068 ADR 0013 리네임 분리:
 *   - `domain/marketing/program-config.ts` = 랜딩·pricing·apply-form 하드코딩 config
 *   - 여기 (`entities/program-row.ts`)      = Supabase programs 테이블 row 표현
 *
 * domain layer 룰: 외부 의존성 0 (zod 만).
 *
 * State machine:
 *   active → paused → archived
 *   active → archived
 *   archived = terminal
 */
import { z } from "zod";

export const PROGRAM_STATUSES = ["active", "paused", "archived"] as const;

export const ProgramStatusSchema = z.enum(PROGRAM_STATUSES);
export type ProgramStatus = z.infer<typeof ProgramStatusSchema>;

export const ProgramRowSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  name: z.string().min(1),
  status: ProgramStatusSchema,
  created_at: z.string(),
  updated_at: z.string().nullish(),
});

export type ProgramRow = z.infer<typeof ProgramRowSchema>;

const ALLOWED_TRANSITIONS: Record<ProgramStatus, readonly ProgramStatus[]> = {
  active: ["paused", "archived"],
  paused: ["active", "archived"],
  archived: [],
};

export function canTransitionProgram(
  from: ProgramStatus,
  to: ProgramStatus,
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function isTerminalProgramStatus(status: ProgramStatus): boolean {
  return status === "archived";
}
