"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Modal } from "./modal";
import { cn } from "@/src/programs/fan-to-pro/presentation/components/cn";
import {
  BROADCAST_LIMITS,
  buildBroadcastMailtoUrl,
} from "@/src/programs/fan-to-pro/messages/templates";
import type { ApplicantRow } from "../types";

const fieldClass =
  "w-full border border-border bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-brand-pink";

const labelClass = "block text-[10px] font-black uppercase text-fg-subtle";

const labelStyle = { letterSpacing: "0.2em" } as const;

const primaryBtn =
  "inline-flex items-center justify-center gap-2 bg-brand-pink px-4 py-2.5 text-xs font-black uppercase text-fg hover:bg-brand-purple disabled:opacity-60";

const ghostBtn =
  "inline-flex items-center justify-center border border-border bg-bg px-4 py-2.5 text-xs font-black uppercase text-fg-muted hover:text-fg disabled:opacity-40";

const btnStyle = { letterSpacing: "0.15em" } as const;

const SUBJECT_MAX = 200;
const BODY_MAX = 5000;

/**
 * B0018 Wave 1 T4 - 다중 발송 모달.
 *
 * 채널 = 이메일 BCC only (노아 결정 6). 1기는 카톡 알림톡 미사용.
 *
 * 플로우:
 *   1) 운영자가 신청자 리스트에서 체크박스로 선택 → [다중 발송] 클릭
 *   2) 모달이 BCC 수신자 미리보기 + 제목/본문 입력
 *   3) [메일 앱 열기] 클릭 시
 *      - window.location.href = mailto: 로 OS 기본 메일 앱 실행
 *      - 동시에 server action logBroadcastSend 호출 → messages_log INSERT
 *      - toast: "N명에게 발송 준비 완료"
 *
 * UI 가 보호하는 것:
 *   - TO / CC 선택지 부재 (수강생 이메일 상호 노출 방지)
 *   - 50명 초과 시 청크 발송 권장 경고 (mailto URI ~2KB OS 한계)
 *   - 100명 초과 시 [메일 앱 열기] disable
 *   - 제목/본문 글자 카운트 + max 강제
 */
