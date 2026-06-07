"use client";

/**
 * PII 일괄 anonymize 2단계 confirm dialog - B0018 Wave 1 T3.
 *
 * 1단계 (warning):
 *   - 대상 카운트 + 영향받는 컬럼 표시.
 *   - "되돌릴 수 없음" 명시.
 *   - [돌아가기] / [계속]
 *
 * 2단계 (typed confirm):
 *   - 사용자가 "ANONYMIZE" 정확히 입력해야 [실행] 활성화.
 *   - Typo prevention (실수로 클릭만으로 실행 X).
 *
 * 종료 시점 비고:
 *   - 6개월 경과 row 가 0 건이면 1단계에서 [실행 안 함] 안내 + [닫기] 만 표시.
 *   - server action 호출은 부모 컴포넌트가 책임 (onConfirm).
 */

import { useEffect, useState, type FormEvent } from "react";
import { Modal } from "./modal";
import { cn } from "@/src/programs/fan-to-pro/presentation/components/cn";

const CONFIRM_WORD = "ANONYMIZE";

const fieldClass =
  "w-full border border-border bg-bg px-3 py-2 text-sm font-bold tracking-widest text-fg outline-none focus:border-brand-pink uppercase disabled:opacity-50";

const primaryBtn =
  "inline-flex items-center justify-center gap-2 bg-red-500 px-4 py-2.5 text-xs font-black uppercase text-white hover:bg-red-600 disabled:opacity-40";

const ghostBtn =
  "inline-flex items-center justify-center border border-border bg-bg px-4 py-2.5 text-xs font-black uppercase text-fg-muted hover:text-fg disabled:opacity-40";

const btnStyle = { letterSpacing: "0.15em" } as const;

type Step = "warning" | "confirm";

export function PiiAnonymizeDialog({
  open,
  busy,
  eligibleCount,
  onClose,
  onConfirm,
}: {
  open: boolean;
  busy: boolean;
  eligibleCount: number;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [step, setStep] = useState<Step>("warning");
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);

  // open 변경 시 상태 초기화.
  useEffect(() => {
    if (open) {
      setStep("warning");
      setConfirmText("");
      setError(null);
    }
  }, [open]);

  const hasTargets = eligibleCount > 0;

  const handleConfirmSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (confirmText.trim().toUpperCase() !== CONFIRM_WORD) {
      setError(`정확히 "${CONFIRM_WORD}" 를 입력해 주세요.`);
      return;
    }
    setError(null);
    onConfirm();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="종강 6개월 경과 PII 파기"
      busy={busy}
    >
      {step === "warning" ? (
        <div className="flex flex-col gap-4">
          <div className="border border-red-500/60 bg-red-500/10 p-3 text-xs leading-relaxed text-red-200">
            <p className="text-sm font-black text-red-200">
              경고 - 되돌릴 수 없는 작업이에요.
            </p>
            <p className="mt-1">
              지금 6개월 경과 신청자{" "}
              <strong className="text-fg">{eligibleCount}명</strong> 의
              개인정보를 영구 anonymize 합니다.
            </p>
          </div>

          <div className="border border-border bg-bg/40 p-3 text-xs">
            <p
              className="text-[10px] font-black uppercase text-fg-subtle"
              style={{ letterSpacing: "0.2em" }}
            >
              영향받는 필드
            </p>
            <ul className="mt-2 grid grid-cols-2 gap-1 text-fg-muted">
              <li>이름 → [redacted]</li>
              <li>이메일 → [redacted]</li>
              <li>전화번호 → [redacted]</li>
              <li>주소 → [redacted]</li>
              <li>생년월일 → NULL</li>
              <li>redacted_at → 지금</li>
            </ul>
            <p className="mt-2 text-fg-subtle">
              status / 입금 / 환불 / 발급 이력 등 거래 기록은 유지돼요. PIPA §21
              기준 PII 만 제거.
            </p>
          </div>

          {!hasTargets ? (
            <p className="border border-amber-500/60 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              현재 6개월 경과 + 미파기 신청자가 없어요. 실행할 필요 없습니다.
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
              type="button"
              onClick={() => setStep("confirm")}
              disabled={busy || !hasTargets}
              className={primaryBtn}
              style={btnStyle}
            >
              계속
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleConfirmSubmit} className="flex flex-col gap-4">
          <p className="text-xs text-fg-muted">
            확인을 위해 아래 입력란에{" "}
            <strong className="text-fg">{CONFIRM_WORD}</strong> 를 정확히
            입력해 주세요.
          </p>

          <label className="flex flex-col gap-1.5">
            <span
              className="text-[10px] font-black uppercase text-fg-subtle"
              style={{ letterSpacing: "0.2em" }}
            >
              확인 문구
            </span>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className={fieldClass}
              placeholder={CONFIRM_WORD}
              disabled={busy}
              autoFocus
              autoComplete="off"
              spellCheck={false}
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
              onClick={() => setStep("warning")}
              disabled={busy}
              className={ghostBtn}
              style={btnStyle}
            >
              돌아가기
            </button>
            <button
              type="submit"
              disabled={
                busy || confirmText.trim().toUpperCase() !== CONFIRM_WORD
              }
              className={cn(primaryBtn)}
              style={btnStyle}
            >
              {busy ? "처리 중..." : `${eligibleCount}명 영구 파기`}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
