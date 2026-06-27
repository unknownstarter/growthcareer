"use client";

/**
 * 신청서 원본 이름 정정 dialog — admin only.
 *
 * 노아 통찰 (2026-06-27): "입력 가능 = 해당 DB 수정 권한이 있느냐".
 * super_admin / program admin 만 applicants.name + students.display_name 정정.
 * 학생 본인은 readonly (자동 채움).
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { updateStudentRealNameAction } from "@/src/programs/fan-to-pro/interface/server-actions/admin/lms-cohort-actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/dialog";
import { Button } from "@/src/programs/fan-to-pro/interface/components/lms/ui/button";
import { Input } from "@/src/programs/fan-to-pro/interface/components/lms/ui/input";
import { Label } from "@/src/programs/fan-to-pro/interface/components/lms/ui/label";

export function StudentRealNameEdit({
  studentId,
  currentName,
}: {
  studentId: string;
  currentName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState(currentName);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function onSubmit() {
    setError(null);
    const trimmed = name.trim();
    if (trimmed === currentName) {
      setOpen(false);
      return;
    }
    if (trimmed.length < 2) {
      setError("이름은 2자 이상이어야 해요.");
      return;
    }
    startTransition(async () => {
      const r = await updateStudentRealNameAction({
        student_id: studentId,
        new_name: trimmed,
      });
      if (r.status === "error") {
        setError(`정정 실패: ${r.error}`);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          setName(currentName);
          setError(null);
          setOpen(true);
        }}
        className="h-7 px-2 text-xs"
      >
        <Pencil className="h-3 w-3 mr-1" />
        원본 이름 정정
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>신청서 원본 이름 정정</DialogTitle>
            <DialogDescription>
              applicants.name + students.display_name 둘 다 update 합니다. 운영자 (super_admin / program admin) 만 가능.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="real_name" className="text-xs">
              새 이름
            </Label>
            <Input
              id="real_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              disabled={pending}
            />
            <p className="text-[11px] text-[var(--muted-foreground)]">
              현재: <span className="font-mono">{currentName}</span>
            </p>
            {error ? (
              <p className="text-xs text-[#b42318]">{error}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              취소
            </Button>
            <Button
              type="button"
              onClick={onSubmit}
              disabled={pending || name.trim().length < 2}
            >
              {pending ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
