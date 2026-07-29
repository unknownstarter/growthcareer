"use client";

import { useState, type FormEvent } from "react";
import { Modal } from "./modal";
import { cn } from "@/src/shared/ui/cn";
import type { ApplicantRow } from "../types";

const fieldClass =
  "w-full border border-border bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-brand-pink";

const labelClass =
  "block text-[10px] font-black uppercase text-fg/80";

const labelStyle = { letterSpacing: "0.2em" } as const;

const primaryBtn =
  "inline-flex min-h-[40px] items-center justify-center gap-2 bg-brand-pink px-4 py-2.5 text-xs font-black uppercase text-fg hover:bg-brand-purple disabled:opacity-60";

const ghostBtn =
  "inline-flex min-h-[40px] items-center justify-center border border-border bg-bg px-4 py-2.5 text-xs font-black uppercase text-fg hover:text-fg disabled:opacity-40";

const btnStyle = { letterSpacing: "0.15em" } as const;

/** 입금 확인 다이얼로그 - amountKrw + depositorName 입력. */
export function MarkPaidDialog({
  open,
  busy,
  applicant,
  onClose,
  onSubmit,
}: {
  open: boolean;
  busy: boolean;
  applicant: ApplicantRow;
  onClose: () => void;
  onSubmit: (input: { amountKrw: number; depositorName: string }) => void;
}) {
  const [amount, setAmount] = useState<string>("880000");
  const [depositor, setDepositor] = useState<string>(applicant.name);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const numeric = Number(amount.replace(/[\s,]/g, ""));
    if (!Number.isInteger(numeric) || numeric <= 0) {
      setError("금액은 양의 정수여야 해요.");
      return;
    }
    if (depositor.trim().length === 0) {
      setError("입금자명을 입력해 주세요.");
      return;
    }
    setError(null);
    onSubmit({ amountKrw: numeric, depositorName: depositor.trim() });
  };

  return (
    <Modal open={open} onClose={onClose} title="입금 확인 처리" busy={busy}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-xs text-fg">
          {applicant.name} 님 ({applicant.email}) 의 입금을 확인 처리해요.
        </p>

        <label className="flex flex-col gap-1.5">
          <span className={labelClass} style={labelStyle}>
            입금 금액 (원)
          </span>
          <input
            type="text"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={fieldClass}
            disabled={busy}
            autoFocus
          />
          <span className="text-[11px] text-fg/80">
            정가 880,000원. 부분입금/오입금 시 실제 금액으로 수정.
          </span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={labelClass} style={labelStyle}>
            입금자명 (토스뱅크 알림 기준)
          </span>
          <input
            type="text"
            value={depositor}
            onChange={(e) => setDepositor(e.target.value)}
            className={fieldClass}
            disabled={busy}
          />
          <span className="text-[11px] text-fg/80">
            신청자 이름: {applicant.name}. 다르면 그대로 기록.
          </span>
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
            disabled={busy}
            className={ghostBtn}
            style={btnStyle}
          >
            취소
          </button>
          <button
            type="submit"
            disabled={busy}
            className={cn(primaryBtn)}
            style={btnStyle}
          >
            {busy ? "처리 중..." : "입금 확인"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/** 취소 다이얼로그 - 사유 + confirm. */
export function CancelDialog({
  open,
  busy,
  applicant,
  onClose,
  onSubmit,
}: {
  open: boolean;
  busy: boolean;
  applicant: ApplicantRow;
  onClose: () => void;
  onSubmit: (input: { reason: string }) => void;
}) {
  const [reason, setReason] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (reason.trim().length === 0) {
      setError("취소 사유를 입력해 주세요.");
      return;
    }
    if (!confirmed) {
      setError("확인 체크박스에 체크해 주세요.");
      return;
    }
    setError(null);
    onSubmit({ reason: reason.trim() });
  };

  return (
    <Modal open={open} onClose={onClose} title="신청 취소" busy={busy}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-xs text-fg">
          {applicant.name} 님 ({applicant.email}) 의 신청을 취소 처리해요.
          이후 환불 처리는 별도 액션이에요.
        </p>

        <label className="flex flex-col gap-1.5">
          <span className={labelClass} style={labelStyle}>
            취소 사유
          </span>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={cn(fieldClass, "resize-y")}
            placeholder="예: grace_expired / applicant_requested / no_payment"
            disabled={busy}
            autoFocus
          />
        </label>

        <label className="flex items-start gap-2 text-xs text-fg">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            disabled={busy}
            className="mt-0.5 h-4 w-4 accent-brand-pink"
          />
          <span>
            취소 처리는 되돌릴 수 없어요 (status=cancelled 진입). 진행할게요.
          </span>
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
            disabled={busy}
            className={ghostBtn}
            style={btnStyle}
          >
            돌아가기
          </button>
          <button
            type="submit"
            disabled={busy}
            className={primaryBtn}
            style={btnStyle}
          >
            {busy ? "처리 중..." : "취소 처리"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/** 환불 다이얼로그 - 거래 ID 입력. */
export function RefundDialog({
  open,
  busy,
  applicant,
  onClose,
  onSubmit,
}: {
  open: boolean;
  busy: boolean;
  applicant: ApplicantRow;
  onClose: () => void;
  onSubmit: (input: { txnId: string }) => void;
}) {
  const [txnId, setTxnId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (txnId.trim().length === 0) {
      setError("거래 ID 를 입력해 주세요.");
      return;
    }
    setError(null);
    onSubmit({ txnId: txnId.trim() });
  };

  return (
    <Modal open={open} onClose={onClose} title="환불 완료 처리" busy={busy}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-xs text-fg">
          {applicant.name} 님 ({applicant.email}) 의 환불을 완료 처리해요.
        </p>

        <label className="flex flex-col gap-1.5">
          <span className={labelClass} style={labelStyle}>
            거래 ID
          </span>
          <input
            type="text"
            value={txnId}
            onChange={(e) => setTxnId(e.target.value)}
            className={fieldClass}
            placeholder="토스뱅크 거래 ID 또는 자유 입력"
            disabled={busy}
            autoFocus
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
            disabled={busy}
            className={ghostBtn}
            style={btnStyle}
          >
            취소
          </button>
          <button
            type="submit"
            disabled={busy}
            className={primaryBtn}
            style={btnStyle}
          >
            {busy ? "처리 중..." : "환불 완료"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/** 일괄 강좌 확정 다이얼로그. */
export function EnrollBatchDialog({
  open,
  busy,
  paidCount,
  threshold,
  onClose,
  onSubmit,
}: {
  open: boolean;
  busy: boolean;
  paidCount: number;
  threshold: number;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const meets = paidCount >= threshold;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!confirmed) {
      setError("확인 체크박스에 체크해 주세요.");
      return;
    }
    setError(null);
    onSubmit();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="강좌 확정 일괄 처리"
      busy={busy}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="border border-border bg-bg p-3 text-xs leading-relaxed text-fg">
          <p>
            현재 status=paid 인원: <strong>{paidCount}명</strong>
            <br />
            최소 정원: <strong>{threshold}명</strong>
          </p>
          <p className="mt-2 text-fg">
            {meets
              ? "정원 충족 → paid 전원이 enrolled 로 전환돼요."
              : "정원 미달 → paid 전원이 cancelled 로 전환되고 환불 대상이 돼요."}
          </p>
        </div>

        <label className="flex items-start gap-2 text-xs text-fg">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            disabled={busy}
            className="mt-0.5 h-4 w-4 accent-brand-pink"
          />
          <span>
            일괄 처리는 되돌릴 수 없어요. 진행할게요.
          </span>
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
            disabled={busy}
            className={ghostBtn}
            style={btnStyle}
          >
            돌아가기
          </button>
          <button
            type="submit"
            disabled={busy}
            className={primaryBtn}
            style={btnStyle}
          >
            {busy ? "처리 중..." : meets ? "일괄 enrolled" : "일괄 cancelled"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
