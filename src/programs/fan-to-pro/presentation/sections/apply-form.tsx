"use client";

import { useActionState, useState } from "react";
import { submitApplication } from "@/src/programs/fan-to-pro/application/submit-application";
import {
  Step1Schema,
  VISA_OPTIONS,
  type ApplicationActionState,
} from "@/src/programs/fan-to-pro/domain/application";
import { PRICING, formatKRW } from "@/src/programs/fan-to-pro/domain/pricing";
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
    <Section id="apply" tone="bg">
      <Container>
        <Eyebrow n="14">Apply</Eyebrow>

        <h2
          className="mb-12 max-w-4xl font-black text-display-lg"
          style={{ lineHeight: 1.05, letterSpacing: "-0.04em" }}
        >
          지금
          <br />
          <span className="text-brand-pink">시작.</span>
        </h2>

        <p className="mb-12 max-w-2xl text-base leading-relaxed text-fg-muted sm:text-lg">
          입금 순서대로 자리가 확정됩니다. 폼 제출 후 24시간 이내 입금 안내 메일.
        </p>

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

              <label className="mt-2 flex items-start gap-3 border border-border bg-bg p-4 text-fg-muted text-sm">
                <input
                  type="checkbox"
                  name="consent"
                  required
                  className="mt-1 h-4 w-4 accent-brand-pink"
                />
                <span>
                  개인정보 수집·이용에 동의합니다. 신청 처리 및 입금 안내 목적
                  외 사용되지 않으며, 신청 처리 종료 후 1년 내 파기됩니다.
                </span>
              </label>
              {fieldErrors.consent?.[0] && (
                <p className="text-brand-pink text-xs">
                  {fieldErrors.consent[0]}
                </p>
              )}

              {fieldErrors._form?.[0] && (
                <p className="border border-brand-pink bg-brand-pink/10 px-4 py-3 text-brand-pink text-sm">
                  {fieldErrors._form[0]}
                </p>
              )}

              <div className="mt-2 grid grid-cols-1 gap-3 border-border border-t pt-6 text-sm sm:grid-cols-[1fr_auto] sm:items-center">
                <p className="text-fg-muted">
                  결제 금액{" "}
                  <span className="font-black text-fg">
                    {formatKRW(PRICING.discounted)}
                  </span>{" "}
                  / 예금주{" "}
                  <span className="font-black text-fg">
                    {PRICING.bank.accountHolder}
                  </span>
                </p>
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
