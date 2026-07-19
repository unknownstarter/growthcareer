/**
 * Certificate repository — Wave 2.
 */
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import {
  CertificateSchema,
  type Certificate,
  type CertificateKind,
} from "@/src/programs/fan-to-pro/domain/entities/certificate";

const TABLE = "certificates";

function requireClient() {
  const supabase = getSupabaseServer();
  if (!supabase) throw new Error("supabaseUnavailable");
  return supabase;
}

export async function fetchCertificatesByStudent(
  studentId: string,
): Promise<Certificate[]> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("student_id", studentId)
    .order("issued_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => CertificateSchema.parse(row));
}

export async function fetchCertificatesByCohort(
  cohortId: string,
): Promise<Certificate[]> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("cohort_id", cohortId)
    .order("issued_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => CertificateSchema.parse(row));
}

/**
 * 발급번호 (unique) 로 단일 certificate — verify 페이지 (B0081).
 * 없으면 null. PII 컬럼 반환 X (student_id 만) — 호출자 (verify server component)
 * 가 별도로 cohort/program 명 join.
 *
 * Backward compat: 신규 verify URL 은 verify_token 사용. 그러나 이전에 인쇄되어
 * 배포된 이미지의 QR/URL 이 serial_no 를 포함할 수 있어 fallback 유지.
 */
export async function fetchCertificateBySerialNo(
  serialNo: string,
): Promise<Certificate | null> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("serial_no", serialNo)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return CertificateSchema.parse(data);
}

/**
 * verify_token (unique) 으로 단일 certificate — verify 페이지 신규 (B0081, 2026-07-19).
 * opaque 10자 토큰 매칭. 없으면 null.
 */
export async function fetchCertificateByVerifyToken(
  verifyToken: string,
): Promise<Certificate | null> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("verify_token", verifyToken)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return CertificateSchema.parse(data);
}

export async function insertCertificate(input: {
  student_id: string;
  cohort_id: string;
  kind: CertificateKind;
  serial_no: string;
  /**
   * verify URL 용 opaque 10자 nanoid. NOT NULL 컬럼이므로 호출자 필수 생성.
   * 생성 유틸: `generateVerifyToken()` (application/certificate/verify-token.ts).
   */
  verify_token: string;
  issued_by?: string | null;
  file_path?: string | null;
  attendance_rate?: number | null;
  notes?: string | null;
}): Promise<Certificate> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      student_id: input.student_id,
      cohort_id: input.cohort_id,
      kind: input.kind,
      serial_no: input.serial_no,
      verify_token: input.verify_token,
      issued_by: input.issued_by ?? null,
      file_path: input.file_path ?? null,
      attendance_rate: input.attendance_rate ?? null,
      notes: input.notes ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return CertificateSchema.parse(data);
}
