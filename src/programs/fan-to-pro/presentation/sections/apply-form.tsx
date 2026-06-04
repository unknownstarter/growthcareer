"use client";

import { useActionState, useCallback, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { submitApplication } from "@/src/programs/fan-to-pro/application/submit-application";
import {
  Step1Schema,
  VISA_OPTIONS,
  type ApplicationActionState,
} from "@/src/programs/fan-to-pro/domain/application";
import { PRICING, formatKRW } from "@/src/programs/fan-to-pro/domain/pricing";
import {
  ENROLLMENT_CAP,
  OPERATOR,
  REFUND_POLICY,
} from "@/src/programs/fan-to-pro/domain/program";
import { Chip } from "../ui/chip";
import { Container } from "../ui/container";
import { Eyebrow } from "../ui/eyebrow";
import { Section } from "../ui/section";

const INITIAL: ApplicationActionState = { status: "idle" };

type Step1Data = {
  name: string;
  email: string;
  phone: string;
};

type Step2Data = {
  birthdate: string;
  university: string;
  visa: string;
  address: string;
};

const EMPTY_STEP1: Step1Data = { name: "", email: "", phone: "" };
const EMPTY_STEP2: Step2Data = {
  birthdate: "",
  university: "",
  visa: "",
  address: "",
};

type Step1Field = keyof Step1Data;
const STEP1_FIELD_ORDER: readonly Step1Field[] = ["name", "email", "phone"];

// All translatable error keys live in messages under `applyForm.errors.<key>`.
// The schemas / server action only emit keys; the UI resolves them here so
// errors stay localized while business logic remains language-agnostic.
function resolveErrorKey(
  tErrors: (k: string) => string,
  key: string | undefined,
): string | undefined {
  if (!key) return undefined;
  // tEr falls back to the raw key if not found; treat that as "unknown".
  try {
    return tErrors(key);
  } catch {
    return key;
  }
}

export function ApplyForm() {
  const t = useTranslations("applyForm");
  const tErrors = useTranslations("applyForm.errors");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const [step, setStep] = useState<1 | 2>(1);
  const [step1, setStep1] = useState<Step1Data>(EMPTY_STEP1);
  const [step2, setStep2] = useState<Step2Data>(EMPTY_STEP2);
  const [step1Errors, setStep1Errors] = useState<
    Partial<Record<Step1Field, string>>
  >({});

  const step1Refs = useRef<Record<Step1Field, HTMLInputElement | null>>({
    name: null,
    email: null,
    phone: null,
  });

  const setStep1Ref = (field: Step1Field) => (el: HTMLInputElement | null) => {
    step1Refs.current[field] = el;
  };

  const [state, formAction, pending] = useActionState(
    submitApplication,
    INITIAL,
  );

  const handleStep1Submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data: Step1Data = {
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      phone: String(fd.get("phone") ?? ""),
    };
    const parsed = Step1Schema.safeParse(data);
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      const errors: Partial<Record<Step1Field, string>> = {
        name: resolveErrorKey(tErrors, flat.name?.[0]),
        email: resolveErrorKey(tErrors, flat.email?.[0]),
        phone: resolveErrorKey(tErrors, flat.phone?.[0]),
      };
      setStep1Errors(errors);
      setStep1(data);
      const firstErrorField = STEP1_FIELD_ORDER.find((f) => errors[f]);
      if (firstErrorField) {
        const el = step1Refs.current[firstErrorField];
        if (el) {
          el.focus({ preventScroll: true });
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
      return;
    }
    setStep1Errors({});
    setStep1(parsed.data);
    setStep(2);
  };

  const step2FormRef = useRef<HTMLFormElement | null>(null);

  const readStep2FromDom = useCallback(() => {
    const form = step2FormRef.current;
    if (!form) return;
    const fd = new FormData(form);
    setStep2({
      birthdate: String(fd.get("birthdate") ?? ""),
      university: String(fd.get("university") ?? ""),
      visa: String(fd.get("visa") ?? ""),
      address: String(fd.get("address") ?? ""),
    });
  }, []);

  const captureStep2 = (e: React.FormEvent<HTMLFormElement>) => {
    const fd = new FormData(e.currentTarget);
    setStep2({
      birthdate: String(fd.get("birthdate") ?? ""),
      university: String(fd.get("university") ?? ""),
      visa: String(fd.get("visa") ?? ""),
      address: String(fd.get("address") ?? ""),
    });
  };

  const handleBackToStep1 = () => {
    readStep2FromDom();
    setStep(1);
  };

  if (state.status === "ok" || state.status === "ok_local") {
    return (
      <Section id="apply" tone="bg" trackingName="Apply Form" trackingOrder={15}>
        <Container>
          <Eyebrow n="14">{t("eyebrow")}</Eyebrow>
          <SuccessBlock id={state.id} email={step1.email} name={step1.name} />
        </Container>
      </Section>
    );
  }

  const rawFieldErrors =
    state.status === "error" ? state.errors : ({} as Record<string, string[]>);

  // Translate server-emitted keys at display time.
  const fieldErrors: Record<string, string | undefined> = {
    name: resolveErrorKey(tErrors, rawFieldErrors.name?.[0]),
    email: resolveErrorKey(tErrors, rawFieldErrors.email?.[0]),
    phone: resolveErrorKey(tErrors, rawFieldErrors.phone?.[0]),
    birthdate: resolveErrorKey(tErrors, rawFieldErrors.birthdate?.[0]),
    university: resolveErrorKey(tErrors, rawFieldErrors.university?.[0]),
    visa: resolveErrorKey(tErrors, rawFieldErrors.visa?.[0]),
    address: resolveErrorKey(tErrors, rawFieldErrors.address?.[0]),
    consent: resolveErrorKey(tErrors, rawFieldErrors.consent?.[0]),
    consent_operations: resolveErrorKey(
      tErrors,
      rawFieldErrors.consent_operations?.[0],
    ),
    consent_marketing: resolveErrorKey(
      tErrors,
      rawFieldErrors.consent_marketing?.[0],
    ),
    _form: resolveErrorKey(tErrors, rawFieldErrors._form?.[0]),
  };

  return (
    <Section id="apply" tone="surface" trackingName="Apply Form" trackingOrder={15}>
      <Container>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Eyebrow n="14">{t("eyebrow")}</Eyebrow>
          <Chip variant="accent" size="md">
            {t("chipTemplate", {
              seats: ENROLLMENT_CAP.totalSeats,
              cutoff: t("summary.cutoffValue"),
            })}
          </Chip>
        </div>

        <h2
          className="mt-6 mb-4 font-black text-fg text-4xl sm:text-5xl"
          style={{
            letterSpacing: "-0.04em",
            lineHeight: 1.1,
            textWrap: "balance",
          }}
        >
          {t("headline")}
        </h2>

        <p
          className="mb-6 max-w-2xl text-base leading-relaxed text-fg-muted sm:text-lg"
          style={{ textWrap: "pretty" }}
        >
          {t("leadA", { price: formatKRW(PRICING.discounted, locale) })}
          <br />
          {t("leadB")}
        </p>

        <div className="mx-auto mb-12 flex max-w-3xl flex-col gap-2 border-2 border-brand-pink bg-brand-pink/5 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
          <span
            className="inline-flex shrink-0 items-center bg-brand-pink px-2.5 py-1 font-black text-fg text-[10px] uppercase sm:text-xs whitespace-nowrap"
            style={{ letterSpacing: "0.2em" }}
          >
            {t("audienceBanner.badge")}
          </span>
          <p className="text-fg text-sm leading-relaxed sm:text-base">
            {t("audienceBanner.bodyA")}{" "}
            <span className="font-black text-brand-pink">
              {t("audienceBanner.bodyEmphasis")}
            </span>{" "}
            {t("audienceBanner.bodyB")}
          </p>
        </div>

        {/* Summary Grid */}
        <div className="mx-auto mb-px grid max-w-3xl grid-cols-1 gap-px border border-fg/20 bg-fg/20 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCell
            label={t("summary.firstSessionLabel")}
            value={t("summary.firstSessionValue")}
            sub={t("summary.firstSessionSub")}
          />
          <SummaryCell
            label={t("summary.locationLabel")}
            value={t("summary.locationValue")}
            sub={t("summary.locationSub")}
          />
          <SummaryCell
            label={t("summary.cutoffLabel")}
            value={t("summary.cutoffValue")}
            sub={t("summary.cutoffSubTemplate", {
              min: ENROLLMENT_CAP.minToProceed,
            })}
            accent
          />
          <SummaryCell
            label={t("summary.amountLabel")}
            value={formatKRW(PRICING.discounted, locale)}
            sub={t("summary.amountSub")}
          />
        </div>

        {/* Trust Strip */}
        <div className="mx-auto mb-12 grid max-w-3xl grid-cols-2 gap-px border border-fg/20 bg-fg/20 lg:grid-cols-4">
          <TrustCell
            label={t("trust.certificateLabel")}
            value={OPERATOR.legalName}
          />
          <TrustCell
            label={t("trust.performanceLabel")}
            value={t("trust.performanceValue")}
          />
          <TrustCell
            label={t("trust.refundLabel")}
            value={t("trust.refundValue")}
          />
          <TrustCell
            label={t("trust.inquiryLabel")}
            value={t("trust.inquiryValue")}
          />
        </div>

        <div className="mx-auto max-w-3xl border border-border bg-surface p-6 sm:p-10">
          <StepIndicator step={step} stepLabel={t("step", { step })} />

          {step === 1 ? (
            <form
              onSubmit={handleStep1Submit}
              className="grid grid-cols-1 gap-5"
              noValidate
            >
              <Field
                label={t("fields.name.label")}
                name="name"
                placeholder={t("fields.name.placeholder")}
                defaultValue={step1.name}
                error={step1Errors.name}
                autoComplete="name"
                required
                inputRef={setStep1Ref("name")}
              />
              <Field
                label={t("fields.email.label")}
                name="email"
                type="email"
                placeholder={t("fields.email.placeholder")}
                defaultValue={step1.email}
                error={step1Errors.email}
                autoComplete="email"
                required
                inputRef={setStep1Ref("email")}
              />
              <Field
                label={t("fields.phone.label")}
                name="phone"
                type="tel"
                placeholder={t("fields.phone.placeholder")}
                defaultValue={step1.phone}
                error={step1Errors.phone}
                autoComplete="tel"
                required
                inputRef={setStep1Ref("phone")}
              />

              <button
                type="submit"
                className="mt-4 flex items-center justify-center gap-2 bg-brand-pink py-5 font-black text-fg text-lg uppercase transition-colors hover:bg-brand-purple sm:py-6 sm:text-xl"
                style={{ letterSpacing: "-0.02em" }}
              >
                {t("step1NextCta")}
              </button>
            </form>
          ) : (
            <form
              ref={step2FormRef}
              action={formAction}
              onSubmit={captureStep2}
              className="grid grid-cols-1 gap-5"
              noValidate
            >
              <input type="hidden" name="name" value={step1.name} />
              <input type="hidden" name="email" value={step1.email} />
              <input type="hidden" name="phone" value={step1.phone} />

              <Field
                label={t("fields.birthdate.label")}
                name="birthdate"
                type="date"
                defaultValue={step2.birthdate}
                error={fieldErrors.birthdate}
                autoComplete="bday"
                min="1960-01-01"
                max="2010-12-31"
                required
              />
              <Field
                label={t("fields.university.label")}
                name="university"
                placeholder={t("fields.university.placeholder")}
                defaultValue={step2.university}
                error={fieldErrors.university}
                required
              />

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="visa"
                  className="text-fg-subtle text-xs font-black uppercase"
                  style={{ letterSpacing: "0.2em" }}
                >
                  {t("fields.visa.label")}
                </label>
                <select
                  id="visa"
                  name="visa"
                  required
                  defaultValue={step2.visa}
                  aria-invalid={fieldErrors.visa ? true : undefined}
                  aria-describedby={fieldErrors.visa ? "visa-error" : undefined}
                  className="border border-border bg-bg px-4 py-4 font-black text-fg outline-none focus:border-brand-pink"
                >
                  <option value="" disabled>
                    {t("fields.visa.placeholder")}
                  </option>
                  {VISA_OPTIONS.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
                {fieldErrors.visa && (
                  <p id="visa-error" className="text-brand-pink text-xs">
                    {fieldErrors.visa}
                  </p>
                )}
              </div>

              <Field
                label={t("fields.address.label")}
                name="address"
                placeholder={t("fields.address.placeholder")}
                defaultValue={step2.address}
                error={fieldErrors.address}
                autoComplete="address-level2"
                required
              />

              <PaymentNotice />

              <RefundSummary />

              <ConsentRow
                name="consent"
                variant="required"
                label={t("consent.required.label")}
                requiredBadge={t("consent.requiredBadge")}
                body={
                  <>
                    {t("consent.required.bodyA")}{" "}
                    <span className="font-black text-fg">
                      {t("consent.required.bodyEmphasis")}
                    </span>{" "}
                    {t("consent.required.bodyB")}
                  </>
                }
                error={fieldErrors.consent}
              />

              <ConsentRow
                name="consent_operations"
                variant="required"
                label={t("consent.operations.label")}
                requiredBadge={t("consent.requiredBadge")}
                body={t("consent.operations.bodyTemplate", {
                  commitment: t("attendanceCommitment"),
                })}
                error={fieldErrors.consent_operations}
              />

              <ConsentRow
                name="consent_marketing"
                variant="optional"
                label={t("consent.marketing.label")}
                optionalBadge={t("consent.optionalBadge")}
                body={t("consent.marketing.body")}
                error={fieldErrors.consent_marketing}
              />

              <p className="-mt-2 text-fg-subtle text-xs leading-relaxed max-w-prose">
                {t("contentUseNote")}
              </p>

              {fieldErrors._form && (
                <p className="border border-brand-pink bg-brand-pink/10 px-4 py-3 text-brand-pink text-sm">
                  {fieldErrors._form}
                </p>
              )}

              <div className="mt-2 flex justify-end border-border border-t pt-6 text-sm">
                <button
                  type="button"
                  onClick={handleBackToStep1}
                  className="text-fg-subtle text-xs uppercase hover:text-fg"
                  style={{ letterSpacing: "0.2em" }}
                >
                  {t("step2BackCta")}
                </button>
              </div>

              <button
                type="submit"
                disabled={pending}
                className="mt-2 flex items-center justify-center gap-2 bg-brand-pink py-5 font-black text-fg text-lg uppercase transition-colors hover:bg-brand-purple disabled:opacity-50 sm:py-6 sm:text-xl"
                style={{ letterSpacing: "-0.02em" }}
              >
                {pending ? t("step2SubmittingCta") : t("step2SubmitCta")}
              </button>
            </form>
          )}
        </div>
      </Container>
      {/* Keep the import referenced so the lint pass doesn't drop it. */}
      <span hidden>{tCommon("openInNewTab")}</span>
      <span hidden>{REFUND_POLICY.legalBasis}</span>
    </Section>
  );
}

function SummaryCell({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 bg-bg p-5 sm:p-6">
      <span
        className="text-fg-subtle text-[10px] font-black uppercase sm:text-xs whitespace-nowrap"
        style={{ letterSpacing: "0.3em" }}
      >
        {label}
      </span>
      <p
        className={`font-black text-lg leading-tight sm:text-xl ${
          accent ? "text-brand-pink" : "text-fg"
        }`}
        style={{
          letterSpacing: "-0.03em",
          textWrap: "balance",
        }}
      >
        {value}
      </p>
      {sub ? (
        <p className="text-fg-muted text-xs leading-relaxed">{sub}</p>
      ) : null}
    </div>
  );
}

function TrustCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 bg-bg p-4 sm:p-5">
      <span
        className="text-fg-subtle text-[10px] uppercase"
        style={{ letterSpacing: "0.3em" }}
      >
        {label}
      </span>
      <p
        className="font-black text-fg text-sm leading-tight sm:text-base"
        style={{
          letterSpacing: "-0.02em",
          textWrap: "balance",
        }}
      >
        {value}
      </p>
    </div>
  );
}

