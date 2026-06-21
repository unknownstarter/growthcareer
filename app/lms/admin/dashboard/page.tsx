import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import {
  Calendar,
  Users,
  MessageSquare,
  Wallet,
  ArrowRight,
  Layers,
  Megaphone,
} from "lucide-react";
import {
  assertLmsRole,
} from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/card";
import { DashboardKpiCard } from "@/src/programs/fan-to-pro/interface/components/lms/admin/dashboard-kpi-card";

export const metadata: Metadata = {
  title: "운영자 대시보드 - Growth Career LMS",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

/**
 * /lms/admin/dashboard — Wave 1 Step 1 의 첫 페이지.
 *
 * 토스풍 KPI 골격. 실제 데이터 wire 는 Step 2~4 에서.
 * 운영자가 로그인 직후 한눈에 보는 입구.
 */
export default async function LmsAdminDashboardPage() {
  const user = await assertLmsRole("super_admin");
  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <div className="px-6 py-8 md:px-10 md:py-10 max-w-7xl mx-auto space-y-8">
      {/* 인사 */}
      <header className="space-y-1">
        <h1 className="text-[1.75rem] font-bold tracking-tight text-[var(--foreground)]">
          안녕하세요, {user.displayName} 님
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">{today}</p>
      </header>

      {/* KPI 4종 */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardKpiCard
          label="진행 중인 기수"
          value="1기"
          hint="2026-06-27 ~ 07-19"
          icon={Calendar}
        />
        <DashboardKpiCard
          label="등록 학생"
          value="-"
          hint="Step 2 에서 wire"
          icon={Users}
        />
        <DashboardKpiCard
          label="컨설팅 현황"
          value="-"
          hint="대기 / 검토중 / 완료"
          icon={MessageSquare}
        />
        <DashboardKpiCard
          label="이번 달 정산"
          value="-"
          hint="회사 단위 합계"
          icon={Wallet}
        />
      </section>

      {/* 빠른 작업 */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-[var(--foreground)]">
          빠른 작업
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <QuickActionCard
            href={"/lms/admin/cohorts" as Route}
            icon={Layers}
            label="기수 보기"
            desc="현재 1기 + sessions 8회차"
          />
          <QuickActionCard
            href={"/lms/admin/students" as Route}
            icon={Users}
            label="학생 보기"
            desc="결제 완료 학생 명단"
          />
          <QuickActionCard
            href={"/lms/admin/announcements" as Route}
            icon={Megaphone}
            label="공지 작성"
            desc="cohort 단위 공지 발송"
          />
        </div>
      </section>

      {/* 최근 활동 placeholder */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle>최근 활동</CardTitle>
            <CardDescription>
              학생 출결, 제출물, 컨설팅 등 최근 7일 활동이 표시됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="py-12 text-center text-sm text-[var(--muted-foreground)]">
              활동 데이터는 Wave 1 Step 2~4 에서 연결됩니다.
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function QuickActionCard({
  href,
  icon: Icon,
  label,
  desc,
}: {
  href: Route;
  icon: typeof Layers;
  label: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm hover:border-[var(--primary)]/40 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-[var(--primary)]" />
            <p className="text-sm font-semibold text-[var(--foreground)]">
              {label}
            </p>
          </div>
          <p className="text-xs text-[var(--muted-foreground)]">{desc}</p>
        </div>
        <ArrowRight className="h-4 w-4 text-[var(--muted-foreground)] group-hover:text-[var(--primary)] transition-colors" />
      </div>
    </Link>
  );
}
