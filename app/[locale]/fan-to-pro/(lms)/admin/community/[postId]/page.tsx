import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLmsUser } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { fetchCommunityPost } from "@/src/programs/fan-to-pro/application/queries/lms/fetch-community";
import { CommunityDetailView } from "@/src/programs/fan-to-pro/interface/components/lms/community/community-detail-view";

export const metadata: Metadata = {
  title: "커뮤니티 - Fan to Pro",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

/**
 * /[locale]/fan-to-pro/admin/community/[postId] — 글 상세 + 댓글 (운영자).
 *
 * RLS 통과 못 하거나 hidden 글이면 fetch 가 notFound → notFound() 로 404.
 * super_admin/admin 은 canModerate=true → 고정/숨기기 버튼 노출.
 */
export default async function AdminCommunityDetailPage({
  params,
}: {
  params: Promise<{ locale: string; postId: string }>;
}) {
  const { locale, postId } = await params;
  const base = `/${locale}/fan-to-pro/admin/community`;

  const [result, me] = await Promise.all([
    fetchCommunityPost(postId),
    getLmsUser(),
  ]);

  if (result.status === "error") {
    if (result.error === "notFound") notFound();
    return <CommunityDetailErrorFallback base={base} />;
  }

  return (
    <CommunityDetailView
      post={result.post}
      comments={result.comments}
      canModerate={result.canModerate}
      meName={me?.displayName ?? "나"}
      base={base}
    />
  );
}

function CommunityDetailErrorFallback({ base }: { base: string }) {
  return (
    <div className="px-6 py-12 md:px-10 md:py-16 max-w-3xl mx-auto text-center motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-500">
      <h1 className="text-lg font-bold text-[var(--foreground)]">
        글을 불러오지 못했어요
      </h1>
      <p className="mt-2 text-sm text-[var(--muted-foreground)]">
        잠시 후 다시 시도해주세요.
      </p>
      <a
        href={base}
        className="mt-6 inline-flex text-sm font-semibold text-[var(--primary)] hover:underline"
      >
        목록으로 돌아가기
      </a>
    </div>
  );
}
