import type { Metadata } from "next";
import {
  fetchInstructors,
  fetchInstructorPayouts,
} from "@/src/programs/fan-to-pro/admin/fetch-instructors";
import { fetchEnrolledCount } from "@/src/programs/fan-to-pro/admin/fetch-enrolled-count";
import { AdminNav } from "@/src/programs/fan-to-pro/admin/components/admin-nav";
import { InstructorsDashboard } from "@/src/programs/fan-to-pro/admin/components/instructors-dashboard";
import { assertAdmin } from "@/src/programs/fan-to-pro/admin/role";

export const metadata: Metadata = {
  title: "강사 - Growth Career Admin",
  robots: { index: false, follow: false, nocache: true },
};

// 운영자 페이지는 항상 최신 데이터 + PII 디바이스 캐시 차단.
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function AdminInstructorsPage() {
  // middleware 의 path 차단과 별개로 page 단위 fail-closed. matcher 변경 회귀 방지.
  await assertAdmin();
  const [instructorsResult, payoutsResult, enrolledResult] = await Promise.all([
    fetchInstructors(),
    fetchInstructorPayouts(),
    fetchEnrolledCount(),
  ]);

  const error =
    instructorsResult.error ?? payoutsResult.error ?? enrolledResult.error;

  return (
    <>
      <AdminNav current="instructors" />
      <InstructorsDashboard
        initialInstructors={instructorsResult.rows}
        initialPayouts={payoutsResult.rows}
        enrolledCount={enrolledResult.count}
        supabaseAvailable={instructorsResult.supabaseAvailable}
        fetchError={error}
      />
    </>
  );
}
