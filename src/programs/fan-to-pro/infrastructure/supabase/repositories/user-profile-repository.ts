/**
 * user_profiles repository — Wave 1 Step 2 invite/role 관리에 사용.
 *
 * 본 repository 는 service_role client 로 동작 — RLS 우회. invite 흐름은
 * super_admin server action 내부에서만 호출되므로 안전. self-read 는 별도
 * (lms-role.ts 가 anon session client 사용).
 */
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";

export type UserProfileRow = {
  id: string;
  role: "super_admin" | "instructor" | "student";
  display_name: string;
  email: string;
  phone: string | null;
  company_id: string | null;
  student_id: string | null;
  instructor_id: string | null;
  password_changed_at: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string | null;
};

const TABLE = "user_profiles";

function requireClient() {
  const supabase = getSupabaseServer();
  if (!supabase) throw new Error("supabaseUnavailable");
  return supabase;
}

function row(raw: Record<string, unknown>): UserProfileRow {
  return {
    id: String(raw.id ?? ""),
    role: raw.role as UserProfileRow["role"],
    display_name: String(raw.display_name ?? ""),
    email: String(raw.email ?? ""),
    phone: raw.phone ? String(raw.phone) : null,
    company_id: raw.company_id ? String(raw.company_id) : null,
    student_id: raw.student_id ? String(raw.student_id) : null,
    instructor_id: raw.instructor_id ? String(raw.instructor_id) : null,
    password_changed_at: raw.password_changed_at
      ? String(raw.password_changed_at)
      : null,
    last_login_at: raw.last_login_at ? String(raw.last_login_at) : null,
    created_at: String(raw.created_at ?? ""),
    updated_at: raw.updated_at ? String(raw.updated_at) : null,
  };
}

export async function fetchAllProfiles(): Promise<UserProfileRow[]> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => row(r as Record<string, unknown>));
}

export async function fetchProfilesByRole(
  role: "super_admin" | "instructor" | "student",
): Promise<UserProfileRow[]> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("role", role)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => row(r as Record<string, unknown>));
}

export async function fetchProfileByEmail(
  email: string,
): Promise<UserProfileRow | null> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("email", email)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return row(data as Record<string, unknown>);
}

export async function fetchProfileByStudentId(
  studentId: string,
): Promise<UserProfileRow | null> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("student_id", studentId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return row(data as Record<string, unknown>);
}

export async function fetchProfileByInstructorId(
  instructorId: string,
): Promise<UserProfileRow | null> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("instructor_id", instructorId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return row(data as Record<string, unknown>);
}

export type InsertProfileInput = {
  id: string; // auth.users.id
  role: "super_admin" | "instructor" | "student";
  display_name: string;
  email: string;
  phone?: string | null;
  company_id?: string | null;
  student_id?: string | null;
  instructor_id?: string | null;
};

export async function insertProfile(
  input: InsertProfileInput,
): Promise<UserProfileRow> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      id: input.id,
      role: input.role,
      display_name: input.display_name,
      email: input.email,
      phone: input.phone ?? null,
      company_id: input.company_id ?? null,
      student_id: input.student_id ?? null,
      instructor_id: input.instructor_id ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return row(data as Record<string, unknown>);
}

export async function updateProfile(
  id: string,
  patch: Partial<Omit<InsertProfileInput, "id">>,
): Promise<UserProfileRow> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return row(data as Record<string, unknown>);
}

export async function deleteProfile(id: string): Promise<void> {
  const supabase = requireClient();
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw new Error(error.message);
}
