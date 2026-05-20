"use client";

import { useActionState, useState } from "react";
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
  SCHEDULE,
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

const EMPTY_STEP1: Step1Data = { name: "", email: "", phone: "" };

export function ApplyForm() {
  const [step, setStep] = useState<1 | 2>(1);
  const [step1, setStep1] = useState<Step1Data>(EMPTY_STEP1);
  const [step1Errors, setStep1Errors] = useState<
    Partial<Record<keyof Step1Data, string>>
  >({});

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
      setStep1Errors({
        name: flat.name?.[0],
        email: flat.email?.[0],
        phone: flat.phone?.[0],
      });
      return;
    }
    setStep1Errors({});
    setStep1(parsed.data);
    setStep(2);
  };

  if (state.status === "ok" || state.status === "ok_local") {
    return (
      <Section id="apply" tone="bg">
        <Container>
          <Eyebrow n="14">Apply</Eyebrow>
          <SuccessBlock id={state.id} email={step1.email} name={step1.name} />
        </Container>
      </Section>
    );
  }

  const fieldErrors =
    state.status === "error" ? state.errors : ({} as Record<string, string[]>);

  return (
    <Section id="apply" tone="surface">
      <Container>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Eyebrow n="14">Apply</Eyebrow>
          <Chip variant="accent" size="md">
            선착순 {ENROLLMENT_CAP.totalSeats}석 · 마감 {SCHEDULE.enrollmentCutoffLabel}
          </Chip>
        </div>

        <h2
          className="mt-6 mb-4 font-black text-fg text-4xl sm:text-5xl"
          style={{ letterSpacing: "-0.04em", lineHeight: 1.1 }}
        >
          신청 · 결제
        </h2>

        <p className="mb-12 max-w-2xl text-base leading-relaxed text-fg-muted sm:text-lg">
          <span className="font-black text-fg">{formatKRW(PRICING.discounted)}</span>{" "}
          · 토 · 일 각 2시간 × 4주 · 입금 선착순으로 자리가 확정됩니다.
          폼 제출 후 24시간 이내 입금 안내 메일이 발송됩니다.
        </p>

        {/* Summary Grid — 4칸: 첫 강의 / 장소 / 기간 / 결제 */}
        <div className="mx-auto mb-px grid max-w-3xl grid-cols-1 gap-px border border-fg/20 bg-fg/20 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCell
            label="첫 강의 시작"
            value={SCHEDULE.firstSessionLabel}
            sub={SCHEDULE.durationLabel}
          />
          <SummaryCell
            label="강의 장소"
            value={SCHEDULE.locationLabel}
            sub="신청 완료자에게 개별 공지"
          />
          <SummaryCell
            label="모집 마감"
            value={SCHEDULE.enrollmentCutoffLabel}
            sub={`이때까지 ${ENROLLMENT_CAP.minToProceed}명 미만 시 전액 환불`}
            accent
          />
          <SummaryCell
            label="결제 금액"
            value={formatKRW(PRICING.discounted)}
            sub="토스뱅크 계좌이체 (일시납)"
          />
        </div>

        {/* Trust Strip — 4칸: 수료증·참여확인서·환불·문의 */}
        <div className="mx-auto mb-12 grid max-w-3xl grid-cols-2 gap-px border border-fg/20 bg-fg/20 lg:grid-cols-4">
          <TrustCell label="수료증 발급" value={OPERATOR.legalName} />
          <TrustCell label="공연 참여 확인서" value="유니온 픽처스" />
          <TrustCell label="환불" value="결제 후 7일 이내 100%" />
          <TrustCell label="문의" value="신청 후 메일 안내" />
        </div>

        <div className="mx-auto max-w-3xl border border-border bg-surface p-6 sm:p-10">
          <StepIndicator step={step} />

          {step === 1 ? (
            <form
              onSubmit={handleStep1Submit}
              className="grid grid-cols-1 gap-5"
              noValidate
            >
              <Field
                label="이름"
                name="name"
                placeholder="홍길동 / John Doe"
                defaultValue={step1.name}
                error={step1Errors.name}
                autoComplete="name"
                required
              />
              <Field
                label="이메일"
                name="email"
                type="email"
                placeholder="you@example.com"
                defaultValue={step1.email}
                error={step1Errors.email}
                autoComplete="email"
                required
              />
              <Field
                label="연락처"
                name="phone"
                type="tel"
                placeholder="010-1234-5678"
                defaultValue={step1.phone}
                error={step1Errors.phone}
                autoComplete="tel"
                required
              />

              <button
                type="submit"
                className="mt-4 flex items-center justify-center gap-2 bg-brand-pink py-5 font-black text-fg text-lg uppercase transition-colors hover:bg-brand-purple sm:py-6 sm:text-xl"
                style={{ letterSpacing: "-0.02em" }}
              >
                다음 단계 →
              </button>
            </form>
          ) : (
            <form action={formAction} className="grid grid-cols-1 gap-5" noValidate>
              <input type="hidden" name="name" value={step1.name} />
              <input type="hidden" name="email" value={step1.email} />
              <input type="hidden" name="phone" value={step1.phone} />

              <Field
                label="생년월일"
                name="birthdate"
                type="date"
                error={fieldErrors.birthdate?.[0]}
                autoComplete="bday"
                required
              />
              <Field
                label="재학 / 졸업 대학"
                name="university"
                placeholder="OO대학교 / OO Department"
                error={fieldErrors.university?.[0]}
                required
              />

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="visa"
                  className="text-fg-subtle text-xs font-black uppercase"
                  style={{ letterSpacing: "0.2em" }}
                >
                  비자 상태
                </label>
                <select
                  id="visa"
                  name="visa"
                  required
                  defaultValue=""
                  className="border border-border bg-bg px-4 py-4 font-black text-fg outline-none focus:border-brand-pink"
                >
                  <option value="" disabled>
                    선택해주세요
                  </option>
                  {VISA_OPTIONS.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
                {fieldErrors.visa?.[0] && (
                  <p className="text-brand-pink text-xs">
                    {fieldErrors.visa[0]}
                  </p>
                )}
              </div>

              <Field
                label="현재 거주지 (시/구)"
                name="address"
                placeholder="서울시 마포구"
                error={fieldErrors.address?.[0]}
                autoComplete="address-level2"
                required
              />

              <PaymentNotice />

              <RefundSummary />

              <ConsentRow
                name="consent"
                label="개인정보 수집·이용 동의"
                body={
                  <>
                    입력하신 연락처와 개인정보는{" "}
                    <span className="font-black text-fg">
                      교육 프로그램 안내 및 긴급 연락
                    </span>{" "}
                    목적으로만 사용되며, 수강 처리 종료 후 1년 내 파기됩니다.
                  </>
                }
                error={fieldErrors.consent?.[0]}
              />

              <ConsentRow
                name="consent_attendance"
                label="출석 약속 · 환불 정책 확인"
                body={
                  <>
                    {SCHEDULE.attendanceCommitment}{" "}
                    출석률 90% 미만 시 유니온 픽처스 공연 프로젝트 참여 확인서가
                    발급되지 않으며, 출석 미달은 환불 사유에 해당하지 않습니다.
                  </>
                }
                error={fieldErrors.consent_attendance?.[0]}
              />

              <p className="-mt-2 text-fg-subtle text-xs leading-relaxed">
                {SCHEDULE.contentUseNote}
              </p>

              {fieldErrors._form?.[0] && (
                <p className="border border-brand-pink bg-brand-pink/10 px-4 py-3 text-brand-pink text-sm">
                  {fieldErrors._form[0]}
                </p>
              )}

              <div className="mt-2 flex justify-end border-border border-t pt-6 text-sm">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-fg-subtle text-xs uppercase hover:text-fg"
                  style={{ letterSpacing: "0.2em" }}
                >
                  ← 이전 단계
                </button>
              </div>

              <button
                type="submit"
                disabled={pending}
                className="mt-2 flex items-center justify-center gap-2 bg-brand-pink py-5 font-black text-fg text-lg uppercase transition-colors hover:bg-brand-purple disabled:opacity-50 sm:py-6 sm:text-xl"
                style={{ letterSpacing: "-0.02em" }}
              >
                {pending ? "신청 처리 중…" : "신청 제출 →"}
              </button>
            </form>
          )}
        </div>
      </Container>
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
        className="text-fg-subtle text-[10px] font-black uppercase sm:text-xs"
        style={{ letterSpacing: "0.3em" }}
      >
        {label}
      </span>
      <p
        className={`font-black text-lg leading-tight sm:text-xl ${
          accent ? "text-brand-pink" : "text-fg"
        }`}
        style={{ letterSpacing: "-0.03em" }}
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
        style={{ letterSpacing: "-0.02em" }}
      >
        {value}
      </p>
    </div>
  );
}

