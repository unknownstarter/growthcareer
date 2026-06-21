"use client";

/**
 * /lms/admin/announcements — 공지 list + 작성.
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Megaphone, Eye, Archive, Trash2, Pin } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/card";
import { Button } from "@/src/programs/fan-to-pro/interface/components/lms/ui/button";
import { Badge } from "@/src/programs/fan-to-pro/interface/components/lms/ui/badge";
import { Input } from "@/src/programs/fan-to-pro/interface/components/lms/ui/input";
import { Label } from "@/src/programs/fan-to-pro/interface/components/lms/ui/label";
import { Textarea } from "@/src/programs/fan-to-pro/interface/components/lms/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/dialog";
import {
  createAnnouncementAction,
  publishAnnouncementAction,
  archiveAnnouncementAction,
  deleteAnnouncementAction,
} from "@/src/programs/fan-to-pro/interface/server-actions/admin/lms-content-actions";
import type { Announcement } from "@/src/programs/fan-to-pro/domain/entities/announcement";

type Props = {
  cohort_id: string;
  announcements: Announcement[];
};

export function AnnouncementsDashboard({ cohort_id, announcements }: Props) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [open, setOpen] = React.useState(false);
  const [feedback, setFeedback] = React.useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    const data = {
      cohort_id,
      title: String(formData.get("title") ?? "").trim(),
      body: String(formData.get("body") ?? "").trim(),
      pinned: formData.get("pinned") === "on",
      status: (formData.get("publish") === "on"
        ? "published"
        : "draft") as "draft" | "published",
    };
    startTransition(async () => {
      const result = await createAnnouncementAction(data);
      if (result.status === "error") {
        setFeedback(`오류: ${result.error}`);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  function onAction(
    id: string,
    op: "publish" | "archive" | "delete",
  ) {
    if (op === "delete" && !confirm("이 공지를 삭제할까요?")) return;
    startTransition(async () => {
      const fn =
        op === "publish"
          ? publishAnnouncementAction
          : op === "archive"
            ? archiveAnnouncementAction
            : deleteAnnouncementAction;
      const result = await fn({ id });
      if (result.status === "error") {
        setFeedback(`오류: ${result.error}`);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <CardTitle>공지 ({announcements.length}개)</CardTitle>
            <CardDescription>
              cohort 전체 발송. pinned 는 학생 대시보드 최상단.
            </CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="h-12 px-6">
                <Plus className="h-4 w-4 mr-2" />
                공지 작성
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>공지 작성</DialogTitle>
                <DialogDescription>
                  published 상태로 저장하면 학생에게 바로 visible 됩니다.
                </DialogDescription>
              </DialogHeader>
              <form action={onSubmit} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="title" className="text-xs">제목 *</Label>
                  <Input id="title" name="title" required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="body" className="text-xs">본문 *</Label>
                  <Textarea id="body" name="body" rows={6} required />
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="pinned"
                      className="h-4 w-4 rounded border-[var(--border)]"
                    />
                    <span className="text-sm">상단 고정</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="publish"
                      className="h-4 w-4 rounded border-[var(--border)]"
                    />
                    <span className="text-sm">바로 발행</span>
                  </label>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                    disabled={pending}
                  >
                    취소
                  </Button>
                  <Button type="submit" disabled={pending}>
                    {pending ? "저장 중..." : "저장"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {feedback ? (
          <div className="mb-4 rounded-[var(--radius-sm)] bg-[var(--secondary)] px-4 py-3 text-sm">
            {feedback}
          </div>
        ) : null}
        {announcements.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
            아직 작성된 공지가 없습니다.
          </p>
        ) : (
          <div className="space-y-2">
            {announcements.map((a) => (
              <div
                key={a.id}
                className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {a.pinned ? (
                      <Pin className="h-4 w-4 text-[var(--primary)] shrink-0" />
                    ) : (
                      <Megaphone className="h-4 w-4 text-[var(--muted-foreground)] shrink-0" />
                    )}
                    <p className="text-sm font-semibold truncate">{a.title}</p>
                    <StatusBadge status={a.status} />
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {a.status === "draft" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        onClick={() => onAction(a.id, "publish")}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        onClick={() => onAction(a.id, "archive")}
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() => onAction(a.id, "delete")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-[var(--muted-foreground)] line-clamp-2 whitespace-pre-wrap">
                  {a.body}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: Announcement["status"] }) {
  if (status === "published") return <Badge>published</Badge>;
  if (status === "archived") return <Badge variant="outline">archived</Badge>;
  return <Badge variant="outline">draft</Badge>;
}
