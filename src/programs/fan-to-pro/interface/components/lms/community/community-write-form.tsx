"use client";

/**
 * 커뮤니티 글 작성 / 수정 폼 (Dialog).
 *
 * mode='create' : createPostAction 호출 후 상세로 이동
 * mode='edit'   : editPostAction 호출 후 router.refresh()
 *
 * 제목은 optional, 본문 필수 (Slice 3 zod 계약과 일치).
 * plain-text 입력 — 렌더는 whitespace-pre-wrap + React escape (§Sage).
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Plus, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/dialog";
import { Button } from "@/src/programs/fan-to-pro/interface/components/lms/ui/button";
import { Input } from "@/src/programs/fan-to-pro/interface/components/lms/ui/input";
import { Label } from "@/src/programs/fan-to-pro/interface/components/lms/ui/label";
import { Textarea } from "@/src/programs/fan-to-pro/interface/components/lms/ui/textarea";
import {
  createPostAction,
  editPostAction,
} from "@/src/programs/fan-to-pro/interface/server-actions/student/lms-community-actions";

type CreateProps = {
  mode: "create";
  /** 작성 성공 후 이동할 커뮤니티 상세 base 경로 (예: /ko/fan-to-pro/<slug>/student/community). */
  detailBase: string;
  trigger?: React.ReactNode;
};

type EditProps = {
  mode: "edit";
  postId: string;
  initialTitle: string;
  initialBody: string;
  trigger?: React.ReactNode;
};

type Props = CreateProps | EditProps;

export function CommunityWriteForm(props: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const isEdit = props.mode === "edit";

  function onSubmit(formData: FormData) {
    setError(null);
    const title = String(formData.get("title") ?? "").trim();
    const body = String(formData.get("body") ?? "").trim();
    if (body.length === 0) {
      setError("본문을 입력해주세요");
      return;
    }

    startTransition(async () => {
      if (props.mode === "edit") {
        const result = await editPostAction({
          postId: props.postId,
          title: title || undefined,
          body,
        });
        if (result.status === "error") {
          setError(errorMessage(result.error));
          return;
        }
        setOpen(false);
        router.refresh();
      } else {
        const result = await createPostAction({
          title: title || undefined,
          body,
        });
        if (result.status === "error") {
          setError(errorMessage(result.error));
          return;
        }
        setOpen(false);
        router.push(`${props.detailBase}/${result.id}` as Route);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <DialogTrigger asChild>
        {props.trigger ?? (
          <Button className="h-11">
            {isEdit ? (
              <>
                <Pencil className="h-4 w-4" />
                수정
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                글쓰기
              </>
            )}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "글 수정" : "새 글 쓰기"}</DialogTitle>
          <DialogDescription>
            같은 기수 동료들과 나누고 싶은 이야기를 남겨보세요. 제목은 선택,
            내용은 필수입니다
          </DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="community-title" className="text-xs">
              제목 (선택)
            </Label>
            <Input
              id="community-title"
              name="title"
              maxLength={200}
              defaultValue={isEdit ? props.initialTitle : ""}
              placeholder="제목을 입력하세요"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="community-body" className="text-xs">
              내용
            </Label>
            <Textarea
              id="community-body"
              name="body"
              rows={7}
              maxLength={5000}
              required
              defaultValue={isEdit ? props.initialBody : ""}
              placeholder="내용을 입력하세요"
            />
          </div>
          {error ? (
            <p
              role="alert"
              className="rounded-[var(--radius-sm)] bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]"
            >
              {error}
            </p>
          ) : null}
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
              {pending ? "저장 중..." : isEdit ? "수정 완료" : "등록"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function errorMessage(code: string): string {
  switch (code) {
    case "unauthenticated":
      return "로그인이 필요합니다";
    case "invalidInput":
      return "입력값을 확인해주세요";
    case "programUnavailable":
      return "커뮤니티를 사용할 수 없습니다. 잠시 후 다시 시도해주세요";
    default:
      return "저장에 실패했어요. 잠시 후 다시 시도해주세요";
  }
}
