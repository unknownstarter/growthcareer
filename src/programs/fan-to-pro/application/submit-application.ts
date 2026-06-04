"use server";

import {
  ApplicationSchema,
  type ApplicationActionState,
} from "@/src/programs/fan-to-pro/domain/application";
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";

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
      console.warn(
        "[applicants] Supabase missing — local mock mode",
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
      // Content-use consent is implied at submission (notice shown in form).
      // If the applicant later requests withdrawal, an operator updates this to false.
      consent_content_use: true,
      source: "fan-to-pro-landing",
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

  return { status: "ok", id: String(data.id) };
}
