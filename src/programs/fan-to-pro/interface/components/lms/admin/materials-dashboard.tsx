"use client";

/**
 * /lms/admin/materials — 강의 자료 list + 업로드.
 *
 * 업로드 흐름: client 가 file 선택 → server 가 signed upload URL 발급 → client
 * 가 PUT → DB material row INSERT. 본 Wave 2 lite 버전은 운영자가 URL 만 직접
 * 입력 (Storage bucket 생성 후 manual upload + path 입력). 풀 업로드 흐름은
 * Wave 4.
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, FileText, Eye, Archive, Trash2 } from "lucide-react";
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
  createMaterialAction,
  publishMaterialAction,
  archiveMaterialAction,
  deleteMaterialAction,
} from "@/src/programs/fan-to-pro/interface/server-actions/admin/lms-content-actions";
import type { Material } from "@/src/programs/fan-to-pro/domain/entities/material";

type Props = {
  cohort_id: string;
  materials: Material[];
  sessions: Array<{ id: string; idx: number | null; title: string; starts_at: string }>;
};

export function MaterialsDashboard({ cohort_id, materials, sessions }: Props) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [open, setOpen] = React.useState(false);
  const [feedback, setFeedback] = React.useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    const data = {
      cohort_id,
      session_id: (formData.get("session_id") as string) || null,
      title: String(formData.get("title") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim() || null,
      file_path: String(formData.get("file_path") ?? "").trim(),
      mime_type: String(formData.get("mime_type") ?? "").trim() || null,
      status: (formData.get("publish") === "on" ? "published" : "draft") as
        | "draft"
        | "published",
    };
    startTransition(async () => {
      const result = await createMaterialAction(data);
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
    if (op === "delete" && !confirm("이 자료를 삭제할까요?")) return;
    startTransition(async () => {
      const fn =
        op === "publish"
          ? publishMaterialAction
          : op === "archive"
            ? archiveMaterialAction
            : deleteMaterialAction;
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
            <CardTitle>강의 자료 ({materials.length}개)</CardTitle>
            <CardDescription>
              published 된 자료만 학생에게 visible. Storage bucket lms-materials
              에 manual 업로드 후 path 만 입력.
            </CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="h-12 px-6">
                <Plus className="h-4 w-4 mr-2" />
                자료 추가
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>자료 추가</DialogTitle>
                <DialogDescription>
                  Supabase Storage 의 lms-materials bucket 에 파일을 먼저 업로드한
                  후 path 를 입력하세요.
                </DialogDescription>
              </DialogHeader>
              <form action={onSubmit} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="title" className="text-xs">제목 *</Label>
                  <Input id="title" name="title" required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="session_id" className="text-xs">세션 (선택)</Label>
                  <select
                    id="session_id"
                    name="session_id"
                    className="h-12 w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
                  >
                    <option value="">전체 cohort</option>
                    {sessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.idx ?? "?"}회차 {s.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="file_path" className="text-xs">파일 path *</Label>
                  <Input
                    id="file_path"
                    name="file_path"
                    required
                    placeholder="cohort-1/session-1/lecture.pdf"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="mime_type" className="text-xs">MIME (선택)</Label>
                  <Input
                    id="mime_type"
                    name="mime_type"
                    placeholder="application/pdf"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="description" className="text-xs">설명</Label>
                  <Textarea id="description" name="description" rows={2} />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="publish"
                    name="publish"
                    type="checkbox"
                    className="h-4 w-4 rounded border-[var(--border)]"
                  />
                  <Label htmlFor="publish" className="text-sm font-normal">
                    바로 published 로
                  </Label>
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
                    {pending ? "저장 중..." : "추가"}
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
        {materials.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
            아직 등록된 강의 자료가 없습니다.
          </p>
        ) : (
          <div className="space-y-2">
            {materials.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4"
              >
                <FileText className="h-5 w-5 text-[var(--muted-foreground)] shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate">{m.title}</p>
                    <StatusBadge status={m.status} />
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)] truncate">
                    {m.file_path}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {m.status === "draft" ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() => onAction(m.id, "publish")}
                      title="published 로"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() => onAction(m.id, "archive")}
                      title="archived 로"
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => onAction(m.id, "delete")}
                    title="삭제"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: Material["status"] }) {
  if (status === "published") return <Badge>published</Badge>;
  if (status === "archived") return <Badge variant="outline">archived</Badge>;
  return <Badge variant="outline">draft</Badge>;
}
