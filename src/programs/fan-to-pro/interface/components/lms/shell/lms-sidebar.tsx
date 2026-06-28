"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
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
  Sparkles,
  Briefcase,
  User,
  ClipboardCheck,
} from "lucide-react";
import { cn } from "@/src/programs/fan-to-pro/interface/components/lms/lib/utils";
import type { LmsRole } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
};

/**
 * LMS sidebar — ADR 0008 §1 의 새 URL 구조 (program slug 포함).
 *
 * admin 메뉴: /[locale]/fan-to-pro/admin/...
 * instructor / student: /[locale]/fan-to-pro/<cohortSlug>/instructor|student/...
 *   (cohortSlug 는 path 의 4번째 segment 에서 추출)
 */
function adminItems(locale: string): NavItem[] {
  const base = `/${locale}/fan-to-pro/admin`;
  return [
    { href: `${base}/dashboard`, label: "대시보드", icon: LayoutDashboard },
    { href: `${base}/cohorts`, label: "기수", icon: Layers },
    { href: `${base}/attendance`, label: "출결", icon: ClipboardCheck },
    { href: `${base}/talent-pool`, label: "인재풀", icon: Sparkles },
    { href: `${base}/students`, label: "학생", icon: Users },
    { href: `${base}/instructors`, label: "강사", icon: GraduationCap },
    { href: `${base}/companies`, label: "회사", icon: Building2 },
    { href: `${base}/finance`, label: "정산", icon: Wallet },
    { href: `${base}/materials`, label: "자료", icon: FileText },
    { href: `${base}/announcements`, label: "공지", icon: Megaphone },
    { href: `${base}/consultations`, label: "컨설팅", icon: MessageSquare },
  ];
}

function instructorItems(locale: string, cohortSlug: string): NavItem[] {
  const base = `/${locale}/fan-to-pro/${cohortSlug}/instructor`;
  return [
    { href: `${base}/dashboard`, label: "대시보드", icon: LayoutDashboard },
    { href: `${base}/students`, label: "학생", icon: Users },
    { href: `${base}/sessions`, label: "세션", icon: Layers },
    { href: `${base}/consultations`, label: "컨설팅", icon: MessageSquare },
  ];
}

function studentItems(locale: string, cohortSlug: string): NavItem[] {
  const base = `/${locale}/fan-to-pro/${cohortSlug}/student`;
  return [
    { href: `${base}/dashboard`, label: "대시보드", icon: LayoutDashboard },
    { href: `${base}/sessions`, label: "수업", icon: Layers },
    { href: `${base}/assignments`, label: "과제", icon: FileText },
    { href: `${base}/materials`, label: "자료", icon: FileText },
    { href: `${base}/announcements`, label: "공지", icon: Megaphone },
    { href: `${base}/consulting`, label: "컨설팅", icon: MessageSquare },
    { href: `${base}/career`, label: "커리어 문서", icon: Briefcase },
    { href: `${base}/profile`, label: "내 프로필", icon: User },
    { href: `${base}/certificates`, label: "수료증", icon: GraduationCap },
  ];
}

export function LmsSidebar({ role }: { role: LmsRole }) {
  const pathname = usePathname();
  const params = useParams();
  const locale = (params?.locale as string) ?? "ko";
  // cohortSlug = /[locale]/fan-to-pro/<slug>/... 의 3번째 segment.
  // path 가 admin 이면 cohortSlug 자리에 'admin' — instructor/student items 안 사용.
  const segs = pathname.split("/").filter(Boolean);
  const cohortSlug = segs[2] && segs[2] !== "admin" ? segs[2] : "";

  let items: NavItem[];
  if (role === "super_admin") {
    items = adminItems(locale);
  } else if (role === "instructor") {
    items = cohortSlug ? instructorItems(locale, cohortSlug) : [];
  } else {
    items = cohortSlug ? studentItems(locale, cohortSlug) : [];
  }

  const homeHref = `/${locale}/fan-to-pro/admin/dashboard`;

  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col h-screen border-r border-[var(--border)] bg-[var(--background)]">
      <div className="px-6 py-5 border-b border-[var(--border)]">
        <Link
          href={homeHref as Route}
          className="block text-base font-bold tracking-tight text-[var(--foreground)]"
        >
          Fan to Pro
        </Link>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
          Growth Career
        </p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href as Route}
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
