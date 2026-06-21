import type { Metadata } from "next";
import { ForgotForm } from "@/src/programs/fan-to-pro/interface/components/lms/auth/forgot-form";

export const metadata: Metadata = {
  title: "비밀번호 재설정 - Growth Career",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

/**
 * /[locale]/auth/forgot-password — 비밀번호 재설정 magic link 발송 (ADR 0008 §1).
 *
 * 이메일 enumeration 방어 — 존재 여부 노출 X (서버가 항상 ok 응답).
 */
export default function AuthForgotPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
            비밀번호 재설정
          </h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            가입한 이메일로 재설정 링크를 보내드립니다
          </p>
        </header>

        <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <ForgotForm />
        </div>
      </div>
    </main>
  );
}
