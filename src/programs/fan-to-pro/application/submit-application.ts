"use server";

import {
  ApplicationSchema,
  type ApplicationActionState,
} from "@/src/programs/fan-to-pro/domain/application";
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";

const TABLE = "applicants";

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
      console.warn(
        "[applicants] Supabase 미구성 — 로컬 모의 모드로 신청 처리",
        parsed.data,
      );
    }
    return {
      status: "ok_local",
      id: `local-${Date.now().toString(36)}`,
    };
  }

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      birthdate: parsed.data.birthdate,
      university: parsed.data.university,
      visa: parsed.data.visa,
      address: parsed.data.address,
      consent: parsed.data.consent,
      consent_operations: parsed.data.consent_operations,
      consent_marketing: parsed.data.consent_marketing,
      // 콘텐츠 활용 동의 — 수강 신청 완료 시 동의 간주 (회색 안내로 고지).
      // 향후 사용자가 운영진에 철회 의사 통보 시 별도로 false 업데이트.
      consent_content_use: true,
      source: "fan-to-pro-landing",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[applicants] insert error", error);
    return {
      status: "error",
      errors: { _form: ["신청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."] },
    };
  }

  return { status: "ok", id: String(data.id) };
}
