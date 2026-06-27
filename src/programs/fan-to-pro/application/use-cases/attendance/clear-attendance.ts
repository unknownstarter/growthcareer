/**
 * Use case — 출석 mark 삭제 (unmarked 상태로 복원).
 *
 * 운영자가 실수로 mark 한 출결을 취소. (session_id, student_id) 의 row 1개 삭제.
 * row 없으면 no-op (idempotent).
 *
 * 가드: assertAdmin (Basic Auth) — 본 use case 는 운영자 페이지에서만 호출.
 *   LMS surface 에서 호출 시는 server action wrapper 가 assertProgramAdmin 또는
 *   assertSuperAdmin 으로 한 번 더 가드.
 */
import { z } from "zod";
import { deleteAttendance } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/attendance-repository";
import { fetchSessionById } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/session-repository";

const InputSchema = z.object({
  session_id: z.string().uuid(),
  student_id: z.string().uuid(),
});

export type ClearAttendanceInput = z.infer<typeof InputSchema>;
export type ClearAttendanceResult =
  | { status: "ok" }
  | { status: "error"; error: string };

export async function clearAttendance(
  input: unknown,
): Promise<ClearAttendanceResult> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", error: "invalidInput" };
  }

  try {
    const session = await fetchSessionById(parsed.data.session_id);
    if (!session) return { status: "error", error: "sessionNotFound" };

    await deleteAttendance(parsed.data.session_id, parsed.data.student_id);
    return { status: "ok" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return { status: "error", error: msg };
  }
}
