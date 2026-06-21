import type { Metadata } from "next";
import { ResetForm } from "@/src/programs/fan-to-pro/interface/components/lms/auth/reset-form";

export const metadata: Metadata = {
  title: "새 비밀번호 설정 - Growth Career",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

/**
 * /[locale]/auth/reset-password — magic link 클릭 후 도착 (ADR 0008 §1).
 *
 * Supabase Auth callback 의 redirectTo 가 본 페이지로 옴. session 이미 박힘.
 */
export default function AuthResetPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
            새 비밀번호 설정
          </h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            10자 이상의 새 비밀번호를 입력해주세요
          </p>
        </header>

        <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <ResetForm />
        </div>
      </div>
    </main>
  );
}
