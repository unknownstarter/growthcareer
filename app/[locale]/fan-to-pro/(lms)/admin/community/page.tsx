import type { Metadata } from "next";
import { fetchCommunityPosts } from "@/src/programs/fan-to-pro/application/queries/lms/fetch-community";
import { CommunityListView } from "@/src/programs/fan-to-pro/interface/components/lms/community/community-list-view";

export const metadata: Metadata = {
  title: "커뮤니티 - Fan to Pro",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

/**
 * /[locale]/fan-to-pro/admin/community — 커뮤니티 글 목록 (운영자).
 *
 * 스코프 B (program 통합) — student/instructor 와 같은 데이터.
 * 가드는 상위 admin/layout.tsx (super_admin 또는 program admin) 에서 처리.
 * super_admin/admin 은 canModerate=true → 상세에서 고정/숨기기 노출.
 */
export default async function AdminCommunityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const base = `/${locale}/fan-to-pro/admin/community`;
  const result = await fetchCommunityPosts();
  return <CommunityListView result={result} base={base} />;
}
