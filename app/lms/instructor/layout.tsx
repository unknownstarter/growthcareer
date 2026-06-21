import { redirect } from "next/navigation";
import { getLmsUser } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { LmsShell } from "@/src/programs/fan-to-pro/interface/components/lms/shell/lms-shell";

/**
 * /lms/instructor/* — instructor 전용 영역 layout.
 *
 * middleware 1차 + 본 layout 2차 가드.
 */
export default async function LmsInstructorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getLmsUser();
  if (!user) redirect("/lms/login");
  if (user.role !== "instructor") redirect("/lms");

  return <LmsShell user={user}>{children}</LmsShell>;
}
