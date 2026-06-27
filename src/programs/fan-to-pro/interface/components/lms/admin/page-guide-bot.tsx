"use client";

/**
 * PageGuideBot — LMS 어드민 페이지 우측 하단 floating 가이드 봇 (B0056).
 *
 * 운영자가 페이지 진입 시 해당 페이지의 워크플로우를 짧게 안내. 토글 + dismiss
 * + "다시 보지 않기" 영구 dismiss 지원. localStorage 로 페이지 별 상태 영구화.
 *
 * 절대 룰:
 *   - admin 영역에만 노출 (마케팅 KakaoChannelButton 변경 금지)
 *   - 학생/강사 surface 변경 0 (B0056 spec)
 *   - props 는 모두 string literal — XSS surface 0
 *
 * UX:
 *   1) 첫 진입 = closed pill ("✨ 이 페이지 가이드")
 *   2) 클릭 = 카드 펼침 (max-w-sm, max-h scrollable, slide-in animation)
 *   3) X = pill 로 복귀 (이번 세션만 dismiss + localStorage 에 "open" 상태 false 박음)
 *   4) "다시 보지 않기" check = pill 까지 hidden (별도 localStorage key)
 *
 * localStorage keys:
 *   - lms-guide-open-${pageId}: "1" | "0"  (펼침 상태 — 사용자 선호 영구 기억)
 *   - lms-guide-hidden-${pageId}: "1" | undefined  (완전 hidden — 영구 dismiss)
 */
import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { Sparkles, X, ArrowRight } from "lucide-react";
import { Button } from "@/src/programs/fan-to-pro/interface/components/lms/ui/button";
import { cn } from "@/src/programs/fan-to-pro/interface/components/lms/lib/utils";

export type PageGuideStep = {
  title: string;
  description: string;
  /** 선택: 다음 step 으로 가는 link (예: 학생 등록 페이지) */
  actionHref?: string;
  actionLabel?: string;
};

export type PageGuide = {
  /** 페이지 고유 id (localStorage key). 페이지 마다 다른 id. */
  pageId: string;
  /** 봇 제목 (예: "기수 페이지 가이드") */
  title: string;
  /** 본문 안내 — 워크플로우 step list */
  steps: PageGuideStep[];
  /** 선택: 운영자 자주 묻는 질문 / 주의사항 */
  tips?: string[];
};

const STORAGE_PREFIX_OPEN = "lms-guide-open-";
const STORAGE_PREFIX_HIDDEN = "lms-guide-hidden-";

function readBool(key: string, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return raw === "1";
  } catch {
    return fallback;
  }
}

function writeBool(key: string, value: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value ? "1" : "0");
  } catch {
    // localStorage 접근 실패 (private mode 등) 무시.
  }
}

export function PageGuideBot({ pageId, title, steps, tips }: PageGuide) {
  // hydration safe — 첫 render 는 SSR 과 동일하게 닫힘 + 표시 상태로.
  // 마운트 후 localStorage 값으로 보정.
  const [mounted, setMounted] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);
  const [isHidden, setIsHidden] = React.useState(false);
  const [neverShow, setNeverShow] = React.useState(false);

  const openKey = `${STORAGE_PREFIX_OPEN}${pageId}`;
  const hiddenKey = `${STORAGE_PREFIX_HIDDEN}${pageId}`;

  React.useEffect(() => {
    setMounted(true);
    // 영구 hidden 우선 검사 — true 면 더 이상 아무것도 표시 안 함.
    const hidden = readBool(hiddenKey, false);
    setIsHidden(hidden);
    if (hidden) return;
    // 펼침 상태 — 기본은 닫힘 (pill). 사용자가 한 번이라도 펼친 적 있으면 true.
    setIsOpen(readBool(openKey, false));
  }, [openKey, hiddenKey]);

  const handleOpen = React.useCallback(() => {
    setIsOpen(true);
    writeBool(openKey, true);
  }, [openKey]);

  const handleClose = React.useCallback(() => {
    setIsOpen(false);
    writeBool(openKey, false);
    if (neverShow) {
      setIsHidden(true);
      writeBool(hiddenKey, true);
    }
  }, [openKey, hiddenKey, neverShow]);

  // 마운트 전 또는 영구 hidden 이면 nothing.
  if (!mounted || isHidden) return null;

  return (
    <div
      // bottom 은 safe-area + 24px (모집 KakaoChannelButton 과 같은 region 이지만
      // admin 영역엔 그 컴포넌트가 없으므로 충돌 없음).
      style={{
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)",
      }}
      className="fixed right-4 sm:right-6 z-[60] pointer-events-none"
    >
      {isOpen ? (
        <div
          role="dialog"
          aria-labelledby={`guide-title-${pageId}`}
          className={cn(
            "pointer-events-auto",
            "w-[min(calc(100vw-2rem),24rem)] max-h-[70vh] overflow-y-auto",
            "rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl shadow-black/10",
            "animate-in fade-in slide-in-from-bottom-4 duration-200",
          )}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-4 bg-[var(--card)] border-b border-[var(--border)] rounded-t-2xl">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              </span>
              <h2
                id={`guide-title-${pageId}`}
                className="text-sm font-bold text-[var(--foreground)] truncate"
              >
                {title}
              </h2>
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="가이드 닫기"
              className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-full text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Steps */}
          <ol className="px-5 py-4 space-y-3">
            {steps.map((step, idx) => (
              <li key={`${pageId}-step-${idx}`} className="flex gap-3">
                <span className="shrink-0 mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--primary)] text-[10px] font-bold text-[var(--primary-foreground)]">
                  {idx + 1}
                </span>
                <div className="space-y-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--foreground)] leading-snug">
                    {step.title}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                    {step.description}
                  </p>
                  {step.actionHref && step.actionLabel ? (
                    <Link
                      href={step.actionHref as Route}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)] hover:underline mt-0.5"
                    >
                      {step.actionLabel}
                      <ArrowRight className="h-3 w-3" aria-hidden="true" />
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>

          {/* Tips */}
          {tips && tips.length > 0 ? (
            <div className="px-5 pb-4">
              <div className="rounded-lg bg-[var(--secondary)] px-3 py-2.5 space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted-foreground)]">
                  Tip
                </p>
                <ul className="space-y-1">
                  {tips.map((tip, idx) => (
                    <li
                      key={`${pageId}-tip-${idx}`}
                      className="text-xs text-[var(--foreground)] leading-relaxed flex gap-1.5"
                    >
                      <span className="shrink-0 text-[var(--primary)]">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}

          {/* Footer — 다시 보지 않기 */}
          <div className="sticky bottom-0 px-5 py-3 bg-[var(--card)] border-t border-[var(--border)] rounded-b-2xl">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={neverShow}
                onChange={(e) => setNeverShow(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--ring)]"
              />
              <span className="text-xs text-[var(--muted-foreground)]">
                다시 보지 않기 (닫을 때 적용)
              </span>
            </label>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          onClick={handleOpen}
          size="sm"
          className={cn(
            "pointer-events-auto",
            "h-10 rounded-full pl-3 pr-4 gap-1.5 shadow-lg shadow-black/15",
            "animate-in fade-in slide-in-from-bottom-2 duration-200",
          )}
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          <span className="text-xs font-semibold">이 페이지 가이드</span>
        </Button>
      )}
    </div>
  );
}
