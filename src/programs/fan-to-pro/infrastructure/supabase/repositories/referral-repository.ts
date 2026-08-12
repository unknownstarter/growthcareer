/**
 * Referral repository — 레퍼럴 코드 생성 + 추천인 조회.
 *
 * 설계 (노아 승인):
 * - 본인 코드(referral_code): 6자 A-Z0-9 대문자. students/instructors/user_profiles
 *   3테이블 통틀어 유일. 공유용.
 * - 입력 코드(referred_by_code): 신청/등록 시 입력한 추천인의 referral_code.
 * - 보상 = 할인/크레딧 수동 적용. 시스템은 생성 + 추적만.
 *
 * service_role client 로 동작 (RLS 우회). 호출자는 promote / invite server action
 * 내부 (assertAdmin 이후) 이므로 안전.
 */
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const CODE_LENGTH = 6;
const MAX_ATTEMPTS = 100;

/** 노아 전용 예약 코드. 백필/생성에서 항상 제외. */
export const RESERVED_REFERRAL_CODES = new Set(["GCFTP0"]);

function requireClient() {
  const supabase = getSupabaseServer();
  if (!supabase) throw new Error("supabaseUnavailable");
  return supabase;
}

/** 6자 A-Z0-9 랜덤 코드 1개. 유일성 미보장 (호출측이 재시도). */
export function randomReferralCode(): string {
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

/**
 * 후보 코드가 3테이블 통틀어 미사용인지 확인.
 * students / instructors / user_profiles 각각 조회.
 */
async function isCodeAvailable(code: string): Promise<boolean> {
  if (RESERVED_REFERRAL_CODES.has(code)) return false;
  const supabase = requireClient();
  const [s, i, u] = await Promise.all([
    supabase.from("students").select("id").eq("referral_code", code).maybeSingle(),
    supabase.from("instructors").select("id").eq("referral_code", code).maybeSingle(),
    supabase.from("user_profiles").select("id").eq("referral_code", code).maybeSingle(),
  ]);
  if (s.error) throw new Error(s.error.message);
  if (i.error) throw new Error(i.error.message);
  if (u.error) throw new Error(u.error.message);
  return !s.data && !i.data && !u.data;
}

/**
 * 3테이블 통틀어 유일한 6자 코드 생성.
 * 충돌 시 최대 MAX_ATTEMPTS 회 재시도. 소진 시 throw.
 *
 * 주의: check-then-insert 사이 race 는 partial UNIQUE index 가 최종 방어
 * (INSERT/UPDATE 시 충돌 → 호출측 재시도 필요). 실 운영 부피(수백)에서는
 * 충돌 확률 무시 가능(36^6 = 21억 공간).
 */
export async function generateUniqueReferralCode(): Promise<string> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const candidate = randomReferralCode();
    if (await isCodeAvailable(candidate)) return candidate;
  }
  throw new Error("generateUniqueReferralCode: 100회 재시도 후 실패");
}

export type ReferrerKind = "student" | "instructor" | "user_profile";

export type Referrer = {
  kind: ReferrerKind;
  id: string;
  name: string;
};

/**
 * 입력 코드로 추천인 조회 (어드민 표시/추적용, 다음 slice 에서 사용).
 * students → instructors → user_profiles 순으로 3테이블 조회.
 * 코드가 3테이블 통틀어 유일하므로 첫 매칭이 곧 유일 매칭.
 * 없으면 null.
 */
export async function resolveReferrerByCode(
  code: string,
): Promise<Referrer | null> {
  const trimmed = code.trim().toUpperCase();
  if (trimmed.length === 0) return null;
  const supabase = requireClient();

  const student = await supabase
    .from("students")
    .select("id, display_name")
    .eq("referral_code", trimmed)
    .maybeSingle();
  if (student.error) throw new Error(student.error.message);
  if (student.data) {
    const r = student.data as Record<string, unknown>;
    return { kind: "student", id: String(r.id), name: String(r.display_name ?? "") };
  }

  const instructor = await supabase
    .from("instructors")
    .select("id, name")
    .eq("referral_code", trimmed)
    .maybeSingle();
  if (instructor.error) throw new Error(instructor.error.message);
  if (instructor.data) {
    const r = instructor.data as Record<string, unknown>;
    return { kind: "instructor", id: String(r.id), name: String(r.name ?? "") };
  }

  const profile = await supabase
    .from("user_profiles")
    .select("id, display_name")
    .eq("referral_code", trimmed)
    .maybeSingle();
  if (profile.error) throw new Error(profile.error.message);
  if (profile.data) {
    const r = profile.data as Record<string, unknown>;
    return {
      kind: "user_profile",
      id: String(r.id),
      name: String(r.display_name ?? ""),
    };
  }

  return null;
}

