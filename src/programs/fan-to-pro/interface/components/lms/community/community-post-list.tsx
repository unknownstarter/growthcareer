/**
 * 커뮤니티 글 목록 (server component 로 렌더 가능한 presentational).
 *
 * pinned 상단 고정 배지, 작성자, 상대 시각, 댓글 수. hover transition.
 * 목록 stagger fade-in (§6.7). body/title 은 whitespace-pre-wrap + React escape.
 */
import Link from "next/link";
import type { Route } from "next";
import { Pin, MessageCircle } from "lucide-react";
import { Badge } from "@/src/programs/fan-to-pro/interface/components/lms/ui/badge";
import {
  STAGGER_ITEM_CLASS,
  staggerDelay,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/stagger";
import type { CommunityPostView } from "@/src/programs/fan-to-pro/application/queries/lms/fetch-community";
import { AuthorBadges } from "./author-meta";
import { formatRelative } from "./format-time";

/** 제목 없는 글의 목록 표시용 본문 미리보기 (첫 줄 기준). */
function bodyPreview(body: string): string {
  const firstLine = body.split("\n").find((l) => l.trim().length > 0) ?? body;
  return firstLine.trim();
}

export function CommunityPostList({
  posts,
  detailBase,
}: {
  posts: CommunityPostView[];
  /** 상세 링크 base (예: /ko/fan-to-pro/<slug>/student/community). */
  detailBase: string;
}) {
  return (
    <ul className="space-y-3">
      {posts.map((post, i) => (
        <li
          key={post.id}
          className={STAGGER_ITEM_CLASS}
          style={staggerDelay(i)}
        >
          <Link
            href={`${detailBase}/${post.id}` as Route}
            className="group block rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-sm)] transition-colors duration-150 hover:bg-[var(--secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            <div className="flex items-center gap-2 flex-wrap">
              {post.pinned ? (
                <Badge variant="warning" className="gap-1">
                  <Pin className="h-3 w-3" />
                  고정
                </Badge>
              ) : null}
              {post.title ? (
                <h3 className="text-base font-bold tracking-tight text-[var(--foreground)]">
                  {post.title}
                </h3>
              ) : (
                <h3 className="text-base font-semibold text-[var(--foreground)] line-clamp-1">
                  {bodyPreview(post.body)}
                </h3>
              )}
            </div>

            {post.title ? (
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted-foreground)] line-clamp-2 whitespace-pre-wrap">
                {post.body}
              </p>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-[var(--muted-foreground)]">
              <span className="font-medium text-[var(--foreground)]">
                {post.authorName}
              </span>
              <AuthorBadges
                role={post.authorRole}
                cohorts={post.authorCohorts}
              />
              <span
                aria-hidden
                className="h-0.5 w-0.5 rounded-full bg-[var(--muted-foreground)]"
              />
              <time dateTime={post.createdAt}>
                {formatRelative(post.createdAt)}
              </time>
              {post.commentCount > 0 ? (
                <span className="inline-flex items-center gap-1">
                  <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                  <span>댓글 {post.commentCount}</span>
                </span>
              ) : null}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
