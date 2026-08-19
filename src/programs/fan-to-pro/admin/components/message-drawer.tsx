"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "./modal";
import { cn } from "@/src/shared/ui/cn";
import {
  buildMailtoUrl,
  buildSmsUrl,
  getEmailBody,
  getEmailSubject,
  getSmsBody,
  guessLocaleFromPhone,
  hasEligibleVisa,
  MESSAGE_KIND_LABELS,
  MESSAGE_KIND_PAID_ONLY,
  type MessageChannel,
  type MessageKind,
  type MessageLocale,
} from "@/src/programs/fan-to-pro/messages/templates";
import { resolveTuitionForApplicant } from "@/src/programs/fan-to-pro/domain/pricing";
import type { ApplicantRow } from "../types";

type LocaleMode = "auto" | "ko" | "en";

const KAKAO_CHAT_URL = "https://pf.kakao.com/_nxhDGX/chat";

const labelClass = "block text-[10px] font-black uppercase text-fg/80";
const labelStyle = { letterSpacing: "0.2em" } as const;

const primaryBtn =
  "inline-flex min-h-[40px] shrink-0 items-center justify-center gap-2 bg-brand-pink px-3 py-2 text-xs font-black uppercase text-fg hover:bg-brand-purple disabled:opacity-60";

const ghostBtn =
  "inline-flex min-h-[40px] shrink-0 items-center justify-center border border-border bg-bg px-3 py-2 text-xs font-black uppercase text-fg hover:text-fg disabled:opacity-40";

const btnStyle = { letterSpacing: "0.15em" } as const;