/**
 * 로그인 유저 본인의 공유용 레퍼럴 코드 조회 (LMS 표시용).
 *
 * 소유 규칙 (migration 20260813020000):
 *   - student  → students.referral_code (user_profiles.student_id 링크)
 *   - instructor → instructors.referral_code
 *   - super_admin → user_profiles.referral_code (노아 = GCFTP0)
 *
 * 본인 것만 조회 (id 로 직접). service_role 이지만 호출측이 studentId/instructorId
 * 를 세션(getLmsUser)에서 넘기므로 타인 코드 노출 경로 없음.
 * 코드 미부여 시 null.
 */
export async function fetchOwnReferralCode(owner: {
  studentId?: string | null;
  instructorId?: string | null;
  isSuperAdmin?: boolean;
  userId?: string | null;
}): Promise<string | null> {
  const supabase = requireClient();

  if (owner.studentId) {
    const { data, error } = await supabase
      .from("students")
      .select("referral_code")
      .eq("id", owner.studentId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const code = (data as Record<string, unknown> | null)?.referral_code;
    return code ? String(code) : null;
  }

  if (owner.instructorId) {
    const { data, error } = await supabase
      .from("instructors")
      .select("referral_code")
      .eq("id", owner.instructorId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const code = (data as Record<string, unknown> | null)?.referral_code;
    return code ? String(code) : null;
  }

  if (owner.isSuperAdmin && owner.userId) {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("referral_code")
      .eq("id", owner.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const code = (data as Record<string, unknown> | null)?.referral_code;
    return code ? String(code) : null;
  }

  return null;
}

/** students.referral_code 설정 (미부여 시에만). 이미 있으면 no-op. */
export async function assignStudentReferralCode(studentId: string): Promise<string | null> {
  const supabase = requireClient();
  const existing = await supabase
    .from("students")
    .select("referral_code")
    .eq("id", studentId)
    .maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  const current = (existing.data as Record<string, unknown> | null)?.referral_code;
  if (current) return String(current);

  const code = await generateUniqueReferralCode();
  const { error } = await supabase
    .from("students")
    .update({ referral_code: code })
    .eq("id", studentId)
    .is("referral_code", null);
  if (error) throw new Error(error.message);
  return code;
}

/** instructors.referral_code 설정 (미부여 시에만). */
export async function assignInstructorReferralCode(
  instructorId: string,
): Promise<string | null> {
  const supabase = requireClient();
  const existing = await supabase
    .from("instructors")
    .select("referral_code")
    .eq("id", instructorId)
    .maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  const current = (existing.data as Record<string, unknown> | null)?.referral_code;
  if (current) return String(current);

  const code = await generateUniqueReferralCode();
  const { error } = await supabase
    .from("instructors")
    .update({ referral_code: code })
    .eq("id", instructorId)
    .is("referral_code", null);
  if (error) throw new Error(error.message);
  return code;
}

/**
 * user_profiles.referral_code 설정 (미부여 시에만).
 * GCFTP0 은 노아 전용 예약 코드이므로 여기서 생성 금지 (마이그레이션에서만 고정).
 */
export async function assignUserProfileReferralCode(
  userId: string,
): Promise<string | null> {
  const supabase = requireClient();
  const existing = await supabase
    .from("user_profiles")
    .select("referral_code")
    .eq("id", userId)
    .maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  const current = (existing.data as Record<string, unknown> | null)?.referral_code;
  if (current) return String(current);

  const code = await generateUniqueReferralCode();
  const { error } = await supabase
    .from("user_profiles")
    .update({ referral_code: code })
    .eq("id", userId)
    .is("referral_code", null);
  if (error) throw new Error(error.message);
  return code;
}
