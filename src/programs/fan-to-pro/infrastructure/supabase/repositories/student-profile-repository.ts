/**
 * Student Profile repository (B0044 LMS Launch Phase 1).
 *
 * student_profile 테이블 CRUD. service_role — RLS 우회.
 * 호출자 (server action) 가 권한 가드 책임.
 */
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import {
  StudentProfileSchema,
  type StudentProfile,
  type StudentProfileUpsertInput,
} from "@/src/programs/fan-to-pro/domain/entities/student-profile";

const TABLE = "student_profile";

function requireClient() {
  const supabase = getSupabaseServer();
  if (!supabase) throw new Error("supabaseUnavailable");
  return supabase;
}

export async function fetchStudentProfile(
  studentId: string,
): Promise<StudentProfile | null> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("student_id", studentId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return StudentProfileSchema.parse(data);
}

/**
 * upsert — student_id PK 기준. 미지정 컬럼은 그대로 유지 (DB merge).
 *
 * Supabase upsert 는 미지정 컬럼을 default 로 reset 하므로, 사전에 fetch 후 merge.
 */
export async function upsertStudentProfile(
  input: StudentProfileUpsertInput,
): Promise<StudentProfile> {
  const supabase = requireClient();

  const existing = await fetchStudentProfile(input.student_id);

  const merged: Record<string, unknown> = {
    student_id: input.student_id,
    name_ko:
      input.name_ko !== undefined ? input.name_ko : (existing?.name_ko ?? null),
    name_en:
      input.name_en !== undefined ? input.name_en : (existing?.name_en ?? null),
    phone:
      input.phone !== undefined ? input.phone : (existing?.phone ?? null),
    birth_year:
      input.birth_year !== undefined
        ? input.birth_year
        : (existing?.birth_year ?? null),
    birth_date:
      input.birth_date !== undefined
        ? input.birth_date
        : (existing?.birth_date ?? null),
    gender:
      input.gender !== undefined ? input.gender : (existing?.gender ?? null),
    visa_type:
      input.visa_type !== undefined
        ? input.visa_type
        : (existing?.visa_type ?? null),
    months_in_korea:
      input.months_in_korea !== undefined
        ? input.months_in_korea
        : (existing?.months_in_korea ?? null),
    // B0057: 사진 컬럼은 upsertProfileAction 으로 변경 X — 별도 server action
    // (uploadStudentPhotoAction / deleteStudentPhotoAction). 여기선 existing 값 보존만.
    photo_path: existing?.photo_path ?? null,
    photo_uploaded_at: existing?.photo_uploaded_at ?? null,
    // B0063: 홈페이지 / SNS / 포트폴리오 link. undefined 면 existing 보존.
    website_url:
      input.website_url !== undefined
        ? input.website_url
        : (existing?.website_url ?? null),
  };

  const { data, error } = await supabase
    .from(TABLE)
    .upsert(merged, { onConflict: "student_id" })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return StudentProfileSchema.parse(data);
}

// ---------- B0057: photo --------------------------------------------------
// upload-photo.ts server action 이 직접 supabase.from('student_profile').update()
// 패턴을 씀 — repository 추가 helper 불필요. signed URL 발급 / delete 도 같은 패턴.