export function MessageDrawer({
  open,
  applicant,
  onClose,
  onCopied,
}: {
  open: boolean;
  applicant: ApplicantRow | null;
  onClose: () => void;
  onCopied: (kind: MessageKind, channel: MessageChannel) => void;
}) {
  const [channel, setChannel] = useState<MessageChannel>("sms");
  const [localeMode, setLocaleMode] = useState<LocaleMode>("auto");
  const [kind, setKind] = useState<MessageKind>("paymentGuide");
  const [editedBody, setEditedBody] = useState<string | null>(null);
  const [editedSubject, setEditedSubject] = useState<string | null>(null);

  // 드로어가 새 신청자로 열릴 때 상태에 맞는 기본 메시지 종류를 선택 (재사용 규칙):
  //   next_cohort_interest → 다음 기수 오픈 안내, confirmation_notice → 사전 확인 안내,
  //   그 외 → 입금 안내. 운영자가 수동으로 바꾸면(같은 applicant) 덮어쓰지 않음.
  useEffect(() => {
    if (!applicant) return;
    setKind(
      applicant.status === "next_cohort_interest"
        ? "nextCohortOpen"
        : applicant.status === "confirmation_notice"
          ? "confirmationNotice"
          : "paymentGuide",
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicant?.id]);

  const resolvedLocale: MessageLocale = useMemo(() => {
    if (localeMode === "auto") {
      return guessLocaleFromPhone(applicant?.phone ?? null);
    }
    return localeMode;
  }, [localeMode, applicant?.phone]);

  // 신청 과정별 수강료 (ADR 0019). 1기(selection null) = 880,000 fallback.
  const tuition = useMemo(() => {
    if (!applicant) return undefined;
    return resolveTuitionForApplicant(
      applicant.selectionMode,
      applicant.selectedCourseSlugs,
      resolvedLocale,
    ).tuition;
  }, [applicant, resolvedLocale]);

  const generatedBody = useMemo(() => {
    if (!applicant) return "";
    const hasVisa = hasEligibleVisa(applicant.visa);
    if (channel === "sms") {
      return getSmsBody(kind, resolvedLocale, applicant.name, {
        hasVisa,
        tuition,
      });
    }
    return getEmailBody(kind, resolvedLocale, applicant.name, {
      hasVisa,
      tuition,
    });
  }, [applicant, channel, kind, resolvedLocale, tuition]);

  const generatedSubject = useMemo(() => {
    if (!applicant || channel !== "email") return "";
    const hasVisa = hasEligibleVisa(applicant.visa);
    return getEmailSubject(kind, resolvedLocale, applicant.name, {
      hasVisa,
      tuition,
    });
  }, [applicant, channel, kind, resolvedLocale, tuition]);

  // 옵션이 바뀌면 사용자 편집 초기화.
  useEffect(() => {
    setEditedBody(null);
    setEditedSubject(null);
  }, [channel, kind, resolvedLocale, applicant?.id]);

  const body = editedBody ?? generatedBody;
  const subject = editedSubject ?? generatedSubject;

  if (!applicant) return null;

  const copyBody = async () => {
    try {
      await navigator.clipboard.writeText(body);
      onCopied(kind, channel);
    } catch {
      // Fallback - hidden textarea + execCommand.
      const ta = document.createElement("textarea");
      ta.value = body;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        onCopied(kind, channel);
      } finally {
        document.body.removeChild(ta);
      }
    }
  };

  const mailtoHref =
    channel === "email"
      ? buildMailtoUrl(applicant.email, subject, body)
      : "";
  const smsHref =
    channel === "sms"
      ? buildSmsUrl(applicant.phone, body, applicant.nationality)
      : "";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${applicant.name} 메시지`}
      size="lg"
    >
      <div className="flex flex-col gap-4">
        {/* 상단 메타 */}
        <div className="grid grid-cols-1 gap-2 border border-border bg-bg/40 p-3 text-[11px] text-fg sm:grid-cols-3">
          <div>
            <span className={labelClass} style={labelStyle}>
              이메일
            </span>
            <div className="text-fg break-all">{applicant.email}</div>
          </div>
          <div>
            <span className={labelClass} style={labelStyle}>
              연락처
            </span>
            <div className="text-fg">{applicant.phone}</div>
          </div>
          <div>
            <span className={labelClass} style={labelStyle}>
              비자
            </span>
            <div className="text-fg">{applicant.visa ?? "-"}</div>
          </div>
        </div>

        {/* 토글 그룹 */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <ToggleGroup
            label="채널"
            value={channel}
            options={[
              { value: "sms", label: "카톡 / SMS" },
              { value: "email", label: "이메일" },
            ]}
            onChange={setChannel}
          />
          <ToggleGroup
            label="언어"
            value={localeMode}
            options={[
              { value: "auto", label: `자동 (${resolvedLocale})` },
              { value: "ko", label: "한국어" },
              { value: "en", label: "영문" },
            ]}
            onChange={setLocaleMode}
          />
          <ToggleGroup
            label="메시지 종류"
            value={kind}
            options={(Object.keys(MESSAGE_KIND_LABELS) as MessageKind[])
              .filter(
                // paid-only 메시지 종류는 paid / enrolled 신청자에게만 노출.
                // 그 외 status (pending / notified / overdue / cancelled / refunded)
                // 에는 친구 초대 이벤트 옵션 숨김 — 약관 §15 매칭 일관성 보호.
                (k) =>
                  !MESSAGE_KIND_PAID_ONLY.has(k) ||
                  applicant.status === "paid" ||
                  applicant.status === "enrolled",
              )
              .map((k) => ({ value: k, label: MESSAGE_KIND_LABELS[k] }))}
            onChange={setKind}
          />
        </div>

        {/* 이메일 제목 */}
        {channel === "email" ? (
          <label className="flex flex-col gap-1.5">
            <span className={labelClass} style={labelStyle}>
              이메일 제목
            </span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setEditedSubject(e.target.value)}
              className="w-full border border-border bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-brand-pink"
            />
          </label>
        ) : null}

        {/* 본문 미리보기 */}
        <label className="flex flex-col gap-1.5">
          <span className={labelClass} style={labelStyle}>
            본문 미리보기 (편집 가능)
          </span>
          <textarea
            value={body}
            onChange={(e) => setEditedBody(e.target.value)}
            rows={channel === "email" ? 10 : 6}
            className="w-full resize-y border border-border bg-bg px-3 py-2 text-xs leading-relaxed text-fg outline-none focus:border-brand-pink sm:text-sm"
          />
          <span className="text-[11px] text-fg/80">
            {body.length} 글자. 발송 직전 톤 조정 가능.
          </span>
        </label>

        {/* 액션 버튼 */}
        <div className="flex flex-wrap gap-2 border-t border-border pt-3">
          <button
            type="button"
            onClick={copyBody}
            className={primaryBtn}
            style={btnStyle}
          >
            본문 복사
          </button>

          {channel === "sms" ? (
            <>
              <a
                href={smsHref}
                className={ghostBtn}
                style={btnStyle}
                onClick={() => onCopied(kind, channel)}
              >
                SMS 앱 열기
              </a>
              <a
                href={KAKAO_CHAT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={ghostBtn}
                style={btnStyle}
              >
                카톡 채널 열기
              </a>
            </>
          ) : (
            <a
              href={mailtoHref}
              className={ghostBtn}
              style={btnStyle}
              onClick={() => onCopied(kind, channel)}
            >
              메일 앱 열기
            </a>
          )}

          <button
            type="button"
            onClick={onClose}
            className={cn(ghostBtn, "ml-auto")}
            style={btnStyle}
          >
            닫기
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ToggleGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className={labelClass} style={labelStyle}>
        {label}
      </span>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1">
        {options.map((opt) => {
          const selected = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(opt.value)}
              className={cn(
                "inline-flex min-h-[32px] items-center border px-2.5 py-1.5 text-[11px] font-black uppercase whitespace-nowrap transition-colors",
                selected
                  ? "border-brand-pink bg-brand-pink/15 text-brand-pink"
                  : "border-border bg-bg text-fg hover:text-fg",
              )}
              style={{ letterSpacing: "0.1em" }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
