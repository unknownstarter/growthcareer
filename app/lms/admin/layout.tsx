import { redirect } from "next/navigation";
import { getLmsUser } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { LmsShell } from "@/src/programs/fan-to-pro/interface/components/lms/shell/lms-shell";

/**
 * /lms/admin/* — super_admin 전용 영역 layout.
 *
 * middleware 가 1차 role 차단 (URL 레벨). 본 layout 은 server-side 검증으로
 * 2차 가드 — user 가 super_admin 이 아니면 즉시 redirect (defensive).
 *
 * LmsShell 으로 sidebar + topbar 공통 적용.
 */
export default async function LmsAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getLmsUser();
  if (!user) redirect("/lms/login");
  if (user.role !== "super_admin") {
    redirect("/lms");
  }

  return <LmsShell user={user}>{children}</LmsShell>;
}
