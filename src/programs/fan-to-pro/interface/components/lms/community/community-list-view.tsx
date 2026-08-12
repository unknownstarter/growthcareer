/**
 * 커뮤니티 목록 뷰 (server component). student / instructor 페이지가 공유.
 *
 * fetchCommunityPosts() 결과를 받아 헤더 + 글쓰기 CTA + 목록 or 빈 상태 렌더.
 * 스코프 B (program 통합) 라 surface 무관 내용 동일 — base 경로만 주입.
 */
import { MessagesSquare } from "lucide-react";
import {
  PageContainer,
  PageHeader,
} from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-header";
import { Button } from "@/src/programs/fan-to-pro/interface/components/lms/ui/button";
import { CommunityPostList } from "./community-post-list";
import { CommunityWriteForm } from "./community-write-form";
import type { CommunityListResult } from "@/src/programs/fan-to-pro/application/queries/lms/fetch-community";

export function CommunityListView({
  result,
  base,
}: {
  result: CommunityListResult;
  /** 커뮤니티 base 경로 (예: /ko/fan-to-pro/<slug>/student/community). */
  base: string;
}) {
  if (result.status === "error") {
    return (
      <PageContainer>
        <PageHeader title="커뮤니티" />
        <div className="rounded-[var(--radius)] border border-dashed border-[var(--border)] bg-[var(--card)] p-12 text-center">
          <h3 className="text-base font-semibold text-[var(--foreground)]">
            커뮤니티를 불러오지 못했어요
          </h3>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            잠시 후 다시 시도해주세요.
          </p>
        </div>
      </PageContainer>
    );
  }

  const { posts } = result;

  return (
    <PageContainer>
      <PageHeader
        title="커뮤니티"
        description="같은 기수 동료들과 자유롭게 이야기 나누는 공간."
        action={<CommunityWriteForm mode="create" detailBase={base} />}
      />

      {posts.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] bg-[var(--card)] p-12 text-center motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-500">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
            <MessagesSquare className="h-6 w-6" aria-hidden />
          </div>
          <h3 className="text-base font-semibold text-[var(--foreground)]">
            아직 글이 없어요
          </h3>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            첫 글을 남겨보세요. 소소한 근황도 좋고, 궁금한 점도 좋아요.
          </p>
          <div className="mt-5 flex justify-center">
            <CommunityWriteForm
              mode="create"
              detailBase={base}
              trigger={<Button className="h-11 px-6">첫 글 쓰기</Button>}
            />
          </div>
        </div>
      ) : (
        <CommunityPostList posts={posts} detailBase={base} />
      )}
    </PageContainer>
  );
}
