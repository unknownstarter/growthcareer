import { redirect } from "next/navigation";
import { getLmsUser } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
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
  if (!user) redirect(`/${locale}/auth/login`);

  if (user.mustChangePassword) {
    redirect(`/${locale}/auth/change-password`);
  }

  // super_admin 통과.
  let allowed = user.isSuperAdmin;

  // program admin 검사.
  if (!allowed) {
    const supabase = getSupabaseServer();
    if (supabase) {
      const { data: program } = await supabase
        .from("programs")
        .select("id")
        .eq("slug", "fan-to-pro")
        .single();
      if (program) {
        const { data: membership } = await supabase
          .from("program_memberships")
          .select("user_id")
          .eq("user_id", user.id)
          .eq("program_id", program.id)
          .eq("role", "admin")
          .maybeSingle();
        allowed = !!membership;
      }
    }
  }

  if (!allowed) {
    redirect(`/${locale}/auth/login?error=no_membership`);
  }

  return <LmsShell user={user}>{children}</LmsShell>;
}
