"use client";

import { useTransition } from "react";
import { LogOut, ShieldCheck, GraduationCap, User } from "lucide-react";
import { Button } from "@/src/programs/fan-to-pro/interface/components/lms/ui/button";
import { logoutAction } from "@/src/programs/fan-to-pro/interface/server-actions/lms-auth-actions";
import type { LmsRole } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";

const roleBadge: Record<LmsRole, { label: string; icon: typeof ShieldCheck }> = {
  super_admin: { label: "운영자", icon: ShieldCheck },
  instructor: { label: "강사", icon: GraduationCap },
  student: { label: "학생", icon: User },
};

export function LmsTopbar({
  role,
  displayName,
  email,
}: {
  role: LmsRole;
  displayName: string;
  email: string;
}) {
  const [pending, startTransition] = useTransition();
  const { label, icon: Icon } = roleBadge[role];

  function handleLogout() {
    startTransition(async () => {
      await logoutAction();
    });
  }

  return (
    <header className="h-16 shrink-0 flex items-center justify-between gap-4 px-6 border-b border-[var(--border)] bg-[var(--background)]">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--secondary)] px-2.5 py-1 text-xs font-semibold text-[var(--muted-foreground)]">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-semibold text-[var(--foreground)] leading-tight">
            {displayName}
          </p>
          <p className="text-xs text-[var(--muted-foreground)] leading-tight">
            {email}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          disabled={pending}
          className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline ml-2">
            {pending ? "로그아웃 중..." : "로그아웃"}
          </span>
        </Button>
      </div>
    </header>
  );
}
