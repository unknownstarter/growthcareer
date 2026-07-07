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
import { assertProgramAdmin } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/card";
import { DashboardKpiCard } from "@/src/programs/fan-to-pro/interface/components/lms/admin/dashboard-kpi-card";
import { PageGuideBot } from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-guide-bot";
import { PAGE_GUIDES } from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-guides";
import { fetchActiveCohorts } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/cohort-repository";
import { fetchStudentsByCohort } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-repository";
import { fetchAllConsultations } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/consultation-repository";
import { fetchFinanceKpi } from "@/src/programs/fan-to-pro/application/finance-actions";

export const metadata: Metadata = {
  title: "운영자 대시보드 - Fan to Pro",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default async function FanToProAdminDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await assertProgramAdmin("fan-to-pro");
  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
  const base = `/${locale}/fan-to-pro/admin`;

  // KPI 데이터 fetch (실 데이터 연결)
  const activeCohorts = await fetchActiveCohorts().catch(() => []);
  const currentCohort = activeCohorts[0] ?? null;

  const [students, consultations, financeKpi] = await Promise.all([
    currentCohort ? fetchStudentsByCohort(currentCohort.id).catch(() => []) : Promise.resolve([]),
    fetchAllConsultations().catch(() => []),
    fetchFinanceKpi().catch(() => ({ status: "error" as const, error: "fetchFailed" })),
  ]);

  // 컨설팅 상태별 카운트
  const consultationSubmitted = consultations.filter((c) => c.status === "submitted").length;
  const consultationReviewed = consultations.filter((c) => c.status === "reviewed").length;
  const consultationClosed = consultations.filter((c) => c.status === "closed").length;

  // 정산 (강사료 지급 합계)
  const payoutTotalKrw =
    financeKpi.status === "ok" ? financeKpi.kpi.instructorPayouts.totalKrw : 0;
  const payoutFormatted = payoutTotalKrw > 0
    ? `${payoutTotalKrw.toLocaleString("ko-KR")}원`
    : "0원";

  // 진행 중인 기수
  const cohortLabel = currentCohort
    ? `${currentCohort.slug ?? "1기"}`
    : "없음";
  const cohortDateRange = currentCohort
    ? `${currentCohort.starts_on ?? ""} 부터 ${currentCohort.ends_on ?? ""} 까지`
    : "활성 기수 없음";

  return (
    <div className="px-6 py-8 md:px-10 md:py-10 max-w-7xl mx-auto space-y-8">
      <PageGuideBot {...PAGE_GUIDES.dashboard} />
      <header className="space-y-1">
        <h1 className="text-[1.75rem] font-bold tracking-tight text-[var(--foreground)]">
          안녕하세요, {user.displayName} 님
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">{today}</p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardKpiCard
          label="진행 중인 기수"
          value={cohortLabel}
          hint={cohortDateRange}
          icon={Calendar}
        />
        <DashboardKpiCard
          label="등록 학생"
          value={`${students.length}명`}
          hint={currentCohort ? "현재 기수 활성 학생" : "활성 기수 없음"}
          icon={Users}
        />
        <DashboardKpiCard
          label="컨설팅 현황"
          value={`${consultationSubmitted} / ${consultationReviewed} / ${consultationClosed}`}
          hint="제출 / 검토 / 종료"
          icon={MessageSquare}
        />
        <DashboardKpiCard
          label="누적 강사료 지급"
          value={payoutFormatted}
          hint="회사 단위 합계"
          icon={Wallet}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-[var(--foreground)]">
          빠른 작업
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <QuickActionCard
            href={`${base}/cohorts` as Route}
            icon={Layers}
            label="기수 보기"
            desc="현재 1기 + sessions 8회차"
          />
          <QuickActionCard
            href={`${base}/students` as Route}
            icon={Users}
            label="학생 보기"
            desc="결제 완료 학생 명단"
          />
          <QuickActionCard
            href={`${base}/announcements` as Route}
            icon={Megaphone}
            label="공지 작성"
            desc="cohort 단위 공지 발송"
          />
        </div>
      </section>

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
              현재 활동 피드는 준비 중입니다. 각 세부 페이지에서 상세 데이터를 확인하세요.
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
