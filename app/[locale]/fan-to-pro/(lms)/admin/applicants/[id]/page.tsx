import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { assertProgramAdmin } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import {
  fetchApplicantById,
  fetchCashReceipts,
  fetchMessagesForApplicant,
} from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/applicant-repository";
import { fetchAllCohorts } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/cohort-repository";
import { fetchStudentByApplicantId } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-repository";
import { ApplicantDetail } from "@/src/programs/fan-to-pro/interface/components/lms/admin/applicant-detail";
import {
  PageContainer,
  PageHeader,
} from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-header";

export const metadata: Metadata = {
  title: "신청자 상세 - Fan to Pro",
  robots: { index: false, follow: false, nocache: true },
};

// 실시간 PII / 결제 / 메시지 audit. 캐시 금지.
export const dynamic = "force-dynamic";

/**
 * /[locale]/fan-to-pro/admin/applicants/[id] - 신청자 단일 detail (B0051).
 *
 * 인재풀 (talent-pool) 의 이름 클릭 → 본 페이지.
 * 운영자가 한 화면에서 신청자 상태 변경 / 메시지 발송 / 영수증 / paid promote /
 * PII 파기 수행. Basic Auth `/admin/applicants` 의 inline modal 패턴과 별개로
 * LMS surface 의 dedicated detail.
 *
 * 권한: assertProgramAdmin('fan-to-pro') (program admin 또는 super_admin).
 */
export default async function FanToProAdminApplicantDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  await assertProgramAdmin("fan-to-pro");

  const applicant = await fetchApplicantById(id);
  if (!applicant) notFound();

  const [cohorts, receiptsResult, messagesResult, existingStudent] =
    await Promise.all([
      fetchAllCohorts().catch(() => []),
      fetchCashReceipts(id),
      fetchMessagesForApplicant(id),
      fetchStudentByApplicantId(id).catch(() => null),
    ]);

  return (
    <PageContainer>
      <div className="mb-2">
        <Link
          href={`/${locale}/fan-to-pro/admin/talent-pool` as Route}
          className="inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <ChevronLeft className="h-4 w-4" />
          인재풀로
        </Link>
      </div>
      <PageHeader
        title={applicant.name}
        description={`신청일 ${formatKstDate(applicant.createdAt)} / ${applicant.email}`}
      />

      <ApplicantDetail
        applicant={applicant}
        cohorts={cohorts.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug ?? null,
        }))}
        receipts={
          receiptsResult.error ? [] : receiptsResult.rows
        }
        messages={
          messagesResult.error ? [] : messagesResult.rows
        }
        alreadyPromoted={Boolean(existingStudent)}
        promotedStudentId={existingStudent?.id ?? null}
        locale={locale}
      />
    </PageContainer>
  );
}

function formatKstDate(iso: string): string {
  if (!iso) return "-";
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
