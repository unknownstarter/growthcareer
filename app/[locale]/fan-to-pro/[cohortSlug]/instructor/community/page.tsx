import type { Metadata } from "next";
import { fetchCommunityPosts } from "@/src/programs/fan-to-pro/application/queries/lms/fetch-community";
import { CommunityListView } from "@/src/programs/fan-to-pro/interface/components/lms/community/community-list-view";

export const metadata: Metadata = {
  title: "커뮤니티 - Fan to Pro",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

/**
 * /[locale]/fan-to-pro/[cohortSlug]/instructor/community — 커뮤니티 글 목록 (강사).
 *
 * 스코프 B (program 통합) — 학생 surface 와 동일 데이터/컴포넌트, shell 만 강사.
 * 가드는 상위 instructor/layout.tsx (role=instructor) 에서 처리.
 */
export default async function InstructorCommunityPage({
  params,
}: {
  params: Promise<{ locale: string; cohortSlug: string }>;
}) {
  const { locale, cohortSlug } = await params;
  const base = `/${locale}/fan-to-pro/${cohortSlug}/instructor/community`;
  const result = await fetchCommunityPosts();
  return <CommunityListView result={result} base={base} />;
}
