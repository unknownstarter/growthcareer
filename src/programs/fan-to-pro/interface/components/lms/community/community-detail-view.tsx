/**
 * 커뮤니티 상세 뷰 (server component). student / instructor 페이지가 공유.
 *
 * fetchCommunityPost() 결과 (notFound 는 페이지에서 notFound() 처리) 를 받아
 * 뒤로 가기 링크 + 본문 상세 + 댓글 렌더.
 */
import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft } from "lucide-react";
import { PageContainer } from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-header";
import { CommunityPostDetail } from "./community-post-detail";
import { CommunityComments } from "./community-comments";
import type {
  CommunityPostView,
  CommunityCommentView,
} from "@/src/programs/fan-to-pro/application/queries/lms/fetch-community";

export function CommunityDetailView({
  post,
  comments,
  canModerate,
  meName,
  base,
}: {
  post: CommunityPostView;
  comments: CommunityCommentView[];
  canModerate: boolean;
  /** 낙관적 댓글 렌더용 본인 표시명. */
  meName: string;
  /** 커뮤니티 목록 base 경로. */
  base: string;
}) {
  return (
    <PageContainer>
      <div className="mx-auto max-w-3xl">
        <Link
          href={base as Route}
          className="inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] transition-colors duration-150 hover:text-[var(--foreground)]"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          목록으로
        </Link>

        <div className="mt-4">
          <CommunityPostDetail
            post={post}
            canModerate={canModerate}
            listHref={base}
          />
          <CommunityComments
            postId={post.id}
            comments={comments}
            meName={meName}
          />
        </div>
      </div>
    </PageContainer>
  );
}
