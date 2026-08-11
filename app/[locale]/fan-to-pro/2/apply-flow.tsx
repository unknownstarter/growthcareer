"use client";

/* 신청 플로우 — 과정 선택(CourseSelector, controlled) + 정보 폼 → submitApplication.
   간이 정책 B: selection_mode + selected_course_slugs 를 hidden 으로 전달(ADR 0019).
   프리뷰 전용. 픽셀/터미널 스타일. */
import { useActionState, useState } from "react";
import { submitApplication } from "@/src/programs/fan-to-pro/application/submit-application";
import { VISA_OPTIONS } from "@/src/programs/fan-to-pro/domain/application";
import styles from "./glass.module.css";
import { CourseSelector } from "./pixel-fx";

type Course = {
  slug: string;
  title: string;
  meta: string;
  status: "confirmed" | "pending";
  price: number | null;
};
type FormT = Record<string, string>;

const inputCls =
  "w-full bg-bg px-3.5 py-2.5 text-fg text-sm outline-none focus:border-brand-pink";

export function ApplyFlow({
  courses,
  t,
  formT,
}: {
  courses: Course[];
  t: React.ComponentProps<typeof CourseSelector>["t"];
  formT: FormT;
}) {
  const [mode, setMode] = useState<"all" | "pick">("all");
  const [picked, setPicked] = useState<string[]>([]);
  const [state, action, pending] = useActionState(submitApplication, {
    status: "idle" as const,
  });

  const toggle = (slug: string) =>
    setPicked((p) => (p.includes(slug) ? p.filter((s) => s !== slug) : [...p, slug]));
  const slugs = mode === "all" ? courses.map((c) => c.slug) : picked;
  const invalidPick = mode === "pick" && picked.length === 0;

  if (state.status === "ok" || state.status === "ok_local") {
    return (
      <div className={`${styles.pixelBorder} bg-surface p-8 sm:p-10`}>
        <p className={`${styles.mono} text-brand-pink text-sm`}>
          [ OK ] {formT.successTitle}
        </p>
        <p className="mt-4 max-w-xl text-fg text-base leading-relaxed">{formT.success}</p>
      </div>
    );
  }

  const errored = state.status === "error";
  const errs: Record<string, unknown> = errored ? (state.errors as Record<string, unknown>) : {};

  const textFields = [
    { name: "name", label: formT.name, ph: formT.namePh, type: "text" },
    { name: "email", label: formT.email, ph: formT.emailPh, type: "email" },
    { name: "phone", label: formT.phone, ph: formT.phonePh, type: "tel" },
    { name: "nationality", label: formT.nationality, ph: formT.nationalityPh, type: "text" },
    { name: "birthdate", label: formT.birthdate, ph: "", type: "date" },
    { name: "address", label: formT.address, ph: formT.addressPh, type: "text", wide: true },
    { name: "university", label: formT.university, ph: formT.universityPh, type: "text", optional: true },
  ] as const;

  return (
    <div className="space-y-4">
      {/* 과정 선택 (자체 프레임 보유) */}
      <CourseSelector
        courses={courses}
        t={t}
        mode={mode}
        picked={picked}
        onMode={setMode}
        onToggle={toggle}
      />

      {/* 신청서 폼 */}
      <div className={`${styles.pixelBorder} bg-bg`}>
        <div className={styles.windowBar}>
          <span className={styles.winDot} style={{ background: "#ec4899" }} />
          <span className={styles.winDot} style={{ background: "#a855f7" }} />
          <span className={styles.winDot} style={{ background: "#6366f1" }} />
          <span className="ml-2 text-fg-muted">{formT.cmd}</span>
        </div>
        <form action={action} className="space-y-6 p-6 sm:p-8">
          <input type="hidden" name="selection_mode" value={mode === "all" ? "all_in_one" : "single"} />
          <input type="hidden" name="selected_course_slugs" value={slugs.join(",")} />

          <div className="grid gap-4 sm:grid-cols-2">
            {textFields.map((f) => (
              <label
                key={f.name}
                className={"wide" in f && f.wide ? "block sm:col-span-2" : "block"}
              >
                <span className="mb-1.5 block text-fg-muted text-xs">
                  {f.label}
                  {!("optional" in f && f.optional) ? (
                    <span className="ml-1 text-brand-pink">*</span>
                  ) : null}
                </span>
                <input
                  name={f.name}
                  type={f.type}
                  placeholder={f.ph}
                  required={!("optional" in f && f.optional)}
                  className={`${styles.pixelBorder} ${inputCls} ${errs[f.name] ? "border-brand-pink" : ""}`}
                />
              </label>
            ))}
            <label className="block">
              <span className="mb-1.5 block text-fg-muted text-xs">
                {formT.visa}
                <span className="ml-1 text-brand-pink">*</span>
              </span>
              <select
                name="visa"
                required
                defaultValue=""
                className={`${styles.pixelBorder} ${inputCls} ${errs.visa ? "border-brand-pink" : ""}`}
              >
                <option value="" disabled>
                  {formT.visaPh}
                </option>
                {VISA_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* 동의 */}
          <div className="space-y-2.5 border-border border-t pt-5">
            {[
              { name: "consent", label: formT.consent, req: true },
              { name: "consent_operations", label: formT.consentOps, req: true },
              { name: "consent_marketing", label: formT.consentMkt, req: false },
            ].map((cc) => (
              <label key={cc.name} className="flex items-start gap-2.5 text-sm">
                <input
                  type="checkbox"
                  name={cc.name}
                  required={cc.req}
                  className="mt-0.5 accent-brand-pink"
                />
                <span className="text-fg-muted">{cc.label}</span>
              </label>
            ))}
          </div>

          {errored ? (
            <p className={`${styles.mono} text-brand-pink text-xs`}>[ ERROR ] {formT.error}</p>
          ) : null}
          {invalidPick ? (
            <p className={`${styles.mono} text-brand-pink text-xs`}>{formT.pickRequired}</p>
          ) : null}

          <button
            type="submit"
            disabled={pending || invalidPick}
            className={`${styles.pixelBtn} w-full px-8 py-4 text-base ${
              pending || invalidPick ? "opacity-50" : ""
            }`}
          >
            {pending ? formT.submitting : formT.submit}
          </button>
        </form>
      </div>
    </div>
  );
}
