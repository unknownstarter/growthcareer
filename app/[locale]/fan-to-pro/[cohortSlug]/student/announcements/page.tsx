import type { Metadata } from "next";
import {
  PageContainer,
  PageHeader,
} from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-header";
import { ComingSoon } from "@/src/programs/fan-to-pro/interface/components/lms/ui/coming-soon";

export const metadata: Metadata = {
  title: "공지 - Fan to Pro",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default function StudentAnnouncementsPage() {
  return (
    <PageContainer>
      <PageHeader title="공지" description="기수 운영진의 공지사항." />
      <ComingSoon
        title="공지 준비 중"
        description="운영진의 공지사항을 곧 이 페이지에서 확인할 수 있어요. 그 전엔 카카오 오픈채팅으로 안내드려요."
      />
    </PageContainer>
  );
}
