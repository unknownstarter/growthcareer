import { redirect } from "next/navigation";
import { getLmsUser } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { LmsShell } from "@/src/programs/fan-to-pro/interface/components/lms/shell/lms-shell";

/**
 * /lms/student/* — student 전용 영역 layout.
 *
 * middleware 1차 + 본 layout 2차 가드. student 가 아니면 즉시 redirect.
 */
export default async function LmsStudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getLmsUser();
  if (!user) redirect("/lms/login");
  if (user.role !== "student") redirect("/lms");

  return <LmsShell user={user}>{children}</LmsShell>;
}
