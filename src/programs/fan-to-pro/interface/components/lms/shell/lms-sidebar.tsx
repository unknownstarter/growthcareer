"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import type { Route } from "next";
import {
  LayoutDashboard,
  Layers,
  GraduationCap,
  Building2,
  Wallet,
  Megaphone,
  MessageSquare,
  MessagesSquare,
  Sparkles,
  Briefcase,
  User,
  BookOpen,
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
  // 다중 cohort 대응 (2026-07-19): 출결 / 학생 / 공지 / 자료 는 기수 상세 안 탭.
  // 사이드바에서 제거하고 [기수] 로 진입 → cohort 선택 → 서브 탭.
  return [
    { href: `${base}/dashboard`, label: "대시보드", icon: LayoutDashboard },
    { href: `${base}/cohorts`, label: "기수", icon: Layers },
    { href: `${base}/talent-pool`, label: "인재풀", icon: Sparkles },
    { href: `${base}/instructors`, label: "강사", icon: GraduationCap },
    { href: `${base}/companies`, label: "회사", icon: Building2 },
    { href: `${base}/finance`, label: "재무", icon: Wallet },
    { href: `${base}/consultations`, label: "컨설팅", icon: MessageSquare },
  ];
}

function instructorItems(locale: string, cohortSlug: string): NavItem[] {
  const base = `/${locale}/fan-to-pro/${cohortSlug}/instructor`;
  // 강사 surface 는 현재 커뮤니티만 구현 (B0070). 대시보드 등은 후속.
  return [
    { href: `${base}/community`, label: "커뮤니티", icon: MessagesSquare },
  ];
}

function studentItems(locale: string, cohortSlug: string): NavItem[] {
  const base = `/${locale}/fan-to-pro/${cohortSlug}/student`;
  // assignments / consulting 은 운영 미정 — 제외. 나머지는 placeholder 페이지로
  // 노아 룰: sessions / announcements / certificates 는 "준비 중" 안내라도 보임.
  return [
    { href: `${base}/dashboard`, label: "대시보드", icon: LayoutDashboard },
    { href: `${base}/sessions`, label: "수업", icon: Layers },
    { href: `${base}/materials`, label: "수업 자료", icon: BookOpen },
    { href: `${base}/announcements`, label: "공지", icon: Megaphone },
    { href: `${base}/community`, label: "커뮤니티", icon: MessagesSquare },
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
      <div className="h-16 shrink-0 flex flex-col justify-center px-6 border-b border-[var(--border)]">
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
        {items.length === 0 ? (
          <div className="mx-1 mt-2 rounded-[var(--radius-sm)] border border-dashed border-[var(--border)] px-4 py-6 text-center">
            <p className="text-sm font-semibold text-[var(--foreground)]">
              페이지 준비 중
            </p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)] leading-relaxed">
              강사 화면은 준비 중입니다. 담당자에게 문의하세요.
            </p>
          </div>
        ) : (
          items.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href as Route}
                className={cn(
                  "flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-sm font-medium transition-colors duration-150",
                  active
                    ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                    : "text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]",
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })
        )}
      </nav>
    </aside>
  );
}
