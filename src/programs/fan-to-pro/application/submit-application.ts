"use server";

import {
  ApplicationSchema,
  type ApplicationActionState,
} from "@/src/programs/fan-to-pro/domain/application";
import { isEnrollmentClosed } from "@/src/programs/fan-to-pro/domain/marketing/program-config";
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import {
  fetchSignupOpenCohort,
  fetchActiveCohorts,
} from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/cohort-repository";

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

  // 1기 모집 마감 분기. cutoff datetime 이후의 submission 은:
  //   - status = 'next_cohort_interest'
  //   - cohort_id = NULL (다음 기수 cohort 가 아직 없음, 운영자가 추후 생성)
  // applicants_status_cohort_xor check 가 이 조합을 강제. UI 도 마감 후엔
  // CTA / 카피 자동 전환.
  const enrollmentClosed = isEnrollmentClosed();

  // B0032 cohort 자동 매칭 (마감 전에만). 우선순위:
  //   1) accepts_signup_now=true + status=open (운영자가 명시적으로 모집 받는 cohort)
  //   2) fallback — 활성 cohort (open/enrollment_closed/in_progress) 중 가장 빠른 starts_on
  let cohortId: string | null = null;
  if (!enrollmentClosed) {
    try {
      const open = await fetchSignupOpenCohort();
      if (open) {
        cohortId = open.id;
      } else {
        const active = await fetchActiveCohorts();
        if (active.length > 0) {
          cohortId = active[active.length - 1].id;
        }
      }
    } catch (e) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[applicants] cohort fetch failed", e);
      }
    }

    if (!cohortId) {
      console.error("[applicants] noActiveCohort — signup blocked");
      return { status: "error", errors: { _form: [FORM_ERROR_KEY] } };
    }
  }

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
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      nationality: parsed.data.nationality,
      birthdate: parsed.data.birthdate,
      university: parsed.data.university,
      visa: parsed.data.visa,
      address: parsed.data.address,
      consent: parsed.data.consent,
      consent_operations: parsed.data.consent_operations,
      consent_marketing: parsed.data.consent_marketing,
      consent_content_use: true,
      source: enrollmentClosed
        ? "fan-to-pro-landing-next-cohort"
        : "fan-to-pro-landing",
      status: enrollmentClosed ? "next_cohort_interest" : "pending",
      cohort_id: cohortId,
      course_id: courseId,
      bundle_id: bundleId,
      previous_applicant_id: previousApplicantId,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[applicants] insert error", error);
    return {
      status: "error",
      errors: { _form: [FORM_ERROR_KEY] },
    };
  }

  // applicantId 는 운영자 페이지 row 식별용. 기존 호출부 호환을 위해 id 키 유지.
  return { status: "ok", id: String(data.id) };
}
