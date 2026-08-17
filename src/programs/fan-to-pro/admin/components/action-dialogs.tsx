"use client";

import { useState, type FormEvent } from "react";
import { Modal } from "./modal";
import { cn } from "@/src/shared/ui/cn";
import type { ApplicantRow } from "../types";
import type { BatchEnrollResult } from "@/src/programs/fan-to-pro/domain/application";

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
/**
 * 강좌 확정 일괄 처리 - per-course 정원 모델 (노아 확정 model A).
 *   과정별 (A&R / 음향) 각각 최소 10명 충족 시 그 과정만 개강.
 *   제출 전: 현재 paid 인원 안내. 제출 후: result 로 과정별 개강 여부 +
 *   enrolled/cancelled 카운트 + 부분환불 대상 목록 표시.
 */
export function EnrollBatchDialog({
  open,
  busy,
  paidCount,
  result,
  onClose,
  onSubmit,
}: {
  open: boolean;
  busy: boolean;
  paidCount: number;
  result: Extract<BatchEnrollResult, { status: "ok" }> | null;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!confirmed) {
      setError("확인 체크박스에 체크해 주세요.");
      return;
    }
    setError(null);
    onSubmit();
  };

  // slug → 표시 이름. courseTitles(과정 title_ko) 우선, 없으면 slug 자체.
  const courseLabel = (slug: string) => result?.courseTitles?.[slug] ?? slug;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="강좌 확정 일괄 처리"
      busy={busy}
    >
      {result ? (
        // 처리 결과 화면.
        <div className="flex flex-col gap-4">
          <div className="border border-border bg-bg p-3 text-xs leading-relaxed text-fg">
            <p className="mb-2 font-black uppercase" style={btnStyle}>
              과정별 개강 판정
            </p>
            <ul className="space-y-1">
              {Object.keys(result.courseCounts).length === 0 ? (
                <li className="text-fg/80">판정 대상 과정 없음</li>
              ) : (
                Object.entries(result.courseCounts).map(([slug, count]) => (
                  <li key={slug}>
                    {courseLabel(slug)}: <strong>{count}명</strong>{" "}
                    {result.runs[slug] ? "→ 개강" : "→ 미달 (취소)"}
                  </li>
                ))
              )}
            </ul>
            <p className="mt-3">
              enrolled 전환: <strong>{result.enrolledCount}건</strong>
              <br />
              cancelled 전환: <strong>{result.cancelledCount}건</strong>
            </p>
          </div>

          {result.partialRefundDue.length > 0 ? (
            <div className="border border-brand-pink bg-brand-pink/10 p-3 text-xs leading-relaxed text-fg">
              <p className="mb-2 font-black uppercase text-brand-pink" style={btnStyle}>
                부분환불 대상 ({result.partialRefundDue.length}명)
              </p>
              <p className="mb-2 text-fg/80">
                올인원 신청자 중 일부 과정만 개강. 안 열린 과정분을 운영자가 직접
                환불 처리해 주세요.
              </p>
              <ul className="space-y-1 font-mono text-[11px]">
                {result.partialRefundDue.map((r) => (
                  <li key={r.id}>
                    {r.id.slice(0, 8)} /{" "}
                    {r.droppedCourses.map(courseLabel).join(", ")} 환불 필요
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className={primaryBtn}
              style={btnStyle}
            >
              닫기
            </button>
          </div>
        </div>
      ) : (
        // 제출 전 확인 화면.
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="border border-border bg-bg p-3 text-xs leading-relaxed text-fg">
            <p>
              현재 status=paid 인원: <strong>{paidCount}명</strong>
            </p>
            <p className="mt-2 text-fg">
              과정별 최소 정원 충족 시 그 과정만 개강해요. 개강 과정 신청자는
              enrolled, 미달 과정만 신청한 분은 cancelled (환불 대상) 로 전환돼요.
              올인원 신청자 중 일부 과정만 열리면 열린 과정만 등록되고 나머지는
              부분환불 목록으로 안내돼요.
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
            <span>일괄 처리는 되돌릴 수 없어요. 진행할게요.</span>
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
              {busy ? "처리 중..." : "일괄 확정"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