function RefundSummary() {
  const t = useTranslations("applyForm.refundSummary");
  const tTerms = useTranslations("terms");
  // Refund schedule rows are sourced from the `terms.sections[6]` table to
  // stay in lockstep with the legal terms page. Same locale, same rows.
  const sections = tTerms.raw("sections") as Array<{
    n: string;
    tableRows?: string[][];
  }>;
  const refundSection = sections.find((s) => s.n === "07");
  const rows = refundSection?.tableRows ?? [];

  return (
    <div className="mt-2 border border-border bg-bg p-4 sm:p-5">
      <p
        className="mb-3 text-fg-subtle text-[10px] font-black uppercase sm:text-xs"
        style={{ letterSpacing: "0.3em" }}
      >
        {t("label")}
      </p>
      <ul className="grid grid-cols-1 gap-1 text-fg-muted text-xs leading-relaxed sm:text-sm">
        {rows.map((row, i) => (
          <li
            key={i}
            className="flex flex-wrap items-start justify-between gap-3 border-border/60 border-b py-1.5 last:border-b-0"
          >
            <span>{row[0]}</span>
            <span className="font-black text-fg">{row[1]}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-fg-subtle text-[11px] leading-relaxed max-w-prose">
        {t("noteTemplate", {
          legalBasis: REFUND_POLICY.legalBasis,
          autoRefundNote: ENROLLMENT_CAP.autoRefundNote,
        })}
      </p>
    </div>
  );
}

function ConsentRow({
  name,
  label,
  body,
  error,
  variant,
  requiredBadge,
  optionalBadge,
}: {
  name: string;
  label: string;
  body: React.ReactNode;
  error?: string;
  variant: "required" | "optional";
  requiredBadge?: string;
  optionalBadge?: string;
}) {
  const isRequired = variant === "required";
  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-start gap-3 border border-border bg-bg p-4 text-fg-muted text-sm">
        <input
          type="checkbox"
          name={name}
          required={isRequired}
          aria-invalid={error ? true : undefined}
          className="mt-1 h-4 w-4 shrink-0 accent-brand-pink"
        />
        <span className="flex flex-col gap-1.5">
          <span className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-block px-2 py-0.5 text-[10px] font-black uppercase whitespace-nowrap ${
                isRequired
                  ? "bg-brand-pink text-fg"
                  : "border border-border bg-bg text-fg-subtle"
              }`}
              style={{ letterSpacing: "0.2em" }}
            >
              {isRequired ? requiredBadge : optionalBadge}
            </span>
            <span className="font-black text-fg">{label}</span>
          </span>
          <span className="leading-relaxed">{body}</span>
        </span>
      </label>
      {error ? <p className="text-brand-pink text-xs">{error}</p> : null}
    </div>
  );
}

function PaymentNotice() {
  const t = useTranslations("applyForm.paymentNotice");
  const locale = useLocale();

  return (
    <div className="mt-2 border-2 border-brand-pink bg-brand-pink/5 p-5 sm:p-6">
      <p
        className="mb-4 text-brand-pink text-[10px] font-black uppercase sm:text-xs"
        style={{ letterSpacing: "0.3em" }}
      >
        {t("eyebrow")}
      </p>

      <p
        className="mb-5 font-black text-fg text-xl leading-snug sm:text-2xl"
        style={{
          letterSpacing: "-0.03em",
          textWrap: "balance",
        }}
      >
        {t("headlineA")}{" "}
        <span className="text-brand-pink whitespace-nowrap">
          {formatKRW(PRICING.discounted, locale)}
        </span>{" "}
        {t("headlineB")}{" "}
        <br className="hidden sm:block" />
        {t("headlineC")}{" "}
        <span className="text-brand-pink">{t("headlineEmphasisB")}</span>{" "}
        {t("headlineD")}
      </p>

      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-brand-pink/40 border-t pt-4 text-sm sm:text-base">
        <dt
          className="text-fg-subtle text-xs uppercase"
          style={{ letterSpacing: "0.2em" }}
        >
          {t("bankLabel")}
        </dt>
        <dd className="font-black text-fg">{PRICING.bank.bankName}</dd>

        <dt
          className="text-fg-subtle text-xs uppercase"
          style={{ letterSpacing: "0.2em" }}
        >
          {t("accountLabel")}
        </dt>
        <dd className="font-black text-fg tracking-wider">
          {PRICING.bank.accountNumber}
        </dd>

        <dt
          className="text-fg-subtle text-xs uppercase"
          style={{ letterSpacing: "0.2em" }}
        >
          {t("holderLabel")}
        </dt>
        <dd className="font-black text-fg">{PRICING.bank.accountHolder}</dd>

        <dt
          className="text-fg-subtle text-xs uppercase"
          style={{ letterSpacing: "0.2em" }}
        >
          {t("amountLabel")}
        </dt>
        <dd className="font-black text-brand-pink whitespace-nowrap">
          {formatKRW(PRICING.discounted, locale)}
        </dd>
      </dl>

      <p className="mt-4 border border-brand-pink/40 bg-bg p-3 text-fg text-xs leading-relaxed sm:text-sm">
        <span
          className="mr-2 inline-block bg-brand-pink px-2 py-0.5 align-middle text-fg text-[10px] font-black uppercase whitespace-nowrap"
          style={{ letterSpacing: "0.2em" }}
        >
          {t("depositorNoticeBadge")}
        </span>
        {t("depositorNoticeA")}{" "}
        <span className="font-black text-brand-pink">
          {t("depositorNoticeEmphasis")}
        </span>{" "}
        {t("depositorNoticeB")}
      </p>

      <p className="mt-3 text-fg-muted text-xs leading-relaxed sm:text-sm">
        {t("kakaoNote")}
      </p>

      <p className="mt-4 border-brand-pink/20 border-t pt-3 text-fg-subtle text-[11px] leading-relaxed">
        {t("operatorNoteTemplate", {
          issuer: t("operatorIssuer"),
          bizNo: OPERATOR.businessNumber,
          partner: t("operatorPartner"),
          faculty: t("operatorFaculty"),
        })}
      </p>
    </div>
  );
}

function StepIndicator({ step, stepLabel }: { step: 1 | 2; stepLabel: string }) {
  return (
    <div className="mb-8 flex items-center gap-3 text-xs uppercase">
      <span
        className={`flex h-8 w-8 items-center justify-center font-black ${
          step >= 1 ? "bg-brand-pink text-fg" : "bg-border text-fg-subtle"
        }`}
      >
        1
      </span>
      <span className="h-px flex-1 bg-border" aria-hidden />
      <span
        className={`flex h-8 w-8 items-center justify-center font-black ${
          step >= 2 ? "bg-brand-pink text-fg" : "bg-border text-fg-subtle"
        }`}
      >
        2
      </span>
      <span
        className="ml-3 text-fg-subtle whitespace-nowrap"
        style={{ letterSpacing: "0.2em" }}
      >
        {stepLabel}
      </span>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  defaultValue,
  error,
  autoComplete,
  required,
  min,
  max,
  inputRef,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  defaultValue?: string;
  error?: string;
  autoComplete?: string;
  required?: boolean;
  min?: string;
  max?: string;
  inputRef?: (el: HTMLInputElement | null) => void;
}) {
  const errorId = error ? `${name}-error` : undefined;
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={name}
        className="text-fg-subtle text-xs font-black uppercase"
        style={{
          letterSpacing: "0.2em",
          textWrap: "balance",
        }}
      >
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        required={required}
        min={min}
        max={max}
        ref={inputRef}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className="w-full border border-border bg-bg px-4 py-4 font-medium text-fg placeholder:text-fg-subtle outline-none focus:border-brand-pink"
      />
      {error && (
        <p id={errorId} className="text-brand-pink text-xs">
          {error}
        </p>
      )}
    </div>
  );
}

function SuccessBlock({
  id,
  email,
  name,
}: {
  id: string;
  email: string;
  name: string;
}) {
  const t = useTranslations("applyForm.success");
  const checklist = t.raw("checklist") as string[];
  return (
    <div className="mx-auto max-w-2xl border-2 border-brand-pink bg-surface p-8 text-center sm:p-12">
      <p
        className="mb-4 text-brand-pink text-xs font-black uppercase"
        style={{ letterSpacing: "0.3em" }}
      >
        {t("headerLabel")}
      </p>

      <h3
        className="mb-6 font-black text-fg text-3xl sm:text-5xl"
        style={{
          letterSpacing: "-0.04em",
          lineHeight: 1.05,
          textWrap: "balance",
        }}
      >
        {name || t("fallbackName")}
        {t("headlineNameSuffix")}
        <br />
        <span className="text-brand-pink">{t("headlineEmphasis")}</span>
      </h3>

      <p className="mb-8 text-fg-muted text-base leading-relaxed sm:text-lg">
        {t("bodyA")}{" "}
        {t("bodyB", { email: email || t("fallbackEmail") })}
        <br />
        <span className="text-fg-subtle text-sm">
          {t("idLabel", { id })}
        </span>
      </p>

      <ul className="mb-2 grid grid-cols-1 gap-2 text-left text-fg-muted text-sm">
        {checklist.map((line) => (
          <li key={line} className="flex items-start gap-2">
            <span
              aria-hidden
              className="mt-1 block h-1 w-1 shrink-0 bg-brand-pink"
            />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
