/**
 * Assignment + Submission + Feedback repository — Wave 2.
 */
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import {
  AssignmentSchema,
  type Assignment,
  type AssignmentStatus,
} from "@/src/programs/fan-to-pro/domain/entities/assignment";
import {
  SubmissionSchema,
  type Submission,
} from "@/src/programs/fan-to-pro/domain/entities/submission";
import {
  FeedbackSchema,
  type Feedback,
} from "@/src/programs/fan-to-pro/domain/entities/feedback";

function requireClient() {
  const supabase = getSupabaseServer();
  if (!supabase) throw new Error("supabaseUnavailable");
  return supabase;
}

// ---------- Assignment ----------

export async function fetchAssignmentsByCohort(
  cohortId: string,
): Promise<Assignment[]> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from("assignments")
    .select("*")
    .eq("cohort_id", cohortId)
    .order("due_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => AssignmentSchema.parse(row));
}

export async function fetchAssignmentById(
  id: string,
): Promise<Assignment | null> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from("assignments")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return AssignmentSchema.parse(data);
}

export type InsertAssignmentInput = {
  cohort_id: string;
  session_id?: string | null;
  created_by?: string | null;
  title: string;
  description: string;
  due_at: string;
  status?: AssignmentStatus;
};

export async function insertAssignment(
  input: InsertAssignmentInput,
): Promise<Assignment> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from("assignments")
    .insert({
      cohort_id: input.cohort_id,
      session_id: input.session_id ?? null,
      created_by: input.created_by ?? null,
      title: input.title,
      description: input.description,
      due_at: input.due_at,
      status: input.status ?? "open",
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return AssignmentSchema.parse(data);
}

// ---------- Submission ----------

export async function fetchSubmissionsByAssignment(
  assignmentId: string,
): Promise<Submission[]> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("assignment_id", assignmentId)
    .order("submitted_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => SubmissionSchema.parse(row));
}

export async function fetchSubmissionsByStudent(
  studentId: string,
): Promise<Submission[]> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("student_id", studentId)
    .order("submitted_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => SubmissionSchema.parse(row));
}

export async function fetchLatestSubmissionVersion(
  assignmentId: string,
  studentId: string,
): Promise<number> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from("submissions")
    .select("version")
    .eq("assignment_id", assignmentId)
    .eq("student_id", studentId)
    .order("version", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  const top = (data ?? [])[0] as { version?: number } | undefined;
  return top?.version ?? 0;
}

export async function insertSubmission(input: {
  assignment_id: string;
  student_id: string;
  version: number;
  file_path?: string | null;
  file_size_bytes?: number | null;
  mime_type?: string | null;
  body?: string | null;
}): Promise<Submission> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from("submissions")
    .insert({
      assignment_id: input.assignment_id,
      student_id: input.student_id,
      version: input.version,
      file_path: input.file_path ?? null,
      file_size_bytes: input.file_size_bytes ?? null,
      mime_type: input.mime_type ?? null,
      body: input.body ?? null,
      status: "submitted",
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return SubmissionSchema.parse(data);
}

// ---------- Feedback ----------

export async function fetchFeedbackBySubmission(
  submissionId: string,
): Promise<Feedback[]> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from("feedback")
    .select("*")
    .eq("submission_id", submissionId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => FeedbackSchema.parse(row));
}

export async function insertFeedback(input: {
  submission_id: string;
  instructor_id?: string | null;
  body: string;
  score?: number | null;
}): Promise<Feedback> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from("feedback")
    .insert({
      submission_id: input.submission_id,
      instructor_id: input.instructor_id ?? null,
      body: input.body,
      score: input.score ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return FeedbackSchema.parse(data);
}
