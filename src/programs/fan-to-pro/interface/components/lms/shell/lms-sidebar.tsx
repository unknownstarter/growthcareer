"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import {
  LayoutDashboard,
  Layers,
  Users,
  GraduationCap,
  Building2,
  Wallet,
  FileText,
  Megaphone,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/src/programs/fan-to-pro/interface/components/lms/lib/utils";
import type { LmsRole } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";

type NavItem = {
  href: Route;
  label: string;
  icon: typeof LayoutDashboard;
};

const adminNav: NavItem[] = [
  { href: "/lms/admin/dashboard" as Route, label: "대시보드", icon: LayoutDashboard },
  { href: "/lms/admin/cohorts" as Route, label: "기수", icon: Layers },
  { href: "/lms/admin/students" as Route, label: "학생", icon: Users },
  { href: "/lms/admin/instructors" as Route, label: "강사", icon: GraduationCap },
  { href: "/lms/admin/companies" as Route, label: "회사", icon: Building2 },
  { href: "/lms/admin/finance" as Route, label: "정산", icon: Wallet },
  { href: "/lms/admin/materials" as Route, label: "자료", icon: FileText },
  { href: "/lms/admin/announcements" as Route, label: "공지", icon: Megaphone },
  { href: "/lms/admin/consultations" as Route, label: "컨설팅", icon: MessageSquare },
];

const instructorNav: NavItem[] = [
  { href: "/lms/instructor/dashboard" as Route, label: "대시보드", icon: LayoutDashboard },
  { href: "/lms/instructor/students" as Route, label: "학생", icon: Users },
  { href: "/lms/instructor/sessions" as Route, label: "세션", icon: Layers },
  { href: "/lms/instructor/consultations" as Route, label: "컨설팅", icon: MessageSquare },
];

const studentNav: NavItem[] = [
  { href: "/lms/student/dashboard" as Route, label: "대시보드", icon: LayoutDashboard },
  { href: "/lms/student/sessions" as Route, label: "수업", icon: Layers },
  { href: "/lms/student/assignments" as Route, label: "과제", icon: FileText },
  { href: "/lms/student/materials" as Route, label: "자료", icon: FileText },
  { href: "/lms/student/announcements" as Route, label: "공지", icon: Megaphone },
  { href: "/lms/student/consulting" as Route, label: "컨설팅", icon: MessageSquare },
  { href: "/lms/student/certificates" as Route, label: "수료증", icon: GraduationCap },
];

const navByRole: Record<LmsRole, NavItem[]> = {
  super_admin: adminNav,
  instructor: instructorNav,
  student: studentNav,
};

export function LmsSidebar({ role }: { role: LmsRole }) {
  const pathname = usePathname();
  const items = navByRole[role];

  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--background)]">
      <div className="px-6 py-5 border-b border-[var(--border)]">
        <Link
          href={"/lms" as Route}
          className="block text-base font-bold tracking-tight text-[var(--foreground)]"
        >
          Growth Career LMS
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
