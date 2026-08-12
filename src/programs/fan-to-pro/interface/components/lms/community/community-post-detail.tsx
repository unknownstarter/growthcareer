"use client";

/**
 * 커뮤니티 글 상세 (client) — 본문 + 작성자 + 액션 (본인: 수정/삭제, 모더레이터: 고정/숨기기).
 *
 * body/title 은 whitespace-pre-wrap + React 기본 escape 로만 렌더 (§Sage, dangerouslySetInnerHTML 금지).
 * 삭제/숨기기 성공 시 목록으로 이동, 고정 토글/수정은 router.refresh().
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Pin, PinOff, EyeOff, Trash2 } from "lucide-react";
import { Badge } from "@/src/programs/fan-to-pro/interface/components/lms/ui/badge";
import { Button } from "@/src/programs/fan-to-pro/interface/components/lms/ui/button";
import { CommunityWriteForm } from "./community-write-form";
import { AuthorBadges } from "./author-meta";
import { formatDateTime } from "./format-time";
import { communityErrorMessage } from "./community-post-actions";
import {
  softDeletePostAction,
} from "@/src/programs/fan-to-pro/interface/server-actions/student/lms-community-actions";
import {
  pinPostAction,
  adminHidePostAction,
} from "@/src/programs/fan-to-pro/interface/server-actions/admin/lms-community-moderation-actions";
import type { CommunityPostView } from "@/src/programs/fan-to-pro/application/queries/lms/fetch-community";

export function CommunityPostDetail({
  post,
  canModerate,
  listHref,
}: {
  post: CommunityPostView;
  canModerate: boolean;
  /** 삭제/숨기기 후 이동할 목록 경로. */
  listHref: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function onDelete() {
    if (!window.confirm("이 글을 삭제할까요? 되돌릴 수 없어요")) return;
    setError(null);
    startTransition(async () => {
      const result = await softDeletePostAction({ postId: post.id });
      if (result.status === "error") {
        setError(communityErrorMessage(result.error));
        return;
      }
      router.push(listHref as Route);
    });
  }

  function onTogglePin() {
    setError(null);
    startTransition(async () => {
      const result = await pinPostAction({
        postId: post.id,
        pinned: !post.pinned,
      });
      if (result.status === "error") {
        setError(communityErrorMessage(result.error));
        return;
      }
      router.refresh();
    });
  }

  function onHide() {
    if (!window.confirm("이 글을 숨길까요? 학생에게 더 이상 보이지 않아요")) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await adminHidePostAction({ postId: post.id });
      if (result.status === "error") {
        setError(communityErrorMessage(result.error));
        return;
      }
      router.push(listHref as Route);
    });
  }

  return (
    <article className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-sm)] md:p-8">
      <div className="flex items-center gap-2 flex-wrap">
        {post.pinned ? (
          <Badge variant="warning" className="gap-1">
            <Pin className="h-3 w-3" />
            고정
          </Badge>
        ) : null}
        {post.title ? (
          <h1 className="text-xl font-bold tracking-tight text-[var(--foreground)] md:text-2xl">
            {post.title}
          </h1>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-[var(--muted-foreground)]">
        <span className="font-medium text-[var(--foreground)]">
          {post.authorName}
        </span>
        <AuthorBadges role={post.authorRole} cohorts={post.authorCohorts} />
        <span
          aria-hidden
          className="h-0.5 w-0.5 rounded-full bg-[var(--muted-foreground)]"
        />
        <time dateTime={post.createdAt}>{formatDateTime(post.createdAt)}</time>
      </div>

      <div className="mt-6 whitespace-pre-wrap break-words text-[0.9375rem] leading-7 text-[var(--foreground)]">
        {post.body}
      </div>

      {(post.isOwn || canModerate) && (
        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-5">
          {post.isOwn ? (
            <>
              <CommunityWriteForm
                mode="edit"
                postId={post.id}
                initialTitle={post.title ?? ""}
                initialBody={post.body}
                trigger={
                  <Button variant="outline" size="sm" disabled={pending}>
                    수정
                  </Button>
                }
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                disabled={pending}
                className="text-[var(--destructive)] hover:bg-[var(--destructive)]/10"
              >
                <Trash2 className="h-4 w-4" />
                삭제
              </Button>
            </>
          ) : null}

          {canModerate ? (
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onTogglePin}
                disabled={pending}
              >
                {post.pinned ? (
                  <>
                    <PinOff className="h-4 w-4" />
                    고정 해제
                  </>
                ) : (
                  <>
                    <Pin className="h-4 w-4" />
                    고정
                  </>
                )}
              </Button>
              {!post.isOwn ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onHide}
                  disabled={pending}
                  className="text-[var(--destructive)] hover:bg-[var(--destructive)]/10"
                >
                  <EyeOff className="h-4 w-4" />
                  숨기기
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      )}

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-[var(--radius-sm)] bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]"
        >
          {error}
        </p>
      ) : null}
    </article>
  );
}
