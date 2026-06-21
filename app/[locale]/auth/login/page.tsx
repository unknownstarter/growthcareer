import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/src/programs/fan-to-pro/interface/components/lms/auth/login-form";

export const metadata: Metadata = {
  title: "로그인 - Growth Career",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

/**
 * /[locale]/auth/login — 통합 로그인 (ADR 0008 §1).
 *
 * super_admin / instructor / student 모두 동일 페이지. 로그인 후 user_profiles 의
 * is_super_admin / cohort_memberships / must_change_password 검사 후 redirect.
 *
 * Suspense 는 useSearchParams 의 client component 가 prerender 단계에서 suspend
 * 되는 것을 처리.
 */
export default function AuthLoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
            Growth Career
          </h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            로그인하여 학습 시스템에 접속하세요
          </p>
        </header>

        <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <Suspense fallback={<div className="h-64" />}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="mt-6 text-center text-xs text-[var(--muted-foreground)]">
          Growth Career / Fan to Pro / 운영 Dropdown
        </p>
      </div>
    </main>
  );
}
