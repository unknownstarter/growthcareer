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

export async function insertCertificate(input: {
  student_id: string;
  cohort_id: string;
  kind: CertificateKind;
  serial_no: string;
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
