"use client";

/**
 * Cohort Tabs Nav for /admin/cohorts/[cohortSlug]/*
 *
 * Tabs: 개요 / 출결 / 학생 / 공지 / 자료. cohortSlug 는 path 에서 자동 추출.
 * active 판정: pathname 이 정확히 base 이면 개요, sub segment 로 매칭.
 */
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import type { Route } from "next";
import {
  LayoutDashboard,
  ClipboardCheck,
  Users,
  Megaphone,
  FileText,
} from "lucide-react";
import { cn } from "@/src/programs/fan-to-pro/interface/components/lms/lib/utils";

type TabItem = {
  slug: string;
  label: string;
  icon: typeof LayoutDashboard;
};

const TABS: TabItem[] = [
  { slug: "", label: "개요", icon: LayoutDashboard },
  { slug: "attendance", label: "출결", icon: ClipboardCheck },
  { slug: "students", label: "학생", icon: Users },
  { slug: "announcements", label: "공지", icon: Megaphone },
  { slug: "materials", label: "자료", icon: FileText },
];

export function CohortTabsNav({ cohortSlug }: { cohortSlug: string }) {
  const pathname = usePathname();
  const params = useParams();
  const locale = (params?.locale as string) ?? "ko";
  const base = `/${locale}/fan-to-pro/admin/cohorts/${cohortSlug}`;

  // active tab 결정
  //   pathname === base            -> 개요
  //   pathname === base/<slug>     -> 해당 tab
  //   pathname startsWith base/<slug>/ -> 해당 tab
  const rest = pathname.startsWith(base) ? pathname.slice(base.length) : "";
  const firstSeg = rest.startsWith("/") ? rest.slice(1).split("/")[0] : "";

  return (
    <div
      role="tablist"
      aria-label="기수 상세 탭"
      className="mb-6 flex flex-wrap items-center gap-1 border-b border-[var(--border)]"
    >
      {TABS.map((tab) => {
        const href = tab.slug === "" ? base : `${base}/${tab.slug}`;
        const active = firstSeg === tab.slug;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.slug || "overview"}
            href={href as Route}
            role="tab"
            aria-selected={active}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium",
              "transition-colors duration-150 border-b-2 -mb-px",
              active
                ? "border-[var(--primary)] text-[var(--primary)]"
                : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
