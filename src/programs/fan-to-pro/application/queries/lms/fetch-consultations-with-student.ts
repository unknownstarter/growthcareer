/**
 * Query — 컨설팅 + 학생 이름 join.
 *
 * /lms/admin/consultations 와 /lms/instructor/consultations 에서 사용.
 */
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";

export type ConsultationWithStudent = {
  id: string;
  student_id: string;
  student_name: string;
  kind: "resume" | "cover_letter" | "portfolio";
  version: number;
  status: "drafted" | "submitted" | "reviewed" | "closed";
  submitted_at: string | null;
  created_at: string;
};

export async function fetchConsultationsWithStudent(): Promise<
  | { status: "ok"; data: ConsultationWithStudent[] }
  | { status: "error"; error: string }
> {
  const supabase = getSupabaseServer();
  if (!supabase) return { status: "error", error: "supabaseUnavailable" };

  const { data, error } = await supabase
    .from("consultations")
    .select("id, student_id, kind, version, status, submitted_at, created_at, students(display_name)")
    .order("created_at", { ascending: false });
  if (error) return { status: "error", error: error.message };

  const rows = (data ?? []) as Array<{
    id: string;
    student_id: string;
    kind: ConsultationWithStudent["kind"];
    version: number;
    status: ConsultationWithStudent["status"];
    submitted_at: string | null;
    created_at: string;
    students?: { display_name?: string } | null;
  }>;

  return {
    status: "ok",
    data: rows.map((r) => ({
      id: r.id,
      student_id: r.student_id,
      student_name: r.students?.display_name ?? "(이름없음)",
      kind: r.kind,
      version: r.version,
      status: r.status,
      submitted_at: r.submitted_at,
      created_at: r.created_at,
    })),
  };
}
