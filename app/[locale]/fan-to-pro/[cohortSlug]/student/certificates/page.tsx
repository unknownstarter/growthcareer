import type { Metadata } from "next";
import {
  PageContainer,
  PageHeader,
} from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-header";
import { ComingSoon } from "@/src/programs/fan-to-pro/interface/components/lms/ui/coming-soon";

export const metadata: Metadata = {
  title: "수료증 - Fan to Pro",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default function StudentCertificatesPage() {
  return (
    <PageContainer>
      <PageHeader
        title="수료증"
        description="과정 수료 후 발급되는 수료증과 참여 확인서."
      />
      <ComingSoon
        title="수료증 발급 준비 중"
        description="4주 과정 수료 후 Dropdown 수료증과 공연 참여 확인서 (해당자) 가 이 페이지에 표시돼요."
      />
    </PageContainer>
  );
}
