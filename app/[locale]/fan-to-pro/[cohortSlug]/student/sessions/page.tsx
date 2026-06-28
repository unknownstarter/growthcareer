import type { Metadata } from "next";
import {
  PageContainer,
  PageHeader,
} from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-header";
import { ComingSoon } from "@/src/programs/fan-to-pro/interface/components/lms/ui/coming-soon";

export const metadata: Metadata = {
  title: "수업 - Fan to Pro",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default function StudentSessionsPage() {
  return (
    <PageContainer>
      <PageHeader title="수업" description="회차별 강의 일정과 진행 상태." />
      <ComingSoon
        title="회차 정보 준비 중"
        description="회차별 일정, 강사, 출결 정보를 곧 이 페이지에서 확인할 수 있어요."
      />
    </PageContainer>
  );
}
