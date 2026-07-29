/**
 * LMS 라이트 타이포그래피 스케일.
 *
 * 관습적 문서 위계 — near-black 본문, 절제된 muted. AI-slop 인 거대한 clamp
 * display 나 회색 남발 대신, 운영툴/문서에 익숙한 명확한 h1~h3 + body/small.
 *
 * 스케일 (line-height 는 [data-theme=light] 기본 1.6 상속):
 *   PageTitle  1.75rem (28px) / bold  — 페이지 제목
 *   H2         1.375rem (22px) / bold — 섹션
 *   H3         1.125rem (18px) / semibold — 서브섹션
 *   Body       0.9375rem (15px) — 본문
 *   Small      0.8125rem (13px) muted — 보조 설명
 */
import * as React from "react";
import { cn } from "@/src/programs/fan-to-pro/interface/components/lms/lib/utils";

export function PageTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1
      className={cn(
        "text-[1.75rem] font-bold leading-tight tracking-[-0.02em] text-[var(--foreground)]",
        className,
      )}
      {...props}
    />
  );
}

export function H2({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        "text-[1.375rem] font-bold leading-snug tracking-[-0.015em] text-[var(--foreground)]",
        className,
      )}
      {...props}
    />
  );
}

export function H3({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "text-lg font-semibold leading-snug text-[var(--foreground)]",
        className,
      )}
      {...props}
    />
  );
}

export function Body({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-[0.9375rem] text-[var(--foreground)]", className)}
      {...props}
    />
  );
}

export function Muted({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "text-[0.8125rem] text-[var(--muted-foreground)]",
        className,
      )}
      {...props}
    />
  );
}
