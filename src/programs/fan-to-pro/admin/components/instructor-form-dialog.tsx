"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Modal } from "./modal";
import { cn } from "@/src/shared/ui/cn";
import type {
  InstructorDay,
  InstructorRow,
  InstructorTaxMode,
} from "@/src/programs/fan-to-pro/domain/instructor";

/**
 * 강사 신규 추가 + 편집 dialog.
 *
 * - row=null 이면 신규 모드, row=값 이면 편집 모드 (id 유지).
 * - taxMode 라디오에 따라 사업자번호(tax_invoice) / 주민번호(withholding) 활성 분기.
 * - bankAccount / residentNo 는 secret 한 PII 라 input type=text 유지 + autocomplete=off.
 * - bonusThirtyKrw 는 비워두면 null → DB 미저장 (UI 표시 0).
 */

const fieldClass =
  "w-full border border-border bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-brand-pink disabled:opacity-40";

const labelClass = "block text-[10px] font-black uppercase text-fg/80";
const labelStyle = { letterSpacing: "0.2em" } as const;

const primaryBtn =
  "inline-flex min-h-[40px] items-center justify-center gap-2 bg-brand-pink px-4 py-2.5 text-xs font-black uppercase text-fg hover:bg-brand-purple disabled:opacity-60";
const ghostBtn =
  "inline-flex min-h-[40px] items-center justify-center border border-border bg-bg px-4 py-2.5 text-xs font-black uppercase text-fg hover:text-fg disabled:opacity-40";
const btnStyle = { letterSpacing: "0.15em" } as const;

export type InstructorFormPayload = {
  name: string;
  day: InstructorDay;
  phone?: string;
  email?: string;
  bankName?: string;
  bankAccount?: string;
  bankHolder?: string;
  taxMode: InstructorTaxMode;
  businessNo?: string;
  residentNo?: string;
  baseFeeKrw: number;
  bonusThirtyKrw?: number | null;
  notes?: string;
};

