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

  // B0007 반자동 모델: INSERT 시 status='pending' (마감 전) / 'next_cohort_interest' (마감 후).
  // 신규 payment_* / notified_at / reminder_count / last_reminder_at 컬럼은
  // INSERT 시점 NULL (reminder_count 는 DB default 0). 자동 발송 없음.
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
