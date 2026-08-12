"use client";

/**
 * 내 추천 코드 카드 (LMS 학생/강사 본인 공유용).
 *
 * 본인 코드만 표시. 타인 실명/코드 노출 없음 (LMS 는 본인 코드 only, 추천인
 * 실명은 어드민 전용). clipboard 복사 + "복사됨" 피드백 (§6.7 상태 변경 반응).
 */
import * as React from "react";
import { Copy, Check, Gift } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/card";

export function ReferralCodeCard({
  code,
  locale,
}: {
  code: string;
  locale: string;
}) {
  const isEn = locale === "en";
  const [copied, setCopied] = React.useState(false);
  const timerRef = React.useRef<number | null>(null);

  React.useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    [],
  );

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard 권한 없음 등은 조용히 무시. 코드는 화면에 이미 보임.
    }
  }

  return (
    <Card className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-500">
      <CardHeader>
        <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius)] bg-[var(--primary)]/10 text-[var(--primary)]">
          <Gift className="h-5 w-5" />
        </div>
        <CardTitle className="mt-3 text-base">
          {isEn ? "My referral code" : "내 추천 코드"}
        </CardTitle>
        <CardDescription className="text-xs">
          {isEn
            ? "Share this code with friends. When they apply, our team applies a discount manually."
            : "친구에게 이 코드를 공유하세요. 친구가 신청 시 운영진이 할인을 적용해드려요"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <code
            className="flex-1 select-all rounded-[var(--radius)] border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 text-lg font-black tracking-[0.25em] text-[var(--foreground)]"
            aria-label={isEn ? "Referral code" : "추천 코드"}
          >
            {code}
          </code>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm font-semibold text-[var(--foreground)] transition-colors duration-150 hover:bg-[var(--secondary)] active:scale-95"
            aria-live="polite"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-[var(--primary)]" />
                {isEn ? "Copied" : "복사됨"}
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                {isEn ? "Copy" : "복사"}
              </>
            )}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