export function InstructorFormDialog({
  open,
  busy,
  row,
  onClose,
  onSubmit,
}: {
  open: boolean;
  busy: boolean;
  row: InstructorRow | null;
  onClose: () => void;
  onSubmit: (input: InstructorFormPayload) => void;
}) {
  const isEdit = row !== null;

  const [name, setName] = useState("");
  const [day, setDay] = useState<InstructorDay>("saturday");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankHolder, setBankHolder] = useState("");
  const [taxMode, setTaxMode] = useState<InstructorTaxMode>("withholding_3_3");
  const [businessNo, setBusinessNo] = useState("");
  const [residentNo, setResidentNo] = useState("");
  const [baseFeeKrw, setBaseFeeKrw] = useState("2500000");
  const [bonusThirtyKrw, setBonusThirtyKrw] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  // open 또는 row 변경 시 초기값 동기화.
  useEffect(() => {
    if (!open) return;
    if (row) {
      setName(row.name);
      setDay(row.day);
      setPhone(row.phone ?? "");
      setEmail(row.email ?? "");
      setBankName(row.bankName ?? "");
      setBankAccount(row.bankAccount ?? "");
      setBankHolder(row.bankHolder ?? "");
      setTaxMode(row.taxMode);
      setBusinessNo(row.businessNo ?? "");
      setResidentNo(row.residentNo ?? "");
      setBaseFeeKrw(String(row.baseFeeKrw));
      setBonusThirtyKrw(
        row.bonusThirtyKrw === null ? "" : String(row.bonusThirtyKrw),
      );
      setNotes(row.notes ?? "");
    } else {
      setName("");
      setDay("saturday");
      setPhone("");
      setEmail("");
      setBankName("");
      setBankAccount("");
      setBankHolder("");
      setTaxMode("withholding_3_3");
      setBusinessNo("");
      setResidentNo("");
      setBaseFeeKrw("2500000");
      setBonusThirtyKrw("");
      setNotes("");
    }
    setError(null);
  }, [open, row]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      setError("이름을 입력해 주세요.");
      return;
    }
    const baseFee = Number(baseFeeKrw.replace(/[\s,]/g, ""));
    if (!Number.isInteger(baseFee) || baseFee < 0) {
      setError("기본 강사료는 0 이상 정수여야 해요.");
      return;
    }
    let bonus: number | null | undefined = undefined;
    const trimmedBonus = bonusThirtyKrw.trim();
    if (trimmedBonus.length > 0) {
      const parsed = Number(trimmedBonus.replace(/[\s,]/g, ""));
      if (!Number.isInteger(parsed) || parsed < 0) {
        setError("30명 보너스는 0 이상 정수여야 해요.");
        return;
      }
      bonus = parsed;
    } else if (isEdit) {
      bonus = null; // 편집 시 빈 입력 = 명시적 clear.
    }

    if (taxMode === "withholding_3_3" && residentNo.trim().length > 0) {
      const digits = residentNo.replace(/[^0-9]/g, "");
      if (digits.length !== 13) {
        setError("주민번호는 13자리 숫자여야 해요.");
        return;
      }
    }

    setError(null);
    onSubmit({
      name: trimmedName,
      day,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      bankName: bankName.trim() || undefined,
      bankAccount: bankAccount.trim() || undefined,
      bankHolder: bankHolder.trim() || undefined,
      taxMode,
      businessNo:
        taxMode === "tax_invoice" ? businessNo.trim() || undefined : undefined,
      residentNo:
        taxMode === "withholding_3_3"
          ? residentNo.trim() || undefined
          : undefined,
      baseFeeKrw: baseFee,
      bonusThirtyKrw: bonus,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `강사 편집${row?.name ? ` / ${row.name}` : ""}` : "강사 추가"}
      size="lg"
      busy={busy}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className={labelClass} style={labelStyle}>
              이름 *
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={fieldClass}
              disabled={busy}
              autoFocus
              required
            />
          </label>

          <fieldset className="flex flex-col gap-1.5">
            <legend className={labelClass} style={labelStyle}>
              요일 *
            </legend>
            <div className="flex gap-2" role="radiogroup" aria-label="강의 요일">
              {(
                [
                  { value: "saturday", label: "토" },
                  { value: "sunday", label: "일" },
                ] as const
              ).map((opt) => {
                const active = day === opt.value;
                return (
                  <label
                    key={opt.value}
                    className={cn(
                      "flex flex-1 cursor-pointer items-center justify-center border px-3 py-2 text-xs font-black uppercase",
                      active
                        ? opt.value === "saturday"
                          ? "border-brand-pink bg-brand-pink/15 text-brand-pink"
                          : "border-violet-400/60 bg-violet-500/15 text-violet-200"
                        : "border-border bg-bg text-fg/80 hover:text-fg",
                    )}
                    style={{ letterSpacing: "0.18em" }}
                  >
                    <input
                      type="radio"
                      name="day"
                      value={opt.value}
                      checked={active}
                      onChange={() => setDay(opt.value)}
                      className="sr-only"
                      disabled={busy}
                    />
                    {opt.label}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <label className="flex flex-col gap-1.5">
            <span className={labelClass} style={labelStyle}>
              연락처
            </span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={fieldClass}
              disabled={busy}
              autoComplete="off"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={labelClass} style={labelStyle}>
              이메일
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={fieldClass}
              disabled={busy}
              autoComplete="off"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={labelClass} style={labelStyle}>
              은행명
            </span>
            <input
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className={fieldClass}
              disabled={busy}
              autoComplete="off"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={labelClass} style={labelStyle}>
              계좌번호
            </span>
            <input
              type="text"
              value={bankAccount}
              onChange={(e) => setBankAccount(e.target.value)}
              className={fieldClass}
              disabled={busy}
              autoComplete="off"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={labelClass} style={labelStyle}>
              예금주
            </span>
            <input
              type="text"
              value={bankHolder}
              onChange={(e) => setBankHolder(e.target.value)}
              className={fieldClass}
              disabled={busy}
              autoComplete="off"
            />
          </label>

          <fieldset className="flex flex-col gap-1.5">
            <legend className={labelClass} style={labelStyle}>
              정산 방식 *
            </legend>
            <div
              className="flex gap-2"
              role="radiogroup"
              aria-label="세금 처리 방식"
            >
              {(
                [
                  { value: "withholding_3_3", label: "원천징수 3.3%" },
                  { value: "tax_invoice", label: "세금계산서 +10%" },
                ] as const
              ).map((opt) => {
                const active = taxMode === opt.value;
                return (
                  <label
                    key={opt.value}
                    className={cn(
                      "flex flex-1 cursor-pointer items-center justify-center border px-3 py-2 text-[11px] font-black uppercase",
                      active
                        ? "border-brand-pink bg-brand-pink/15 text-brand-pink"
                        : "border-border bg-bg text-fg/80 hover:text-fg",
                    )}
                    style={{ letterSpacing: "0.15em" }}
                  >
                    <input
                      type="radio"
                      name="taxMode"
                      value={opt.value}
                      checked={active}
                      onChange={() => setTaxMode(opt.value)}
                      className="sr-only"
                      disabled={busy}
                    />
                    {opt.label}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <label className="flex flex-col gap-1.5">
            <span className={labelClass} style={labelStyle}>
              사업자번호
              <span className="ml-1 text-fg/60 normal-case">
                (세금계산서일 때)
              </span>
            </span>
            <input
              type="text"
              value={businessNo}
              onChange={(e) => setBusinessNo(e.target.value)}
              className={fieldClass}
              disabled={busy || taxMode !== "tax_invoice"}
              placeholder="000-00-00000"
              autoComplete="off"
            />
          </label>

          <label className="flex flex-col gap-1.5 sm:col-span-1">
            <span className={labelClass} style={labelStyle}>
              주민번호
              <span className="ml-1 text-fg/60 normal-case">
                (원천징수일 때)
              </span>
            </span>
            <input
              type="text"
              value={residentNo}
              onChange={(e) => setResidentNo(e.target.value)}
              className={fieldClass}
              disabled={busy || taxMode !== "withholding_3_3"}
              placeholder="13자리 숫자"
              autoComplete="off"
              inputMode="numeric"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={labelClass} style={labelStyle}>
              기본 강사료 (원) *
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={baseFeeKrw}
              onChange={(e) => setBaseFeeKrw(e.target.value)}
              className={fieldClass}
              disabled={busy}
              required
            />
            <span className="text-[11px] text-fg/60">
              20명 이상 기본 250만. 30명 만석은 보너스로.
            </span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={labelClass} style={labelStyle}>
              30명 보너스 (원)
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={bonusThirtyKrw}
              onChange={(e) => setBonusThirtyKrw(e.target.value)}
              className={fieldClass}
              disabled={busy}
              placeholder="비우면 자동 (300만)"
            />
            <span className="text-[11px] text-fg/60">
              비우면 정책 자동 적용 (계약서 §4).
            </span>
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className={labelClass} style={labelStyle}>
            메모
          </span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={cn(fieldClass, "min-h-[80px] resize-y")}
            disabled={busy}
            maxLength={2000}
            placeholder="강사료 협의 사항 / 계약서 특이사항"
          />
        </label>

        {error ? (
          <p
            role="alert"
            className="border border-brand-pink bg-brand-pink/10 px-3 py-2 text-xs text-brand-pink"
          >
            {error}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className={ghostBtn}
            style={btnStyle}
            disabled={busy}
          >
            취소
          </button>
          <button
            type="submit"
            className={primaryBtn}
            style={btnStyle}
            disabled={busy}
          >
            {isEdit ? "저장" : "강사 추가"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