export function BroadcastDialog({
  open,
  busy,
  applicants,
  onClose,
  onSend,
}: {
  open: boolean;
  busy: boolean;
  applicants: ApplicantRow[];
  onClose: () => void;
  onSend: (input: {
    applicantIds: string[];
    subject: string;
    body: string;
    mailtoUrl: string;
  }) => void;
}) {
  const [subject, setSubject] = useState<string>("");
  const [body, setBody] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // 활성 (redacted_at IS NULL + 이메일 보유) 만 대상.
  const eligible = useMemo(
    () => applicants.filter((a) => !a.redactedAt && a.email.includes("@")),
    [applicants],
  );
  const skipped = applicants.length - eligible.length;

  const recipientEmails = useMemo(
    () => Array.from(new Set(eligible.map((a) => a.email))),
    [eligible],
  );

  const overSafe = recipientEmails.length > BROADCAST_LIMITS.safe;
  const overMax = recipientEmails.length > BROADCAST_LIMITS.warn;

  const previewMailtoUrl = useMemo(
    () =>
      recipientEmails.length === 0
        ? ""
        : buildBroadcastMailtoUrl(recipientEmails, subject, body),
    [recipientEmails, subject, body],
  );
  const mailtoLength = previewMailtoUrl.length;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (recipientEmails.length === 0) {
      setError("발송 가능한 신청자가 없어요.");
      return;
    }
    const trimmedSubject = subject.replace(/[\r\n]+/g, " ").trim();
    const normalizedBody = body.replace(/\r\n/g, "\n");
    if (trimmedSubject.length === 0) {
      setError("제목을 입력해 주세요.");
      return;
    }
    if (trimmedSubject.length > SUBJECT_MAX) {
      setError(`제목은 최대 ${SUBJECT_MAX}자까지 입력 가능해요.`);
      return;
    }
    if (normalizedBody.trim().length === 0) {
      setError("본문을 입력해 주세요.");
      return;
    }
    if (normalizedBody.length > BODY_MAX) {
      setError(`본문은 최대 ${BODY_MAX}자까지 입력 가능해요.`);
      return;
    }
    if (overMax) {
      setError(
        `${BROADCAST_LIMITS.warn}명 초과 발송은 OS 메일 앱이 거부할 수 있어요. 청크로 나눠 발송해 주세요.`,
      );
      return;
    }
    setError(null);
    const mailtoUrl = buildBroadcastMailtoUrl(
      recipientEmails,
      trimmedSubject,
      normalizedBody,
    );
    onSend({
      applicantIds: eligible.map((a) => a.id),
      subject: trimmedSubject,
      body: normalizedBody,
      mailtoUrl,
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="다중 발송 (이메일 BCC)" size="lg" busy={busy}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* 수신자 미리보기 */}
        <section className="border border-border bg-bg/40 p-3 text-xs">
          <div className="mb-1.5 flex flex-wrap items-baseline gap-2">
            <span className={labelClass} style={labelStyle}>
              수신자 BCC
            </span>
            <span className="text-fg">
              <strong>{recipientEmails.length}명</strong>
              {skipped > 0 ? (
                <span className="ml-2 text-amber-300">
                  (제외 {skipped}명: 파기된 PII 또는 이메일 미보유)
                </span>
              ) : null}
            </span>
          </div>
          {recipientEmails.length === 0 ? (
            <p className="text-fg-muted">
              발송 가능한 신청자가 없어요. 모달을 닫고 다시 선택해 주세요.
            </p>
          ) : (
            <p
              className="break-all text-fg-muted"
              aria-label="BCC 수신자 미리보기"
            >
              {recipientEmails.slice(0, 5).join(", ")}
              {recipientEmails.length > 5
                ? ` 외 ${recipientEmails.length - 5}명`
                : ""}
            </p>
          )}
          {overSafe && !overMax ? (
            <p
              role="alert"
              className="mt-2 border border-amber-500/60 bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-200"
            >
              {BROADCAST_LIMITS.safe}명 초과 발송 → 일부 OS 의 메일 앱에서 mailto
              링크가 잘릴 수 있어요. 30명 이하로 청크 발송 권장.
            </p>
          ) : null}
          {overMax ? (
            <p
              role="alert"
              className="mt-2 border border-brand-pink bg-brand-pink/10 px-2 py-1.5 text-[11px] text-brand-pink"
            >
              {BROADCAST_LIMITS.warn}명 초과는 거의 모든 OS 메일 앱이 거부해요.
              청크 발송으로 나눠 주세요.
            </p>
          ) : null}
          <p className="mt-2 text-[11px] text-fg-subtle">
            모든 발송은 BCC 처리돼요. TO / CC 선택지는 정보통신망법 §50 정보 노출
            방지 위해 차단했어요.
          </p>
        </section>

        {/* 제목 */}
        <label className="flex flex-col gap-1.5">
          <span className={labelClass} style={labelStyle}>
            제목
          </span>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value.slice(0, SUBJECT_MAX))}
            placeholder="예: [Growth Career] 6/27 첫 강의 안내"
            className={fieldClass}
            disabled={busy || recipientEmails.length === 0}
            maxLength={SUBJECT_MAX}
            autoFocus
          />
          <span className="text-[11px] text-fg-subtle">
            {subject.length} / {SUBJECT_MAX}자
          </span>
        </label>

        {/* 본문 */}
        <label className="flex flex-col gap-1.5">
          <span className={labelClass} style={labelStyle}>
            본문
          </span>
          <textarea
            rows={10}
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, BODY_MAX))}
            placeholder={
              "안녕하세요.\n\nFan to Pro 1기 첫 강의 안내 드려요.\n..."
            }
            className={cn(fieldClass, "resize-y leading-relaxed")}
            disabled={busy || recipientEmails.length === 0}
            maxLength={BODY_MAX}
          />
          <span className="text-[11px] text-fg-subtle">
            {body.length} / {BODY_MAX}자. 운영자가 직접 작성. 1기는 BCC 일괄
            발송이라 {"{name}"} 등 변수 치환 미지원.
          </span>
        </label>

        {/* mailto: 길이 표시 (디버그/정보) */}
        {recipientEmails.length > 0 ? (
          <p className="text-[11px] text-fg-subtle">
            mailto URI 길이: {mailtoLength.toLocaleString()} byte (OS 권장 한계
            약 2,000 byte)
          </p>
        ) : null}

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
            disabled={busy || recipientEmails.length === 0 || overMax}
            className={primaryBtn}
            style={btnStyle}
          >
            {busy
              ? "처리 중..."
              : `메일 앱 열기 (${recipientEmails.length}명)`}
          </button>
        </div>
      </form>
    </Modal>
  );
}
