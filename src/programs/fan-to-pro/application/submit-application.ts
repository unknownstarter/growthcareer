"use server";

import {
  ApplicationSchema,
  type ApplicationActionState,
} from "@/src/programs/fan-to-pro/domain/application";
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

  // B0032 cohort 자동 매칭. 우선순위:
  //   1) accepts_signup_now=true + status=open (운영자가 명시적으로 모집 받는 cohort)
  //   2) fallback — 활성 cohort (open/enrollment_closed/in_progress) 중 가장 빠른 starts_on
  //   3) 없으면 fail (운영자에게 cohort 생성 알림)
  //
  // applicants.cohort_id NOT NULL — 자동 매칭 실패 시 INSERT 실패 사고 방지.
  let cohortId: string | null = null;
  try {
    const open = await fetchSignupOpenCohort();
    if (open) {
      cohortId = open.id;
    } else {
      const active = await fetchActiveCohorts();
      if (active.length > 0) {
        // 가장 빠른 starts_on (= 다음 코앞 기수) — fetchActiveCohorts 는 DESC 정렬이므로 마지막.
        cohortId = active[active.length - 1].id;
      }
    }
  } catch (e) {
    // cohort fetch 자체 실패는 비치명적 — fallback 으로 cohort_id 없이 INSERT 시도
    // (이후 NOT NULL constraint 가 실제 fail 을 발생시킴).
    if (process.env.NODE_ENV !== "production") {
      console.warn("[applicants] cohort fetch failed", e);
    }
  }

  if (!cohortId) {
    console.error("[applicants] noActiveCohort — signup blocked");
    return { status: "error", errors: { _form: [FORM_ERROR_KEY] } };
  }

  // B0007 반자동 모델: INSERT 시 status='pending' 명시. 입금 안내는
  // 운영자(/admin/applicants) 가 발송 후 토글 → status='notified' 로 전환.
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
      // Content-use consent is implied at submission (notice shown in form).
      // If the applicant later requests withdrawal, an operator updates this to false.
      consent_content_use: true,
      source: "fan-to-pro-landing",
      status: "pending",
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
