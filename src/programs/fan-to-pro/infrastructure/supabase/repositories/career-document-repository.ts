/**
 * Career Document repository (B0034 Wave A+).
 *
 * student_career_documents 테이블 CRUD. service_role 클라이언트 — RLS 우회.
 * 호출자 (server action) 가 권한 가드 책임 (CLAUDE.md §7.4).
 */
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import {
  CareerDocumentSchema,
  type CareerDocument,
  type CareerDocType,
} from "@/src/programs/fan-to-pro/domain/entities/career-document";

const TABLE = "student_career_documents";

function requireClient() {
  const supabase = getSupabaseServer();
  if (!supabase) throw new Error("supabaseUnavailable");
  return supabase;
}

/** 특정 student 의 모든 career documents (최대 3건). */
export async function fetchCareerDocuments(
  studentId: string,
): Promise<CareerDocument[]> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("student_id", studentId);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => CareerDocumentSchema.parse(row));
}

/** 단일 doc — 없으면 null. */
export async function fetchCareerDocument(
  studentId: string,
  docType: CareerDocType,
): Promise<CareerDocument | null> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("student_id", studentId)
    .eq("doc_type", docType)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return CareerDocumentSchema.parse(data);
}

export type UpsertExternalUrlInput = {
  student_id: string;
  doc_type: CareerDocType;
  external_url: string;
  notes: string | null;
};

/** external_url 모드 upsert. file_path 등 file_* 컬럼은 null 로 강제. */
export async function upsertCareerDocumentExternalUrl(
  input: UpsertExternalUrlInput,
): Promise<CareerDocument> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .upsert(
      {
        student_id: input.student_id,
        doc_type: input.doc_type,
        storage_method: "external_url",
        external_url: input.external_url,
        file_path: null,
        file_name: null,
        file_size_bytes: null,
        mime_type: null,
        notes: input.notes,
      },
      { onConflict: "student_id,doc_type" },
    )
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return CareerDocumentSchema.parse(data);
}

export type UpsertFileUploadInput = {
  student_id: string;
  doc_type: CareerDocType;
  file_path: string;
  file_name: string;
  file_size_bytes: number;
  mime_type: string;
  notes: string | null;
};

/** file_upload 모드 upsert. external_url 은 null 로 강제. */
export async function upsertCareerDocumentFile(
  input: UpsertFileUploadInput,
): Promise<CareerDocument> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .upsert(
      {
        student_id: input.student_id,
        doc_type: input.doc_type,
        storage_method: "file_upload",
        external_url: null,
        file_path: input.file_path,
        file_name: input.file_name,
        file_size_bytes: input.file_size_bytes,
        mime_type: input.mime_type,
        notes: input.notes,
      },
      { onConflict: "student_id,doc_type" },
    )
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return CareerDocumentSchema.parse(data);
}

export async function deleteCareerDocument(
  studentId: string,
  docType: CareerDocType,
): Promise<void> {
  const supabase = requireClient();
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("student_id", studentId)
    .eq("doc_type", docType);
  if (error) throw new Error(error.message);
}
