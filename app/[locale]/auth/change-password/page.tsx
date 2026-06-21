import type { Metadata, Route } from "next";
import { redirect } from "next/navigation";
import { getLmsUser } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { resolvePostLoginRedirect } from "@/src/programs/fan-to-pro/infrastructure/auth/post-login-redirect";
import { ChangePasswordForm } from "@/src/programs/fan-to-pro/interface/components/lms/auth/change-password-form";

export const metadata: Metadata = {
  title: "비밀번호 변경 - Growth Career",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

/**
 * /[locale]/auth/change-password — 첫 로그인 강제 PW 변경 (ADR 0008 §4).
 *
 * 진입 조건:
 *   - 로그인 상태 (session 있음)
 *   - user_profiles.must_change_password = true 또는 직접 진입
 *
 * 미로그인이면 /auth/login 으로. 이미 PW 변경 완료면 role 별 dashboard 로.
 *
 * 성공 시 redirect: resolvePostLoginRedirect 가 결정 (super_admin → admin
 * dashboard / instructor / student → cohort surface).
 */
export default async function AuthChangePasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getLmsUser();
  if (!user) {
    redirect(`/${locale}/auth/login` as Route);
  }

  // 이미 변경한 사용자가 직접 진입 — 본인 role surface 로 보냄.
  if (!user.mustChangePassword) {
    const dest = await resolvePostLoginRedirect(user, locale);
    redirect(dest as Route);
  }

  const redirectAfter = await resolvePostLoginRedirect(user, locale);

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
            비밀번호 설정
          </h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            안녕하세요, {user.displayName} 님
          </p>
        </header>

        <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <ChangePasswordForm redirectTo={redirectAfter} />
        </div>
      </div>
    </main>
  );
}
