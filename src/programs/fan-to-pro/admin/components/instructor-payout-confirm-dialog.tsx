"use client";

import { Modal } from "./modal";

/**
 * 정산 기록 confirm dialog. recordInstructorPayouts 호출 전 운영자 확인.
 */

const primaryBtn =
  "inline-flex items-center justify-center gap-2 bg-brand-pink px-4 py-2.5 text-xs font-black uppercase text-fg hover:bg-brand-purple disabled:opacity-60";
const ghostBtn =
  "inline-flex items-center justify-center border border-border bg-bg px-4 py-2.5 text-xs font-black uppercase text-fg hover:text-fg disabled:opacity-40";
const btnStyle = { letterSpacing: "0.15em" } as const;

export function InstructorPayoutConfirmDialog({
  open,
  busy,
  cohortLabel,
  enrolledCount,
  instructorCount,
  onClose,
  onConfirm,
}: {
  open: boolean;
  busy: boolean;
  cohortLabel: string;
  enrolledCount: number;
  instructorCount: number;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const belowMinimum = enrolledCount < 20;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${cohortLabel} 정산 기록`}
      busy={busy}
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-fg">
          <span className="font-bold">{cohortLabel}</span> 강사 {instructorCount}
          명에 대해 정산 row 를 기록합니다.
        </p>

        <dl className="grid grid-cols-2 gap-2 border border-border bg-bg p-3 text-xs">
          <dt className="text-fg/80">현재 정원 (enrolled)</dt>
          <dd className="text-right text-fg font-bold">{enrolledCount}명</dd>
          <dt className="text-fg/80">대상 강사</dt>
          <dd className="text-right text-fg font-bold">{instructorCount}명</dd>
        </dl>

        {belowMinimum ? (
          <p
            role="alert"
            className="border border-red-500/60 bg-red-500/10 px-3 py-2 text-xs text-red-200"
          >
            정원이 20명 미만이에요. 계약서 §6 에 따라 강사료는 미지급으로 skip
            됩니다. 진행은 가능하지만 모두 below_minimum 으로 표시돼요.
          </p>
        ) : (
          <p className="text-xs text-fg/80">
            정원 {enrolledCount}명 기준으로 강사별 계산이 수행됩니다 (20~29명
            250만 / 30명 만석 300만). 이미 정산 기록된 강사는 자동 skip 됩니다.
          </p>
        )}

        <p className="text-[11px] text-fg/60">
          기록 = paid_at 비어있는 row 생성. 송금은 별도 [송금 완료] 버튼.
        </p>

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
            type="button"
            onClick={onConfirm}
            className={primaryBtn}
            style={btnStyle}
            disabled={busy}
          >
            정산 기록
          </button>
        </div>
      </div>
    </Modal>
  );
}