function RefundSummary() {
  return (
    <div className="mt-2 border border-border bg-bg p-4 sm:p-5">
      <p
        className="mb-3 text-fg-subtle text-[10px] font-black uppercase sm:text-xs"
        style={{ letterSpacing: "0.3em" }}
      >
        Refund · 환불 정책 요약
      </p>
      <ul className="grid grid-cols-1 gap-1 text-fg-muted text-xs leading-relaxed sm:text-sm">
        {REFUND_POLICY.schedule.map((row) => (
          <li
            key={row.phase}
            className="flex items-start justify-between gap-3 border-border/60 border-b py-1.5 last:border-b-0"
          >
            <span>{row.phase}</span>
            <span className="font-black text-fg">{row.refund}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-fg-subtle text-[11px] leading-relaxed">
        {REFUND_POLICY.legalBasis} 기준 · {ENROLLMENT_CAP.autoRefundNote}
      </p>
    </div>
  );
}

function ConsentRow({
  name,
  label,
  body,
  error,
}: {
  name: string;
  label: string;
  body: React.ReactNode;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-start gap-3 border border-border bg-bg p-4 text-fg-muted text-sm">
        <input
          type="checkbox"
          name={name}
          required
          className="mt-1 h-4 w-4 shrink-0 accent-brand-pink"
        />
        <span className="flex flex-col gap-1.5">
          <span className="flex items-center gap-2">
            <span
              className="inline-block bg-brand-pink px-2 py-0.5 text-fg text-[10px] font-black uppercase"
              style={{ letterSpacing: "0.2em" }}
            >
              필수
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
  return (
    <div className="mt-2 border-2 border-brand-pink bg-brand-pink/5 p-5 sm:p-6">
      <p
        className="mb-4 text-brand-pink text-[10px] font-black uppercase sm:text-xs"
        style={{ letterSpacing: "0.3em" }}
      >
        Payment · 수강신청 완료 기준
      </p>

      <p
        className="mb-5 font-black text-fg text-xl leading-snug sm:text-2xl"
        style={{ letterSpacing: "-0.03em" }}
      >
        아래 계좌로{" "}
        <span className="text-brand-pink">
          {formatKRW(PRICING.discounted)}
        </span>{" "}
        입금이 확인되어야{" "}
        <br className="hidden sm:block" />
        수강 신청이{" "}
        <span className="text-brand-pink">최종 완료</span>됩니다.
      </p>

      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-brand-pink/40 border-t pt-4 text-sm sm:text-base">
        <dt
          className="text-fg-subtle text-xs uppercase"
          style={{ letterSpacing: "0.2em" }}
        >
          은행
        </dt>
        <dd className="font-black text-fg">{PRICING.bank.bankName}</dd>

        <dt
          className="text-fg-subtle text-xs uppercase"
          style={{ letterSpacing: "0.2em" }}
        >
          계좌
        </dt>
        <dd className="font-black text-fg tracking-wider">
          {PRICING.bank.accountNumber}
        </dd>

        <dt
          className="text-fg-subtle text-xs uppercase"
          style={{ letterSpacing: "0.2em" }}
        >
          예금주
        </dt>
        <dd className="font-black text-fg">{PRICING.bank.accountHolder}</dd>

        <dt
          className="text-fg-subtle text-xs uppercase"
          style={{ letterSpacing: "0.2em" }}
        >
          금액
        </dt>
        <dd className="font-black text-brand-pink">
          {formatKRW(PRICING.discounted)}
        </dd>
      </dl>

      <p className="mt-4 border border-brand-pink/40 bg-bg p-3 text-fg text-xs leading-relaxed sm:text-sm">
        <span
          className="mr-2 inline-block bg-brand-pink px-2 py-0.5 align-middle text-fg text-[10px] font-black uppercase"
          style={{ letterSpacing: "0.2em" }}
        >
          필수
        </span>
        입금자명은{" "}
        <span className="font-black text-brand-pink">
          수강 신청서에 적은 본인 이름과 동일하게
        </span>{" "}
        보내주세요. 입금자명이 다르면 입금 확인이 지연되거나 자리 배정이
        보류될 수 있습니다.
      </p>

      <p className="mt-3 text-fg-muted text-xs leading-relaxed sm:text-sm">
        입금 확인 후 카카오톡 오픈채팅 안내가 발송됩니다.
      </p>

      <p className="mt-4 border-brand-pink/20 border-t pt-3 text-fg-subtle text-[11px] leading-relaxed">
        결제 수령 · {OPERATOR.certificateIssuer} · 사업자등록번호{" "}
        {OPERATOR.businessNumber}. {OPERATOR.performanceProjectPartner} ·{" "}
        {OPERATOR.faculty}.
      </p>
    </div>
  );
}

function StepIndicator({ step }: { step: 1 | 2 }) {
  return (
    <div className="mb-8 flex items-center gap-3 text-xs uppercase">
      <span
        className={`flex h-8 w-8 items-center justify-center font-black ${
          step >= 1 ? "bg-brand-pink text-fg" : "bg-border text-fg-subtle"
        }`}
      >
        1
      </span>
      <span
        className="h-px flex-1 bg-border"
        aria-hidden
      />
      <span
        className={`flex h-8 w-8 items-center justify-center font-black ${
          step >= 2 ? "bg-brand-pink text-fg" : "bg-border text-fg-subtle"
        }`}
      >
        2
      </span>
      <span
        className="ml-3 text-fg-subtle"
        style={{ letterSpacing: "0.2em" }}
      >
        Step {step} / 2
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
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  defaultValue?: string;
  error?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={name}
        className="text-fg-subtle text-xs font-black uppercase"
        style={{ letterSpacing: "0.2em" }}
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
        className="border border-border bg-bg px-4 py-4 font-medium text-fg placeholder:text-fg-subtle outline-none focus:border-brand-pink"
      />
      {error && <p className="text-brand-pink text-xs">{error}</p>}
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
  return (
    <div className="mx-auto max-w-2xl border-2 border-brand-pink bg-surface p-8 text-center sm:p-12">
      <p
        className="mb-4 text-brand-pink text-xs font-black uppercase"
        style={{ letterSpacing: "0.3em" }}
      >
        신청 완료
      </p>

      <h3
        className="mb-6 font-black text-fg text-3xl sm:text-5xl"
        style={{ letterSpacing: "-0.04em", lineHeight: 1.05 }}
      >
        {name || "신청자"}님,
        <br />
        <span className="text-brand-pink">한 발 들어왔다.</span>
      </h3>

      <p className="mb-8 text-fg-muted text-base leading-relaxed sm:text-lg">
        24시간 이내{" "}
        <span className="font-black text-fg">{email || "등록 이메일"}</span>{" "}
        로 입금 안내 메일이 발송됩니다.
        <br />
        <span className="text-fg-subtle text-sm">신청 ID: {id}</span>
      </p>

      <ul className="mb-2 grid grid-cols-1 gap-2 text-left text-fg-muted text-sm">
        <li className="flex items-start gap-2">
          <span className="mt-1 block h-1 w-1 shrink-0 bg-brand-pink" />
          예금주 <span className="font-black text-fg">Dropdown</span> · 토스뱅크 1002-4759-1521 로 입금
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-1 block h-1 w-1 shrink-0 bg-brand-pink" />
          입금 확인 → 카카오톡 오픈채팅 자동 입장
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-1 block h-1 w-1 shrink-0 bg-brand-pink" />
          오리엔테이션 일정 별도 안내
        </li>
      </ul>
    </div>
  );
}
