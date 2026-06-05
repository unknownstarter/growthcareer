"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

/**
 * Apply confirmation modal — B0007 T3.
 *
 * Shown after Step 2 client-side validation passes, before the actual
 * `submitApplication` server action fires. Single-click confirm flow
 * (no extra checkboxes) — the form already collected consents.
 *
 * a11y:
 * - `role="dialog"` + `aria-modal` + `aria-labelledby`
 * - Focus moves to the primary confirm button on open
 * - ESC closes
 * - Outside click on the backdrop closes
 * - Focus is trapped within the dialog while open
 *
 * Layout:
 * - Mobile (<sm): full-screen overlay sheet
 * - Desktop (>=sm): centered card, max-w 480px
 *
 * z-index: `z-[80]` to sit above `LocaleSwitcher` (`z-[70]`) and
 * `StickyCta` (`z-50`).
 */
export function ApplyConfirmModal({
  open,
  pending,
  errorMessage,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  pending: boolean;
  errorMessage?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const t = useTranslations("applyForm.confirmModal");
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // ESC to close + focus management.
  useEffect(() => {
    if (!open) return;

    // Snapshot the trigger so we can restore focus on close.
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Defer focus so the dialog has rendered.
    const focusTimer = window.setTimeout(() => {
      confirmButtonRef.current?.focus();
    }, 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) {
        e.preventDefault();
        onCancel();
        return;
      }
      if (e.key === "Tab") {
        // Simple focus trap.
        const root = dialogRef.current;
        if (!root) return;
        const focusables = root.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey) {
          if (active === first || !root.contains(active)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (active === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    // Lock background scroll while modal is open.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open, pending, onCancel]);

  if (!open) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (pending) return;
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="
        fixed inset-0 z-[80]
        flex items-end justify-center sm:items-center
        bg-bg/85 backdrop-blur-sm
        animate-in fade-in duration-150
      "
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="apply-confirm-title"
        className="
          relative
          flex flex-col
          w-full sm:max-w-[480px]
          max-h-[100dvh] sm:max-h-[90dvh]
          overflow-y-auto
          bg-surface
          border-t-2 sm:border-2 border-brand-pink
          shadow-2xl
        "
      >
        {/* Close (X) — desktop only. Mobile uses Cancel button at the bottom. */}
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          aria-label={t("closeAriaLabel")}
          className="
            absolute right-3 top-3 z-10
            hidden sm:flex
            h-8 w-8 items-center justify-center
            text-fg-subtle hover:text-fg
            disabled:opacity-40
          "
        >
          <span aria-hidden className="text-xl leading-none">
            ×
          </span>
        </button>

        <div className="flex flex-col gap-5 px-6 pt-8 pb-4 sm:px-8 sm:pt-10">
          {/* Title */}
          <div className="flex flex-col gap-2">
            <h2
              id="apply-confirm-title"
              className="font-black text-fg text-2xl sm:text-3xl"
              style={{ letterSpacing: "-0.03em", lineHeight: 1.15 }}
            >
              {t("title")}
            </h2>
            <p className="text-fg-muted text-sm leading-relaxed sm:text-base">
              {t("subtitle")}
            </p>
          </div>

          {/* Price block */}
          <div className="border-2 border-brand-pink bg-brand-pink/5 p-4 sm:p-5">
            <p
              className="mb-2 text-fg-subtle text-[10px] font-black uppercase sm:text-xs"
              style={{ letterSpacing: "0.3em" }}
            >
              {t("priceLabel")}
            </p>
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="text-fg-subtle text-base line-through sm:text-lg">
                {t("priceOriginal")}
              </span>
              <span
                className="font-black text-brand-pink text-3xl sm:text-4xl whitespace-nowrap"
                style={{ letterSpacing: "-0.03em" }}
              >
                {t("priceDiscounted")}
              </span>
              <span
                className="inline-block bg-brand-pink px-2 py-0.5 text-fg text-[10px] font-black uppercase sm:text-xs whitespace-nowrap"
                style={{ letterSpacing: "0.2em" }}
              >
                {t("discountBadge")}
              </span>
            </div>
          </div>

          {/* Detail rows */}
          <dl className="grid grid-cols-1 gap-3 text-sm sm:text-base">
            <DetailRow
              label={t("paymentMethodLabel")}
              value={t("paymentMethodValue")}
              note={t("paymentMethodNote")}
            />
            <DetailRow
              label={t("scarcityLabel")}
              value={t("scarcityValue")}
              note={t("deadlineValue")}
            />
          </dl>

          {/* Completion criteria — highlighted */}
          <div className="border-l-4 border-brand-pink bg-bg/60 p-4">
            <p
              className="mb-1 font-black text-brand-pink text-sm sm:text-base"
              style={{ letterSpacing: "-0.02em" }}
            >
              {t("completionTitle")}
            </p>
            <p className="text-fg text-xs leading-relaxed sm:text-sm">
              {t("completionBody")}
            </p>
          </div>

          {/* Send-after-apply notice */}
          <p className="text-fg-muted text-xs leading-relaxed sm:text-sm">
            {t("noticeBody")}
          </p>

          {/* Refund summary */}
          <div className="border border-border bg-bg p-3 text-xs leading-relaxed sm:text-sm">
            <p className="text-fg">{t("refundSimpleA")}</p>
            <p className="text-fg">{t("refundSimpleB")}</p>
            <p className="mt-2">
              <a
                href="/terms#refund-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-pink underline underline-offset-2 hover:text-fg"
              >
                {t("refundLinkText")}
              </a>
            </p>
          </div>

          {/* Server error inline */}
          {errorMessage ? (
            <p
              role="alert"
              className="border border-brand-pink bg-brand-pink/10 px-3 py-2 text-brand-pink text-xs sm:text-sm"
            >
              {errorMessage}
            </p>
          ) : null}

          {/* Trust footer */}
          <p
            className="border-border border-t pt-3 text-fg-subtle text-[11px] leading-relaxed"
            style={{ letterSpacing: "0.01em" }}
          >
            {t("trustFooter")}
          </p>
        </div>

        {/* Sticky action bar */}
        <div
          className="
            sticky bottom-0
            border-border border-t
            bg-surface
            px-6 py-4 sm:px-8 sm:py-5
            flex flex-col-reverse gap-3 sm:flex-row sm:justify-end
          "
        >
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="
              border border-border bg-bg
              px-5 py-3 sm:py-3.5
              text-fg-muted text-sm font-black uppercase
              hover:text-fg hover:border-fg-subtle
              disabled:opacity-40
            "
            style={{ letterSpacing: "0.15em" }}
          >
            {t("cancelButton")}
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="
              flex items-center justify-center gap-2
              bg-brand-pink hover:bg-brand-purple
              transition-colors
              px-6 py-3 sm:py-3.5
              text-fg text-sm font-black uppercase
              disabled:opacity-60 disabled:cursor-not-allowed
            "
            style={{ letterSpacing: "-0.01em" }}
          >
            {pending ? (
              <>
                <Spinner />
                <span>{t("submitting")}</span>
              </>
            ) : (
              <span>{t("submitButton")}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5">
      <dt
        className="text-fg-subtle text-[10px] font-black uppercase sm:text-xs"
        style={{ letterSpacing: "0.2em" }}
      >
        {label}
      </dt>
      <dd className="font-black text-fg" style={{ letterSpacing: "-0.01em" }}>
        {value}
      </dd>
      {note ? (
        <p className="col-start-2 text-fg-muted text-xs leading-relaxed sm:text-sm">
          {note}
        </p>
      ) : null}
    </div>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-fg border-t-transparent"
    />
  );
}
