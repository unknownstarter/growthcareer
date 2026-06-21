import type { Route } from "next";
import { redirect } from "next/navigation";
import { getLmsUser } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import { LmsShell } from "@/src/programs/fan-to-pro/interface/components/lms/shell/lms-shell";

/**
 * /[locale]/fan-to-pro/[cohortSlug]/student/* — 학생 surface (ADR 0008 §1).
 *
 * 권한: super_admin (글로벌) 또는 cohort_memberships role=student 본인.
 * middleware 가 1차 차단, 본 layout 이 2차 가드 (CLAUDE.md §7.4 — defensive).
 *
 * must_change_password=true 면 강제 /auth/change-password.
 *
 * cohortSlug 가 본인 cohort 와 매칭 안 되면 본인의 surface 로 redirect.
 */
export default async function FanToProStudentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; cohortSlug: string }>;
}) {
  const { locale, cohortSlug } = await params;
  const user = await getLmsUser();
  if (!user) redirect(`/${locale}/auth/login` as Route);

  if (user.mustChangePassword) {
    redirect(`/${locale}/auth/change-password` as Route);
  }

  // super_admin 통과.
  let allowed = user.isSuperAdmin;

  // student cohort_memberships 검사.
  if (!allowed) {
    const supabase = getSupabaseServer();
    if (supabase) {
      const { data: cohort } = await supabase
        .from("cohorts")
        .select("id")
        .eq("slug", cohortSlug)
        .maybeSingle();
      if (cohort) {
        const { data: cm } = await supabase
          .from("cohort_memberships")
          .select("user_id")
          .eq("user_id", user.id)
          .eq("cohort_id", cohort.id)
          .eq("role", "student")
          .maybeSingle();
        allowed = !!cm;
      }
    }
  }

  if (!allowed) {
    redirect(`/${locale}/auth/login?error=no_membership` as Route);
  }

  return <LmsShell user={user}>{children}</LmsShell>;
}
