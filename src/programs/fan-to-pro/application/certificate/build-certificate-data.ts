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
import { fetchCertificatesByStudent } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/certificate-repository";
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import { generateSerialNo } from "./serial-no";
import type { CertificateData } from "./certificate-template";
import type { Student } from "@/src/programs/fan-to-pro/domain/entities/student";
import type { Cohort } from "@/src/programs/fan-to-pro/domain/entities/cohort";
import type { Certificate } from "@/src/programs/fan-to-pro/domain/entities/certificate";

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
  /**
   * 이미 발급된 (student × cohort × completion) certificate row. verify URL 조립 시
   * verify_token 재사용. 미발급 preview 상황에서는 null.
   */
  existingCompletionCertificate: Certificate | null;
};

/**
 * 학생 + cohort + attendance 병렬 fetch.
 * eligibility 판정에 필요한 raw context. certificate data 생성 전 preview 모드에서
 * 사용.
 *
 * 기존 certificate 도 함께 조회해 verify_token 재사용 가능하게 노출.
 */
export async function loadCertificateContext(
  studentId: string,
): Promise<BuildCertificateContext | null> {
  const student = await fetchStudentById(studentId);
  if (!student) return null;

  const [cohort, rate, existingCerts] = await Promise.all([
    fetchCohortById(student.cohort_id),
    computeAttendanceRate(studentId, student.cohort_id),
    fetchCertificatesByStudent(studentId).catch(() => [] as Certificate[]),
  ]);
  if (!cohort) return null;

  const existingCompletionCertificate =
    existingCerts.find(
      (c) => c.cohort_id === cohort.id && c.kind === "completion",
    ) ?? null;

  return {
    student,
    cohort,
    attendanceRate: rate,
    existingCompletionCertificate,
  };
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

  // 학생 실 이름
  // 노아 fix (2026-07-11): 외국인 학생 = display_name 원본이 영문 (신청 시 입력).
  //   name_en = 원본 (backfill 스크립트로 자동 채움)
  //   name_ko = 한국 이름 있을 때만 (외국인은 null)
  //   수료증 = name_en 크게 표시 (없으면 display_name fallback), name_ko 서브 (있을 때만)
  const profile = await fetchStudentProfile(student.id).catch(() => null);
  const nameEn = profile?.name_en || student.display_name;
  const nameKo = profile?.name_ko || null;

  // 발급번호. dryRun 이어도 실 형식 (GC-FTP-{N기}-{seq}) 표시.
  // generateSerialNo 는 idempotent 이며 INSERT 안 함 (호출자 책임) — 노아 결정 2026-07-19.
  const serialNo = await generateSerialNo(student.id, cohort.id);
  void options.dryRun;

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

  // verify URL (익명 접근 가능).
  // 재설계 (2026-07-19, B0081): URL param 은 opaque nanoid (verify_token).
  //   1) 이미 발급 = 저장된 verify_token 재사용 (재출력 시 동일 URL 유지).
  //   2) preview / 미발급 = "PREVIEW" placeholder — 실제 조회 시 not-found.
  // serial_no 는 문서 UI 표기 전용이라 URL 에 노출 X.
  const baseUrl = getSiteBaseUrl();
  const verifyTokenForUrl =
    ctx.existingCompletionCertificate?.verify_token ?? "PREVIEW";
  const verifyUrl = `${baseUrl}/verify/${verifyTokenForUrl}`;

  // 재설계 (2026-07-19): attest_en 을 서술문 형태로 조립.
  //   T4 = "This certifies that the recipient has completed the Fan to Pro
  //         4-week K-Pop Live Production program from <시작일> to <종료일>,
  //         comprising <N> sessions."
  //   T3 에 이름이 이미 크게 표시되므로 서술문에서 이름 반복 X (the recipient).
  //   cohort 라벨은 별도 span 으로 밑에 표시 (템플릿).
  const attestEn = `This certifies that the recipient has completed the Fan to Pro 4-week K-Pop Live Production program from ${startsEn} to ${endsEn}, comprising ${sessionCount} sessions of hands-on training.`;

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
      "위 사람은 Fan to Pro 4주 K-pop 공연 실무 교육 과정을 성실히 이수하였음을 증명합니다.",
    attest_en: attestEn,
    issued_date_ko: fmtKoreanDate(issueDate),
    issued_date_en: fmtEnglishDate(issueDate),
    issuer_name: "Dropdown (드롭다운)",
    issuer_biz_no: "154-28-02110",
    verify_url: verifyUrl,
    signature_image_path: "/brand/signature-noah.png",
  };
}
