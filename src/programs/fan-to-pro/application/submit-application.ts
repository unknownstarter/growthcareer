"use server";

import {
  ApplicationSchema,
  type ApplicationActionState,
} from "@/src/programs/fan-to-pro/domain/application";
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import { fetchSignupOpenCohort } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/cohort-repository";
import { APP_ERROR, logAppError } from "@/src/shared/errors/codes";

const TABLE = "applicants";
const FAN_TO_PRO_PROGRAM_SLUG = "fan-to-pro";

// Server-side error key — UI resolves this via `applyForm.errors.<key>`.
// Kept here (not in the schema file) because it is action-specific.
const FORM_ERROR_KEY = "submitFailed";

export async function submitApplication(
  _prev: ApplicationActionState,
  formData: FormData,
): Promise<ApplicationActionState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = ApplicationSchema.safeParse(raw);

  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return { status: "error", errors: flat.fieldErrors as never };
  }

  const supabase = getSupabaseServer();

  if (!supabase) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[applicants] Supabase missing, local mock mode");
    }
    return {
      status: "ok_local",
      id: `local-${Date.now().toString(36)}`,
    };
  }

  // Slice O — cohort별 시각 기반 모집 마감 디커플.
  // 전역 program-config.isEnrollmentClosed (1기 cutoff 하드코딩) 제거. 대신 지금
  // 열린 signup cohort (accepts_signup_now=true + status=open + 마감 전) 를 조회해:
  //   있으면 → status='pending', cohort_id = 그 cohort.
  //   없으면 → status='next_cohort_interest', cohort_id = NULL (waitlist).
  // applicants_status_cohort_xor check 가 이 조합을 강제.
  // 조회 실패 (인프라 오류) 시에도 신청 자체는 waitlist 로 계속 받음 (blocking X).
  let cohortId: string | null = null;
  try {
    const open = await fetchSignupOpenCohort();
    if (open) {
      cohortId = open.id;
    }
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[applicants] cohort fetch failed", e);
    }
  }

  const enrollmentClosed = cohortId === null;

  // B0068 Slice 2c — course_slug / bundle_slug → id 조회.
  // 둘 다 optional. 하나만 채워지는 게 정상 (UI 가 강제).
  // 조회 실패 시 = 유효하지 않은 slug → NULL 로 넣고 계속 진행 (신청 자체는 성공).
  // 이유: 신청자가 URL 로 잘못된 slug 를 넣어도 신청은 받되, 운영자가 나중에
  // 매핑 (수동 assignment). validation 실패 시 신청 자체 blocking 은 과함.
  let courseId: string | null = null;
  let bundleId: string | null = null;

  if (parsed.data.course_slug || parsed.data.bundle_slug) {
    // program_id 필요. slug 는 program 안에서만 UNIQUE 이므로 program 먼저 조회.
    const { data: program, error: programErr } = await supabase
      .from("programs")
      .select("id")
      .eq("slug", FAN_TO_PRO_PROGRAM_SLUG)
      .maybeSingle();

    if (programErr) {
      console.error("[applicants] program fetch error", programErr);
    }

    if (program?.id) {
      if (parsed.data.course_slug) {
        const { data: course } = await supabase
          .from("courses")
          .select("id")
          .eq("program_id", program.id)
          .eq("slug", parsed.data.course_slug)
          .eq("status", "open")
          .maybeSingle();
        courseId = course?.id ?? null;
      }
      if (parsed.data.bundle_slug) {
        const { data: bundle } = await supabase
          .from("bundles")
          .select("id")
          .eq("program_id", program.id)
          .eq("slug", parsed.data.bundle_slug)
          .eq("status", "open")
          .maybeSingle();
        bundleId = bundle?.id ?? null;
      }
    }
  }

  // B0069 Slice 1 — 1기 재지원 인식.
  // 신규 신청 이메일과 완전 일치하는 이전 applicant row 를 찾는다. 있으면
  // previous_applicant_id 로 링크. 회원가입 X 상태에서 서버가 자동 인식하는
  // 유일한 트리거는 이메일.
  //
  // 매칭 규칙:
  //   - lower(email) 매칭 (대소문자 무시)
  //   - next_cohort_interest 는 제외 (그 자체가 대기 상태 — 재지원의 대상 X)
  //   - 자기 자신은 아직 INSERT 전이라 자연스럽게 제외됨
  //   - 여러 건 매칭 시 가장 최근 created_at row 만 사용
  //
  // 조회 실패 = silent (신청 자체는 계속 진행). 이력 인식 실패로 신청 blocking 은 과함.
  let previousApplicantId: string | null = null;
  try {
    const { data: prev } = await supabase
      .from(TABLE)
      .select("id")
      .ilike("email", parsed.data.email)
      .not("status", "eq", "next_cohort_interest")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (prev?.id) {
      previousApplicantId = String(prev.id);
    }
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[applicants] previous lookup failed", e);
    }
  }

  // B0007 반자동 모델: INSERT 시 status='pending' (마감 전) / 'next_cohort_interest' (마감 후).
  // 신규 payment_* / notified_at / reminder_count / last_reminder_at 컬럼은
  // INSERT 시점 NULL (reminder_count 는 DB default 0). 자동 발송 없음.
  //
  // B0068 Slice 2c 추가:
  //   - course_id: 단과 신청 시 채워짐
  //   - bundle_id: 올인원 신청 시 채워짐
  //   - enrollment_id: 결제 승격 후 결정 (여기서는 NULL)
  // B0069 Slice 1 추가:
  //   - previous_applicant_id: 이전 신청 링크 (있으면). 어드민 "이력" 컬럼 소스.
  // ADR 0019 (2기 멀티 단과, 간이 정책 B) 추가:
  //   - selection_mode: 'all_in_one' | 'single' (가격 구분). 1기 = NULL.
  //   - selected_course_slugs: 콤마조인 문자열 → 배열. slug 유효성은 운영자 확인
  //     (기존 course_slug 패턴과 동일 — 잘못돼도 신청은 받고 수동 매핑).
  const selectionMode = parsed.data.selection_mode ?? null;
  const selectedCourseSlugs = parsed.data.selected_course_slugs
    ? parsed.data.selected_course_slugs
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : null;

  // 레퍼럴 코드 (선택). zod 에서 이미 대문자/공백제거 정규화됐지만, 액션에서
  // 한 번 더 방어적으로 정규화 후 저장. 빈 값이면 null. 존재 검증은 안 함
  // (노아가 어드민에서 눈으로 확인 후 수동 할인). §7.4 additive nullable 컬럼.
  const referredByCodeRaw = parsed.data.referred_by_code;
  const referredByCode = referredByCodeRaw
    ? referredByCodeRaw.replace(/\s+/g, "").toUpperCase() || null
    : null;

  // 멱등성 — 같은 email 이 "같은 cohort" 에 이미 신청했으면 중복 INSERT 대신 그 행을
  // 갱신한다. 더블탭 / 네트워크 재시도 / 스큐 리로드로 인한 중복 신청 행 방지.
  // (다른 기수 재신청은 새 행으로 허용 = previous_applicant_id 로 이력 링크.)
  // 마감 후(waitlist)면 email + cohort_id NULL + next_cohort_interest 로 판정.
  let sameCohortId: string | null = null;
  try {
    let q = supabase.from(TABLE).select("id").ilike("email", parsed.data.email);
    q = cohortId
      ? q.eq("cohort_id", cohortId)
      : q.is("cohort_id", null).eq("status", "next_cohort_interest");
    const { data: dup } = await q
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (dup?.id) sameCohortId = String(dup.id);
  } catch (e) {
    // 조회 실패해도 신청은 계속 (insert 로 폴백). 신청 접수 우선.
    if (process.env.NODE_ENV !== "production") {
      console.warn("[applicants] dedup lookup failed", e);
    }
  }

  // 갱신 가능한 프로필/선택 필드만. status / cohort_id / notified_at / payment_* /
  // previous_applicant_id 는 절대 덮어쓰지 않는다 — 운영자가 이미 상태를 진행시킨
  // 신청(notified/paid 등)을 재제출이 pending 으로 되돌리거나 발송시각을 지우면 안 됨.
  const profileFields = {
    name: parsed.data.name,
    phone: parsed.data.phone,
    nationality: parsed.data.nationality,
    birthdate: parsed.data.birthdate,
    university: parsed.data.university,
    visa: parsed.data.visa,
    address: parsed.data.address,
    consent: parsed.data.consent,
    consent_operations: parsed.data.consent_operations,
    consent_marketing: parsed.data.consent_marketing,
    course_id: courseId,
    bundle_id: bundleId,
    selection_mode: selectionMode,
    selected_course_slugs: selectedCourseSlugs,
    referred_by_code: referredByCode,
  };

  if (sameCohortId) {
    // 멱등 UPDATE — 새 행 만들지 않고 기존 행의 프로필/선택만 갱신.
    const { data, error } = await supabase
      .from(TABLE)
      .update(profileFields)
      .eq("id", sameCohortId)
      .select("id")
      .single();
    if (error) {
      logAppError(APP_ERROR.APPLY_INSERT_FAILED, error.message);
      return { status: "error", errors: { _form: [FORM_ERROR_KEY] } };
    }
    return { status: "ok", id: String(data.id) };
  }

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      ...profileFields,
      email: parsed.data.email,
      consent_content_use: true,
      source: enrollmentClosed
        ? "fan-to-pro-landing-next-cohort"
        : "fan-to-pro-landing",
      status: enrollmentClosed ? "next_cohort_interest" : "pending",
      cohort_id: cohortId,
      previous_applicant_id: previousApplicantId,
    })
    .select("id")
    .single();

  if (error) {
    logAppError(APP_ERROR.APPLY_INSERT_FAILED, error.message);
    return {
      status: "error",
      errors: { _form: [FORM_ERROR_KEY] },
    };
  }

  // applicantId 는 운영자 페이지 row 식별용. 기존 호출부 호환을 위해 id 키 유지.
  return { status: "ok", id: String(data.id) };
}
