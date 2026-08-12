"use client";

/**
 * 커뮤니티 댓글 영역 (client) — 목록 + 작성(낙관적 UI) + 본인 댓글 수정/삭제.
 *
 * useOptimistic 으로 작성 즉시 렌더 → 서버 확정 후 router.refresh() 로 실제 데이터 반영.
 * body 는 whitespace-pre-wrap + React escape (§Sage).
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { Button } from "@/src/programs/fan-to-pro/interface/components/lms/ui/button";
import { Textarea } from "@/src/programs/fan-to-pro/interface/components/lms/ui/textarea";
import {
  STAGGER_ITEM_CLASS,
  staggerDelay,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/stagger";
import { AuthorBadges } from "./author-meta";
import { formatRelative } from "./format-time";
import { communityErrorMessage } from "./community-post-actions";
import {
  createCommentAction,
  editCommentAction,
  softDeleteCommentAction,
} from "@/src/programs/fan-to-pro/interface/server-actions/student/lms-community-actions";
import type { CommunityCommentView } from "@/src/programs/fan-to-pro/application/queries/lms/fetch-community";

type OptimisticComment = CommunityCommentView & { optimistic?: boolean };

export function CommunityComments({
  postId,
  comments,
  meName,
}: {
  postId: string;
  comments: CommunityCommentView[];
  /** 낙관적 렌더 시 표시할 본인 이름. */
  meName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState("");

  const [optimistic, addOptimistic] = React.useOptimistic<
    OptimisticComment[],
    OptimisticComment
  >(comments, (state, next) => [...state, next]);

  function onSubmit(formData: FormData) {
    const body = String(formData.get("body") ?? "").trim();
    if (body.length === 0) return;
    setError(null);
    setDraft("");

    startTransition(async () => {
      addOptimistic({
        id: `optimistic-${Date.now()}`,
        postId,
        body,
        status: "published",
        createdAt: new Date().toISOString(),
        authorName: meName,
        // 낙관적 렌더 — 본인 역할/기수 칩은 서버 재검증(router.refresh) 후 채워짐.
        authorRole: null,
        authorCohorts: [],
        isOwn: true,
        optimistic: true,
      });
      const result = await createCommentAction({ postId, body });
      if (result.status === "error") {
        setError(communityErrorMessage(result.error));
        setDraft(body);
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="mt-8" aria-label="댓글">
      <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--foreground)]">
        <MessageCircle className="h-4 w-4" aria-hidden />
        댓글 {optimistic.length}
      </h2>

      <ul className="mt-4 space-y-3">
        {optimistic.length === 0 ? (
          <li className="rounded-[var(--radius)] border border-dashed border-[var(--border)] px-4 py-6 text-center text-sm text-[var(--muted-foreground)]">
            첫 댓글을 남겨보세요.
          </li>
        ) : (
          optimistic.map((c, i) => (
            <li
              key={c.id}
              className={STAGGER_ITEM_CLASS}
              style={staggerDelay(i, 30)}
            >
              <CommentItem
                comment={c}
                pending={pending}
                onChanged={() => router.refresh()}
                setError={setError}
              />
            </li>
          ))
        )}
      </ul>

      <form action={onSubmit} className="mt-5 space-y-2">
        <Textarea
          name="body"
          rows={3}
          maxLength={2000}
          required
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="댓글을 입력하세요"
          className="min-h-[80px]"
        />
        {error ? (
          <p role="alert" className="text-sm text-[var(--destructive)]">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end">
          <Button type="submit" disabled={pending || draft.trim().length === 0}>
            {pending ? "등록 중..." : "댓글 등록"}
          </Button>
        </div>
      </form>
    </section>
  );
}

function CommentItem({
  comment,
  pending,
  onChanged,
  setError,
}: {
  comment: OptimisticComment;
  pending: boolean;
  onChanged: () => void;
  setError: (v: string | null) => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState(comment.body);
  const [localPending, startTransition] = React.useTransition();
  const busy = pending || localPending;

  function onSaveEdit() {
    const body = value.trim();
    if (body.length === 0) return;
    setError(null);
    startTransition(async () => {
      const result = await editCommentAction({ commentId: comment.id, body });
      if (result.status === "error") {
        setError(communityErrorMessage(result.error));
        return;
      }
      setEditing(false);
      onChanged();
    });
  }

  function onDelete() {
    if (!window.confirm("이 댓글을 삭제할까요?")) return;
    setError(null);
    startTransition(async () => {
      const result = await softDeleteCommentAction({ commentId: comment.id });
      if (result.status === "error") {
        setError(communityErrorMessage(result.error));
        return;
      }
      onChanged();
    });
  }

  return (
    <div
      className={`rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 ${
        comment.optimistic ? "opacity-60" : ""
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-[var(--muted-foreground)]">
        <span className="font-medium text-[var(--foreground)]">
          {comment.authorName}
        </span>
        <AuthorBadges
          role={comment.authorRole}
          cohorts={comment.authorCohorts}
        />
        <span
          aria-hidden
          className="h-0.5 w-0.5 rounded-full bg-[var(--muted-foreground)]"
        />
        <time dateTime={comment.createdAt}>
          {formatRelative(comment.createdAt)}
        </time>
      </div>

      {editing ? (
        <div className="mt-2 space-y-2">
          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={3}
            maxLength={2000}
            className="min-h-[72px]"
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setEditing(false);
                setValue(comment.body);
              }}
              disabled={busy}
            >
              취소
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onSaveEdit}
              disabled={busy || value.trim().length === 0}
            >
              {localPending ? "저장 중..." : "저장"}
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[var(--foreground)]">
          {comment.body}
        </p>
      )}

      {comment.isOwn && !comment.optimistic && !editing ? (
        <div className="mt-2 flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setEditing(true)}
            disabled={busy}
          >
            수정
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-[var(--destructive)] hover:bg-[var(--destructive)]/10"
            onClick={onDelete}
            disabled={busy}
          >
            삭제
          </Button>
        </div>
      ) : null}
    </div>
  );
}
