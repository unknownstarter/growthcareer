"use client";

import { useEffect, useState } from "react";
import { Modal } from "./modal";
import { listMessagesForApplicant } from "@/src/programs/fan-to-pro/application/admin-actions";
import type { ApplicantRow, MessageLogRow } from "../types";

const labelClass = "block text-[10px] font-black uppercase text-fg/80";

const labelStyle = { letterSpacing: "0.2em" } as const;

const ghostBtn =
  "inline-flex items-center justify-center border border-border bg-bg px-3 py-2 text-xs font-black uppercase text-fg hover:text-fg";

const btnStyle = { letterSpacing: "0.15em" } as const;

const CHANNEL_LABEL: Record<MessageLogRow["channel"], string> = {
  email: "이메일",
  sms: "SMS",
  kakao_channel: "카톡 채널",
  kakao_alimtalk: "카톡 알림톡",
};

const DIRECTION_LABEL: Record<MessageLogRow["direction"], string> = {
  individual: "개별",
  broadcast: "일괄 BCC",
};

/**
 * B0018 Wave 1 T4 - 발송 이력 drawer.
 *
 * 신청자별 messages_log 를 sent_at DESC 로 표시.
 * 행 클릭은 없음 (audit log read-only). 디지털 발송 사실의 사실 기록 only.
 *
 * 로딩 / 빈 상태 / 에러 모두 명시.
 */
export function MessagesHistoryDrawer({
  open,
  applicant,
  onClose,
}: {
  open: boolean;
  applicant: ApplicantRow | null;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<MessageLogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!open || !applicant) {
      setRows([]);
      setError(null);
      return () => {
        cancelled = true;
      };
    }
    setLoading(true);
    setError(null);
    void listMessagesForApplicant({ id: applicant.id }).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (result.status === "ok") {
        setRows(result.rows);
      } else {
        setError(result.error);
        setRows([]);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, applicant]);

  if (!applicant) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${applicant.name} 발송 이력`}
      size="lg"
    >
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-2 border border-border bg-bg/40 p-3 text-[11px] text-fg sm:grid-cols-2">
          <div>
            <span className={labelClass} style={labelStyle}>
              이메일
            </span>
            <div className="text-fg break-all">{applicant.email}</div>
          </div>
          <div>
            <span className={labelClass} style={labelStyle}>
              누적 발송
            </span>
            <div className="text-fg">{rows.length}건</div>
          </div>
        </div>

        {loading ? (
          <p
            role="status"
            className="border border-border bg-bg/30 px-3 py-6 text-center text-xs text-fg"
          >
            발송 이력을 가져오는 중...
          </p>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="border border-brand-pink bg-brand-pink/10 px-3 py-2 text-xs text-brand-pink"
          >
            발송 이력을 불러오지 못했어요: {error}
          </p>
        ) : null}

        {!loading && !error && rows.length === 0 ? (
          <p className="border border-border bg-bg/30 px-3 py-8 text-center text-xs text-fg/80">
            아직 발송 이력이 없어요.
          </p>
        ) : null}

        {!loading && rows.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {rows.map((row) => (
              <li
                key={row.id}
                className="border border-border bg-surface/40 p-3 text-xs"
              >
                <div className="flex flex-wrap items-baseline gap-2">
                  <time
                    dateTime={row.sentAt}
                    className="text-fg whitespace-nowrap"
                  >
                    {formatDateTime(row.sentAt)}
                  </time>
                  <span className="border border-border bg-bg px-1.5 py-0.5 text-[9px] font-black uppercase text-fg">
                    {CHANNEL_LABEL[row.channel]}
                  </span>
                  <span
                    className={
                      row.direction === "broadcast"
                        ? "border border-brand-pink/60 bg-brand-pink/10 px-1.5 py-0.5 text-[9px] font-black uppercase text-brand-pink"
                        : "border border-border bg-bg px-1.5 py-0.5 text-[9px] font-black uppercase text-fg"
                    }
                  >
                    {DIRECTION_LABEL[row.direction]}
                  </span>
                  {row.sentBy ? (
                    <span className="text-[10px] text-fg/80">
                      by {row.sentBy}
                    </span>
                  ) : null}
                </div>
                {row.subject ? (
                  <p className="mt-1.5 font-bold text-fg break-words">
                    {row.subject}
                  </p>
                ) : null}
                {row.bodyExcerpt ? (
                  <p className="mt-1 whitespace-pre-wrap break-words text-fg">
                    {row.bodyExcerpt}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flex justify-end border-t border-border pt-3">
          <button
            type="button"
            onClick={onClose}
            className={ghostBtn}
            style={btnStyle}
          >
            닫기
          </button>
        </div>
      </div>
    </Modal>
  );
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear() - 2000}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
