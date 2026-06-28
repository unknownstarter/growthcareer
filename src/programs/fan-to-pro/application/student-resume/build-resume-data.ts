/**
 * Student Resume — data builder (B0062).
 *
 * 이력서 HTML / PDF 생성을 위한 정규화된 데이터 한 묶음.
 * server-only. action 아님 — 호출자 (server action 또는 server component) 가
 * 권한 가드 후 호출.
 *
 * 데이터 source:
 *   - students          (display_name 영문)
 *   - applicants        (nationality)
 *   - student_profile   (name_ko / name_en / phone / birth / visa / months_in_korea / photo)
 *   - student_career_target (target_role_category / companies / start_date / self_pitch)
 *   - student_resume_item × N (type 별 grouping, order_index ASC)
 *   - student-photos bucket → signed URL 5분 TTL
 *
 * 권한 가드는 호출자 책임 — 본 함수는 권한 검증 안 함 (경계에서만 검증).
 */
import "server-only";

import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import { fetchStudentById } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-repository";
import { fetchStudentProfile } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-profile-repository";
import { fetchStudentCareerTarget } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-career-target-repository";
import { fetchStudentResumeItems } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-resume-item-repository";
import { createPhotoSignedUrl } from "@/src/programs/fan-to-pro/infrastructure/supabase/storage/student-photos-storage";
import type { Student } from "@/src/programs/fan-to-pro/domain/entities/student";
import type { StudentProfile } from "@/src/programs/fan-to-pro/domain/entities/student-profile";
import type { StudentCareerTarget } from "@/src/programs/fan-to-pro/domain/entities/student-career-target";
import {
  type StudentResumeItem,
  type ResumeItemType,
  RESUME_ITEM_TYPES,
} from "@/src/programs/fan-to-pro/domain/entities/student-resume-item";

export interface ResumeBuildData {
  student: Student;
  applicantNationality: string | null;
  profile: StudentProfile | null;
  careerTarget: StudentCareerTarget | null;
  /** type 별 grouping. 6 종 모두 key 존재 (빈 배열 OK). */
  itemsByType: Record<ResumeItemType, StudentResumeItem[]>;
  /** student-photos bucket signed URL (5분 TTL). 사진 없으면 null. */
  photoSignedUrl: string | null;
  /** 완성도 % (0~100) — UI 표시 및 마이그레이션 hint. */
  completion: ResumeCompletion;
}

export interface ResumeCompletion {
  /** 필수 항목 채움 비율. 0~100. */
  percent: number;
  /** 누락된 필수 항목 keys. UI 가 사용자에게 안내. */
  missing: string[];
}

/**
 * 1 student 의 모든 이력서 데이터 fetch + 정규화.
 *
 * Promise.all 병렬 — DB 4개 + storage 1개. p95 < 200ms 목표 (단일 region).
 * profile.photo_path 없으면 signed URL skip.
 */
export async function buildResumeData(
  studentId: string,
): Promise<ResumeBuildData> {
  const supabase = getSupabaseServer();
  if (!supabase) throw new Error("supabaseUnavailable");

  // 4개 read 병렬.
  const [student, profile, careerTarget, items] = await Promise.all([
    fetchStudentById(studentId),
    fetchStudentProfile(studentId),
    fetchStudentCareerTarget(studentId),
    fetchStudentResumeItems(studentId),
  ]);

  if (!student) {
    throw new Error(`student not found: ${studentId}`);
  }

  // applicants.nationality — student.applicant_id → applicants.
  // 별도 query (entity 에 nationality 없음).
  let nationality: string | null = null;
  if (student.applicant_id) {
    const { data: applicant, error: appErr } = await supabase
      .from("applicants")
      .select("nationality")
      .eq("id", student.applicant_id)
      .maybeSingle();
    if (appErr) throw new Error(appErr.message);
    nationality =
      applicant && typeof applicant.nationality === "string"
        ? applicant.nationality
        : null;
  }

  // signed URL — photo_path 있을 때만.
  let photoSignedUrl: string | null = null;
  if (profile?.photo_path) {
    try {
      const { url } = await createPhotoSignedUrl(profile.photo_path);
      photoSignedUrl = url;
    } catch {
      // 사진 발급 실패는 fatal 아님 — 본문은 그대로 진행.
      photoSignedUrl = null;
    }
  }

  // type 별 grouping. 6종 모두 key 존재.
  const itemsByType = RESUME_ITEM_TYPES.reduce(
    (acc, t) => {
      acc[t] = [];
      return acc;
    },
    {} as Record<ResumeItemType, StudentResumeItem[]>,
  );
  for (const it of items) {
    itemsByType[it.type].push(it);
  }
  // order_index ASC, then created_at DESC (repository 가 이미 정렬했지만 안전망).
  for (const t of RESUME_ITEM_TYPES) {
    itemsByType[t].sort((a, b) => a.order_index - b.order_index);
  }

  const completion = computeCompletion({
    profile,
    careerTarget,
    items,
  });

  return {
    student,
    applicantNationality: nationality,
    profile,
    careerTarget,
    itemsByType,
    photoSignedUrl,
    completion,
  };
}

/**
 * 이력서 완성도 — 필수 항목 채움 비율.
 *
 * 필수 항목 (7 종):
 *   - profile.name_ko 또는 name_en
 *   - profile.phone
 *   - profile.birth_date 또는 birth_year
 *   - profile.visa_type
 *   - profile.photo_path
 *   - careerTarget.target_role_category
 *   - 학력 또는 경력 1개 이상
 */
function computeCompletion(input: {
  profile: StudentProfile | null;
  careerTarget: StudentCareerTarget | null;
  items: StudentResumeItem[];
}): ResumeCompletion {
  const checks: { key: string; ok: boolean }[] = [
    {
      key: "name",
      ok: Boolean(input.profile?.name_ko || input.profile?.name_en),
    },
    { key: "phone", ok: Boolean(input.profile?.phone) },
    {
      key: "birth",
      ok: Boolean(input.profile?.birth_date || input.profile?.birth_year),
    },
    { key: "visa", ok: Boolean(input.profile?.visa_type) },
    { key: "photo", ok: Boolean(input.profile?.photo_path) },
    {
      key: "career_target",
      ok: Boolean(input.careerTarget?.target_role_category),
    },
    {
      key: "education_or_experience",
      ok: input.items.some(
        (it) => it.type === "education" || it.type === "experience",
      ),
    },
  ];
  const total = checks.length;
  const passed = checks.filter((c) => c.ok).length;
  return {
    percent: Math.round((passed / total) * 100),
    missing: checks.filter((c) => !c.ok).map((c) => c.key),
  };
}
