import { LmsSidebar } from "@/src/programs/fan-to-pro/interface/components/lms/shell/lms-sidebar";
import { LmsTopbar } from "@/src/programs/fan-to-pro/interface/components/lms/shell/lms-topbar";
import type { LmsUser } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";

/**
 * LMS Shell — sidebar + topbar + main content (ADR 0006 §6).
 *
 * 인증 후 진입한 페이지 layout 의 wrapper. role 별 sidebar 메뉴 + 공통 topbar.
 *
 * server component — role/user 는 page level 에서 getLmsUser() 로 주입.
 */
export function LmsShell({
  user,
  children,
}: {
  user: LmsUser;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-[var(--secondary)] overflow-hidden">
      <LmsSidebar role={user.role} />
      <div className="flex-1 flex flex-col min-w-0">
        <LmsTopbar
          role={user.role}
          displayName={user.displayName}
          email={user.email}
        />
        <main className="flex-1 overflow-y-auto motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300">
          {children}
        </main>
      </div>
    </div>
  );
}
