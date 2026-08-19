"use client";

/* 신청 플로우 — 과정 선택(CourseSelector, controlled) + 정보 폼 → submitApplication.
   간이 정책 B: selection_mode + selected_course_slugs 를 hidden 으로 전달(ADR 0019).
   프리뷰 전용. 픽셀/터미널 스타일. */
import { useActionState, useEffect, useRef, useState } from "react";
import { submitApplication } from "@/src/programs/fan-to-pro/application/submit-application";
import { trackEvent } from "@/src/lib/analytics/gtag";
import { COUNTRY_OPTIONS, VISA_OPTIONS } from "@/src/programs/fan-to-pro/domain/application";
import type { Content } from "./content";
import styles from "./glass.module.css";
import { CourseSelector } from "./pixel-fx";

type Course = {
  slug: string;
  title: string;
  meta: string;
  status: "confirmed" | "pending";
  price: number | null;
};
type FormT = Content["applyForm"];
// 신청 섹션 헤더 (cmd / h1 / desc) — 성공 시 클라이언트에서 숨기려고 ApplyFlow 로 내림.
type ApplyHead = { cmd: string; label: string; h1: string; desc: string };

const inputCls =
  "w-full bg-bg px-3.5 py-2.5 text-fg text-sm outline-none focus:border-brand-pink";

