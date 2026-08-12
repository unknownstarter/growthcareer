import type { Metadata } from "next";
import { fetchCommunityPosts } from "@/src/programs/fan-to-pro/application/queries/lms/fetch-community";
import { CommunityListView } from "@/src/programs/fan-to-pro/interface/components/lms/community/community-list-view";

export const metadata: Metadata = {
  title: "커뮤니티 - Fan to Pro",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

/**
 * /[locale]/fan-to-pro/[cohortSlug]/student/community — 커뮤니티 글 목록.
 *
 * 스코프 B (program 통합) — 진입 cohort 무관 같은 데이터. RLS 가 가시성 필터.
 * 가드는 상위 student/layout.tsx (role=student) 에서 처리.
 */
export default async function StudentCommunityPage({
  params,
}: {
  params: Promise<{ locale: string; cohortSlug: string }>;
}) {
  const { locale, cohortSlug } = await params;
  const base = `/${locale}/fan-to-pro/${cohortSlug}/student/community`;
  const result = await fetchCommunityPosts();
  return <CommunityListView result={result} base={base} />;
}
