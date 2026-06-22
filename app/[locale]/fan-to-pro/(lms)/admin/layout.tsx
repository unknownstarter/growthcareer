import type { Route } from "next";
import { redirect } from "next/navigation";
import {
  getLmsUser,
  isProgramAdmin,
} from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { LmsShell } from "@/src/programs/fan-to-pro/interface/components/lms/shell/lms-shell";

/**
 * /[locale]/fan-to-pro/admin/* — fan-to-pro 운영자 영역 (ADR 0008 §1·5).
 *
 * 권한: super_admin (글로벌) 또는 program_memberships role=admin (fan-to-pro).
 * middleware 가 1차 차단, 본 layout 이 2차 가드 (defensive — CLAUDE.md §7.4).
 *
 * must_change_password=true 면 강제 /auth/change-password.
 */
export default async function FanToProAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getLmsUser();
  if (!user) redirect(`/${locale}/auth/login` as Route);

  if (user.mustChangePassword) {
    redirect(`/${locale}/auth/change-password` as Route);
  }

  // super_admin 또는 program admin (React cache() 적용 — request 당 1회 query).
  const allowed = user.isSuperAdmin || (await isProgramAdmin(user.id, "fan-to-pro"));

  if (!allowed) {
    redirect(`/${locale}/auth/login?error=no_membership` as Route);
  }

  return <LmsShell user={user}>{children}</LmsShell>;
}