export function ApplyFlow({
  courses,
  t,
  formT,
  head,
}: {
  courses: Course[];
  t: React.ComponentProps<typeof CourseSelector>["t"];
  formT: FormT;
  head: ApplyHead;
}) {
  const [mode, setMode] = useState<"all" | "pick">("all");
  const [picked, setPicked] = useState<string[]>([]);
  const [state, action, pending] = useActionState(submitApplication, {
    status: "idle" as const,
  });
  const formRef = useRef<HTMLFormElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);

  const done = state.status === "ok" || state.status === "ok_local";

  // 성공 시 완료 뷰를 화면 상단으로 스크롤 + focus 이동 (스크린리더/키보드 진입점).
  // 부모 "과정 고르세요" 헤딩은 done 이면 아래에서 렌더 안 함 (혼란 방지).
  useEffect(() => {
    if (!done) return;
    doneRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => doneRef.current?.focus({ preventScroll: true }), 350);
  }, [done]);

  // GA4 전환 이벤트 — 실 신청 완료(status="ok")에만 1회. dev mock(ok_local) 제외.
  // UTM 파라미터는 GA4 세션에 자동 귀속되므로 채널별 신청 수가 자동 집계된다
  // (결제는 오프라인 입금이라 client 이벤트로 못 잡음 = 별도 서버 처리 필요).
  useEffect(() => {
    if (state.status !== "ok") return;
    trackEvent({
      event_name: "generate_lead",
      parameters: {
        campaign: "f2p_2gi",
        selection_mode: effectiveMode,
        courses: slugs.join(","),
        course_count: slugs.length,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  // 검증 에러 시 상단 요약 배너로 스크롤 + 첫 에러 필드 focus.
  // 긴 폼에서 하단 버튼만 보고 있으면 상단 필드 에러를 놓치므로.
  useEffect(() => {
    if (state.status !== "error") return;
    const fieldErrs = (state.errors ?? {}) as Record<string, unknown>;
    bannerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    const first = Object.keys(fieldErrs)[0];
    if (first && formRef.current) {
      const el = formRef.current.elements.namedItem(first);
      if (el instanceof HTMLElement) {
        window.setTimeout(() => el.focus({ preventScroll: true }), 350);
      }
    }
  }, [state]);

  const toggle = (slug: string) =>
    setPicked((p) => (p.includes(slug) ? p.filter((s) => s !== slug) : [...p, slug]));
  const slugs = mode === "all" ? courses.map((c) => c.slug) : picked;
  const invalidPick = mode === "pick" && picked.length === 0;

  // 단과 모드에서 모든 과정을 다 고르면 올인원과 동일 = 올인원가 적용 (노아 스펙).
  // 실 신청자 케이스(Sataish): 단과에서 a-r + sound 둘 다 체크 → single + 110만
  // 으로 잘못 처리됨. picked 가 courses 전체를 덮으면 all_in_one 으로 승격한다.
  const isAllCourses = picked.length === courses.length && picked.length > 0;
  const effectiveMode: "all_in_one" | "single" =
    mode === "all" || isAllCourses ? "all_in_one" : "single";

  if (done) {
    const steps = formT.successSteps;
    return (
      <div
        ref={doneRef}
        tabIndex={-1}
        role="status"
        aria-live="polite"
        className={`${styles.pixelBorder} motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-500 scroll-mt-[136px] bg-surface outline-none`}
      >
        {/* 헤더 밴드 — solid check + 큰 완료 타이틀 (그라데이션/glow 없음, §6.8) */}
        <div className="flex flex-col items-start gap-5 border-border border-b p-8 sm:flex-row sm:items-center sm:gap-6 sm:p-10">
          <span
            aria-hidden
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-sm bg-brand-pink"
          >
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter" shapeRendering="crispEdges">
              <path d="M4 12 L10 18 L20 6" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className={`${styles.mono} font-bold text-brand-pink text-xs`} style={{ letterSpacing: "0.1em" }}>
              [ {formT.successBadge} ]
            </p>
            <h3 className={`${styles.pixelFont} mt-2 text-3xl text-fg sm:text-4xl`} style={{ lineHeight: 1.3 }}>
              {formT.successTitle}
            </h3>
            <p className="mt-3 max-w-xl text-fg-muted text-sm leading-relaxed sm:text-base">
              {formT.success}
            </p>
          </div>
        </div>

        {/* 다음 단계 — 번호 스텝. 완료된 단계는 solid pink, 남은 단계는 border. */}
        <ol className="space-y-3 p-8 sm:p-10">
          {steps.map((s) => (
            <li key={s.n} className="flex items-start gap-4">
              <span
                aria-hidden
                className={`${styles.mono} flex h-9 w-9 shrink-0 items-center justify-center rounded-sm text-sm font-bold ${
                  s.done
                    ? "bg-brand-pink text-white"
                    : "border-2 border-border-strong text-fg-muted"
                }`}
              >
                {s.done ? "✓" : s.n}
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="font-bold text-fg text-sm sm:text-base">{s.t}</p>
                <p className="mt-1 text-fg-muted text-xs leading-relaxed sm:text-sm">{s.d}</p>
              </div>
            </li>
          ))}
        </ol>

        {formT.successNote ? (
          <p className="border-border border-t px-8 py-5 text-fg-subtle text-xs leading-relaxed sm:px-10">
            {formT.successNote}
          </p>
        ) : null}
      </div>
    );
  }

  const errored = state.status === "error";
  const errs: Record<string, unknown> = errored ? (state.errors as Record<string, unknown>) : {};

  const fieldLabels: Record<string, string> = {
    name: formT.name,
    email: formT.email,
    phone: formT.phone,
    nationality: formT.nationality,
    birthdate: formT.birthdate,
    address: formT.address,
    university: formT.university,
    referred_by_code: formT.referral,
    visa: formT.visa,
    consent: formT.consent,
    consent_operations: formT.consentOps,
  };
  const erroredLabels = errored
    ? Object.keys(errs)
        .map((k) => fieldLabels[k])
        .filter(Boolean)
    : [];

  // nationality 는 select (COUNTRY_OPTIONS) 로 분리 렌더 → textFields 에서 제외.
  // address = 선택값 (거주 지역 도시/구), university = 필수 (스키마는 optional 이나
  // 2기 UI 레벨에서만 required 강제. 1기 폼은 미변경).
  const textFields = [
    { name: "name", label: formT.name, ph: formT.namePh, type: "text" },
    { name: "email", label: formT.email, ph: formT.emailPh, type: "email" },
    { name: "phone", label: formT.phone, ph: formT.phonePh, type: "tel" },
    { name: "birthdate", label: formT.birthdate, ph: "", type: "date" },
    { name: "university", label: formT.university, ph: formT.universityPh, type: "text" },
    { name: "address", label: formT.address, ph: formT.addressPh, type: "text", optional: true, wide: true },
    { name: "referred_by_code", label: formT.referral, ph: formT.referralPh, type: "text", optional: true, wide: true, uppercase: true },
  ] as const;

  return (
    <div className="space-y-4">
      {/* 신청 섹션 헤더 (cmd / h1 / desc). 성공 시 done 뷰가 위 return 으로 대체돼
          "과정 고르세요" 헤딩이 화면에 남지 않음 (혼란 방지). */}
      <div className="mb-10">
        <p className={`${styles.mono} mb-5 text-xs`} style={{ letterSpacing: "0.04em" }}>
          <span className="text-brand-pink">$</span> {head.cmd}
          <span className={styles.blink} aria-hidden>_</span>
          <span className="ml-2 text-fg-subtle">// {head.label}</span>
        </p>
        <h2 className={`${styles.pixelFont} text-3xl sm:text-4xl`} style={{ lineHeight: 1.45, letterSpacing: 0 }}>
          {head.h1}
        </h2>
        <p className="mt-5 max-w-xl text-fg-muted text-base leading-relaxed sm:text-lg">
          {head.desc}
        </p>
      </div>

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
        <form ref={formRef} action={action} className="space-y-6 p-6 sm:p-8">
          {/* 검증 에러 요약 배너 — 첫 에러 필드로 스크롤/focus 되는 앵커 */}
          {errored ? (
            <div
              ref={bannerRef}
              role="alert"
              aria-live="assertive"
              className={`${styles.pixelBorder} motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-2 motion-safe:duration-300 border-brand-pink bg-brand-pink/10 p-4`}
            >
              <p className={`${styles.mono} text-brand-pink text-sm font-black`}>
                {erroredLabels.length > 0 ? formT.checkTitle : formT.errorTitle}
              </p>
              <p className="mt-1.5 text-fg-muted text-xs">
                {erroredLabels.length > 0
                  ? `${formT.checkBody}: ${erroredLabels.join(", ")}`
                  : formT.error}
              </p>
            </div>
          ) : null}
          <input type="hidden" name="selection_mode" value={effectiveMode} />
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
                  maxLength={"uppercase" in f && f.uppercase ? 20 : undefined}
                  autoCapitalize={"uppercase" in f && f.uppercase ? "characters" : undefined}
                  className={`${styles.pixelBorder} ${inputCls} ${errs[f.name] ? "border-brand-pink" : ""}`}
                  style={"uppercase" in f && f.uppercase ? { textTransform: "uppercase" } : undefined}
                />
              </label>
            ))}
            <label className="block">
              <span className="mb-1.5 block text-fg-muted text-xs">
                {formT.nationality}
                <span className="ml-1 text-brand-pink">*</span>
              </span>
              <select
                name="nationality"
                required
                defaultValue=""
                className={`${styles.pixelBorder} ${inputCls} ${errs.nationality ? "border-brand-pink" : ""}`}
              >
                <option value="" disabled>
                  {formT.nationalityPh}
                </option>
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
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
