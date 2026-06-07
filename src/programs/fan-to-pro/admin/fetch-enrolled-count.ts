import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";

/**
 * /admin/instructors 헤더의 정원 표시 + 정산 confirm 다이얼로그용 카운트.
 *
 * recordInstructorPayouts 가 호출 시점에서 다시 SELECT 하지만, UI 가 confirm
 * 전 미리 보여줘야 함 ("정원 N명 기준 정산할까요?"). 같은 정의 (status='enrolled')
 * 사용 → server action 의 결과와 일치.
 */
export async function fetchEnrolledCount(): Promise<{
  count: number;
  error: string | null;
}> {
  const supabase = getSupabaseServer();
  if (!supabase) return { count: 0, error: null };

  const { count, error } = await supabase
    .from("applicants")
    .select("id", { count: "exact", head: true })
    .eq("status", "enrolled");

  if (error) return { count: 0, error: error.message };
  return { count: count ?? 0, error: null };
}
