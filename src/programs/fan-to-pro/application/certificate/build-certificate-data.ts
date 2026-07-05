/**
 * Certificate data builder (B0081).
 *
 * 학생 + cohort + student_profile + 출결률 + 발급번호 조립.
 *
 * server-only. action 아님 — 호출자 (server action 또는 server component) 가
 * 권한 가드 후 호출. `경계에서만 검증` 원칙 (Iris 룰).
 *
 * 데이터 source:
 *   - students        (display_name)
 *   - cohorts         (name / starts_on / ends_on / ceremony_on)
 *   - student_profiles (name_ko / name_en)
 *   - attendance      (student × sessions — 출석률 계산)
 *   - certificates    (기존 발급 idempotent)
 *   - sessions        (총 회차 수)
 *
 * Cache 정책: request 스코프 없음 (호출 지점이 이미 force-dynamic).
 */
import "server-only";

import { fetchStudentById } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-repository";
import { fetchCohortById } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/cohort-repository";
import { fetchStudentProfile } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-profile-repository";
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import { generateSerialNo } from "./serial-no";
import type { CertificateData } from "./certificate-template";
import type { Student } from "@/src/programs/fan-to-pro/domain/entities/student";
import type { Cohort } from "@/src/programs/fan-to-pro/domain/entities/cohort";

/** verify URL host — env 없으면 growthcareer.xyz 기본. */
function getSiteBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit && explicit.startsWith("http")) {
    return explicit.replace(/\/$/, "");
  }
  return "https://growthcareer.xyz";
}

/** ISO date (YYYY-MM-DD) → "YYYY년 MM월 DD일". */
function fmtKoreanDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${m[1]}년 ${Number(m[2])}월 ${Number(m[3])}일`;
}

/** ISO date → "Month D, YYYY". */
function fmtEnglishDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const monthName = months[Number(m[2]) - 1];
  return `${monthName} ${Number(m[3])}, ${m[1]}`;
}

/**
 * 발급일 결정: cohort.ceremony_on 우선, 없으면 오늘 (server now, KST).
 */
function resolveIssueDate(cohort: Cohort): string {
  if (cohort.ceremony_on) return cohort.ceremony_on;
  // KST 자정 기준 오늘 날짜 (Asia/Seoul).
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

/**
 * 회차 수 문자열 조립: cohort 의 sessions count 기준.
 */
async function countCohortSessions(cohortId: string): Promise<number> {
  const supabase = getSupabaseServer();
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from("sessions")
    .select("id", { count: "exact", head: true })
    .eq("cohort_id", cohortId);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/**
 * 학생 출석률 계산 (0-1). ended session 기준 present+late / ended session count.
 * ended 회차 0이면 null.
 */
export async function computeAttendanceRate(
  studentId: string,
  cohortId: string,
): Promise<number | null> {
  const supabase = getSupabaseServer();
  if (!supabase) return null;

  const { data: sessions, error: sessErr } = await supabase
    .from("sessions")
    .select("id, status")
    .eq("cohort_id", cohortId);
  if (sessErr) throw new Error(sessErr.message);

  const endedIds = new Set(
    (sessions ?? [])
      .filter((s) => (s as { status: string }).status === "ended")
      .map((s) => (s as { id: string }).id),
  );
  if (endedIds.size === 0) return null;

  const { data: attendance, error: attErr } = await supabase
    .from("attendance")
    .select("session_id, status")
    .eq("student_id", studentId);
  if (attErr) throw new Error(attErr.message);

  let attended = 0;
  for (const a of attendance ?? []) {
    const row = a as { session_id: string; status: string };
    if (!endedIds.has(row.session_id)) continue;
    if (row.status === "present" || row.status === "late") attended += 1;
  }
  return attended / endedIds.size;
}

export type BuildCertificateContext = {
  student: Student;
  cohort: Cohort;
  attendanceRate: number | null;
};

/**
 * 학생 + cohort + attendance 병렬 fetch.
 * eligibility 판정에 필요한 raw context. certificate data 생성 전 preview 모드에서
 * 사용.
 */
export async function loadCertificateContext(
  studentId: string,
): Promise<BuildCertificateContext | null> {
  const student = await fetchStudentById(studentId);
  if (!student) return null;

  const [cohort, rate] = await Promise.all([
    fetchCohortById(student.cohort_id),
    computeAttendanceRate(studentId, student.cohort_id),
  ]);
  if (!cohort) return null;

  return { student, cohort, attendanceRate: rate };
}

/**
 * CertificateData 조립 — HTML 템플릿에 넣을 최종 형태.
 *
 * @param ctx — loadCertificateContext 결과 (eligibility 통과한 학생만)
 * @param options — dryRun=true 이면 serial_no 는 preview 용 ("GC-FTP-PREVIEW")
 */
export async function buildCertificateData(
  ctx: BuildCertificateContext,
  options: { dryRun: boolean } = { dryRun: false },
): Promise<CertificateData> {
  const { student, cohort } = ctx;

  // 학생 실 이름 (name_ko 우선, fallback display_name)
  const profile = await fetchStudentProfile(student.id).catch(() => null);
  const nameKo = profile?.name_ko || student.display_name;
  const nameEn = profile?.name_en || null;

  // 발급번호
  const serialNo = options.dryRun
    ? "GC-FTP-PREVIEW"
    : await generateSerialNo(student.id, cohort.id);

  // 회차 수
  const sessionCount = await countCohortSessions(cohort.id);

  // 발급일
  const issueDate = resolveIssueDate(cohort);

  // 기간 문구
  const startsKo = fmtKoreanDate(cohort.starts_on);
  const endsKo = fmtKoreanDate(cohort.ends_on);
  const startsEn = fmtEnglishDate(cohort.starts_on);
  const endsEn = fmtEnglishDate(cohort.ends_on);

  const durationKo = `${startsKo} 부터 ${endsKo} 까지 (4주, 총 ${sessionCount}회차)`;
  const durationEn = `${startsEn} to ${endsEn} (4 weeks, ${sessionCount} sessions)`;

  // cohort 라벨 (예: "1기 / Cohort 1")
  const cohortName = cohort.name;
  const cohortNumMatch = /(\d+)\s*기/.exec(cohortName);
  const cohortLabel = cohortNumMatch
    ? `${cohortNumMatch[0]} / Cohort ${cohortNumMatch[1]}`
    : cohortName;

  // verify URL (익명 접근 가능)
  const baseUrl = getSiteBaseUrl();
  const verifyUrl = `${baseUrl}/verify/${encodeURIComponent(serialNo)}`;

  return {
    serial_no: serialNo,
    program_name_ko: "Fan to Pro 4주 K-pop 공연 실무 교육 과정",
    program_name_en: "Fan to Pro 4-week K-Pop Live Production Program",
    duration_ko: durationKo,
    duration_en: durationEn,
    cohort_label: cohortLabel,
    recipient_name_ko: nameKo,
    recipient_name_en: nameEn,
    attest_ko:
      "위 사람은 Growth Career 의 Fan to Pro 4주 K-pop 공연 실무 교육 과정을 성실히 이수하였음을 증명합니다.",
    attest_en:
      "This is to certify that the above named person has successfully completed the Fan to Pro 4-week K-Pop Live Production program of Growth Career.",
    issued_date_ko: fmtKoreanDate(issueDate),
    issued_date_en: fmtEnglishDate(issueDate),
    issuer_name: "Dropdown (드롭다운)",
    issuer_biz_no: "154-28-02110",
    verify_url: verifyUrl,
    signature_image_path: "/brand/signature-noah.png",
  };
}
