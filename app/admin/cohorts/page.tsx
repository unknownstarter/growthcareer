import type { Metadata } from "next";
import Link from "next/link";
import { assertAdmin } from "@/src/programs/fan-to-pro/infrastructure/auth/admin-role";
import { fetchActiveCohorts } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/cohort-repository";
import { fetchCohortRoster } from "@/src/programs/fan-to-pro/application/queries/cohort/fetch-cohort-roster";
import { CohortsDashboard } from "@/src/programs/fan-to-pro/interface/components/lms/admin/cohorts-dashboard";

export const metadata: Metadata = {
  title: "기수 - Growth Career Admin",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

/**
 * /admin/cohorts — LMS Wave 0 운영자 페이지.
 *
 * 라이트 톤 (data-theme="light" wrapper) + shadcn primitives + 토스 스타일.
 * Admin only — viewer 차단 (assertAdmin).
 *
 * Wave 0 = 단일 cohort (1기) 가정. cohort 가 여러 개면 가장 최근 active 표시.
 * 마이그레이션 미적용 시 placeholder 안내.
 */
export default async function AdminCohortsPage() {
  // viewer 차단 + LMS 페이지는 mutation 표면이라 admin 자격 1차 검증.
  await assertAdmin();

  let activeCohorts: Awaited<ReturnType<typeof fetchActiveCohorts>> = [];
  let bootstrapError: string | null = null;
  try {
    activeCohorts = await fetchActiveCohorts();
  } catch (err) {
    bootstrapError = err instanceof Error ? err.message : "unknown";
  }

  if (bootstrapError) {
    return (
      <main data-theme="light" className="min-h-screen bg-[var(--background)]">
        <BackToAdminBar />
        <BootstrapErrorState message={bootstrapError} />
      </main>
    );
  }

  if (activeCohorts.length === 0) {
    return (
      <main data-theme="light" className="min-h-screen bg-[var(--background)]">
        <BackToAdminBar />
        <EmptyState />
      </main>
    );
  }

  const cohort = activeCohorts[0];
  const rosterResult = await fetchCohortRoster(cohort.id);
  if (rosterResult.status === "error") {
    return (
      <main data-theme="light" className="min-h-screen bg-[var(--background)]">
        <BackToAdminBar />
        <BootstrapErrorState message={rosterResult.error} />
      </main>
    );
  }

  return (
    <main data-theme="light" className="min-h-screen bg-[var(--background)]">
      <BackToAdminBar />
      <CohortsDashboard roster={rosterResult.data} />
    </main>
  );
}

/* ─────────────────── Sub views ─────────────────── */

/**
 * 기존 다크 admin 으로 돌아갈 1줄 nav. LMS 라이트 페이지에서 기존 3-tab 으로
 * 이동하는 단일 link. 기존 AdminNav 컴포넌트는 다크 톤이라 직접 사용 X.
 */
function BackToAdminBar() {
  return (
    <div
      className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur"
      data-theme="light"
    >
      <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3">
        <span className="text-sm font-bold text-[var(--foreground)]">
          기수 관리 (LMS)
        </span>
        <span className="text-xs text-[var(--muted-foreground)]">/</span>
        <Link
          href="/admin/applicants"
          className="text-xs font-semibold text-[var(--primary)] hover:underline"
        >
          ← 신청자 / 강사 / 재무로
        </Link>
        <div className="flex-1" />
        <a
          href="/admin/logout"
          className="text-xs font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          로그아웃
        </a>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto max-w-[800px] p-12 text-center">
      <h1 className="text-2xl font-bold text-[var(--foreground)]">
        활성 기수가 없습니다
      </h1>
      <p className="mt-3 text-sm text-[var(--muted-foreground)]">
        LMS Wave 0 마이그레이션이 아직 적용되지 않았거나, 1기 cohort row 가
        생성되지 않았습니다. <code className="rounded bg-[var(--secondary)] px-1.5 py-0.5">supabase db push</code>
        {" "}또는 Dashboard SQL editor 에서 마이그레이션을 적용하세요.
      </p>
      <p className="mt-4 text-xs text-[var(--muted-foreground)]">
        파일: <code>supabase/migrations/20260621000000_lms_wave0_schema.sql</code>
      </p>
    </div>
  );
}

function BootstrapErrorState({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-[800px] p-12 text-center">
      <h1 className="text-2xl font-bold text-[var(--destructive)]">
        데이터를 불러올 수 없습니다
      </h1>
      <p className="mt-3 text-sm text-[var(--muted-foreground)]">
        Supabase 연결 또는 테이블 접근 오류:
      </p>
      <pre className="mt-3 inline-block rounded-md bg-[var(--secondary)] px-3 py-2 text-left text-xs text-[var(--foreground)]">
        {message}
      </pre>
    </div>
  );
}
