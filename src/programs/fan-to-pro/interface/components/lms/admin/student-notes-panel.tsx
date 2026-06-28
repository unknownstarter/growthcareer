"use client";

/**
 * Student Notes Panel — 운영 코멘트 (B0044 LMS Launch Phase 2).
 *
 * 운영자/강사가 학생에게 메모를 남긴다. **학생 본인은 본 패널 안 봄**
 * (private operational note — ADR 0011 §5.5).
 *
 * 작성 form + timeline (핀 우선 → 최신순).
 *
 * 1기 운영: 강사 self-input X → 운영자 (노아) 대신 입력 (author_role 'admin').
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Pin,
  PinOff,
  Trash2,
  Pencil,
  Plus,
  Save,
  X,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/card";
import { Button } from "@/src/programs/fan-to-pro/interface/components/lms/ui/button";
import { Textarea } from "@/src/programs/fan-to-pro/interface/components/lms/ui/textarea";
import { Label } from "@/src/programs/fan-to-pro/interface/components/lms/ui/label";
import { Badge } from "@/src/programs/fan-to-pro/interface/components/lms/ui/badge";
import { createStudentNoteAction } from "@/src/programs/fan-to-pro/application/student-note/create-note";
import { updateStudentNoteAction } from "@/src/programs/fan-to-pro/application/student-note/update-note";
import { deleteStudentNoteAction } from "@/src/programs/fan-to-pro/application/student-note/delete-note";
import { toggleStudentNotePinAction } from "@/src/programs/fan-to-pro/application/student-note/toggle-pin-note";
import {
  STUDENT_NOTE_MAX_BODY,
  type StudentNote,
} from "@/src/programs/fan-to-pro/domain/entities/student-note";

type Props = {
  studentId: string;
  initialNotes: StudentNote[];
};

export function StudentNotesPanel({ studentId, initialNotes }: Props) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [body, setBody] = React.useState("");
  const [pinNew, setPinNew] = React.useState(false);
  const [editing, setEditing] = React.useState<Record<string, boolean>>({});
  // local state — server refresh 만으로는 client mount 안 됨. mutation 후 즉시 갱신.
  const [notes, setNotes] = React.useState<StudentNote[]>(initialNotes);
  // server refetch 시 props 가 새로 들어오면 동기화 (다른 운영자가 다른 탭에서 추가한 경우 등).
  React.useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes]);

  function toggleEdit(id: string, on: boolean) {
    setEditing((s) => ({ ...s, [id]: on }));
  }

  function onCreate() {
    setError(null);
    setFeedback(null);
    const trimmed = body.trim();
    if (!trimmed) {
      setError("내용은 비울 수 없습니다.");
      return;
    }
    startTransition(async () => {
      const result = await createStudentNoteAction({
        student_id: studentId,
        body: trimmed,
        is_pinned: pinNew,
      });
      if (result.status === "error") {
        setError(`저장 실패. ${result.error}`);
        return;
      }
      setBody("");
      setPinNew(false);
      setFeedback("코멘트 추가 완료.");
      router.refresh();
    });
  }

  function onUpdate(note: StudentNote, nextBody: string) {
    setError(null);
    setFeedback(null);
    const trimmed = nextBody.trim();
    if (!trimmed) {
      setError("내용은 비울 수 없습니다.");
      return;
    }
    startTransition(async () => {
      const result = await updateStudentNoteAction({
        id: note.id,
        body: trimmed,
      });
      if (result.status === "error") {
        setError(`수정 실패. ${result.error}`);
        return;
      }
      setNotes((prev) =>
        prev.map((n) => (n.id === note.id ? { ...n, body: trimmed } : n)),
      );
      toggleEdit(note.id, false);
      setFeedback("수정 완료.");
      router.refresh();
    });
  }

  function onDelete(note: StudentNote) {
    if (!confirm("이 코멘트를 삭제할까요. 복구되지 않습니다.")) return;
    setError(null);
    setFeedback(null);
    startTransition(async () => {
      const result = await deleteStudentNoteAction({ id: note.id });
      if (result.status === "error") {
        setError(`삭제 실패. ${result.error}`);
        return;
      }
      setNotes((prev) => prev.filter((n) => n.id !== note.id));
      setFeedback("삭제 완료.");
      router.refresh();
    });
  }

  function onTogglePin(note: StudentNote) {
    setError(null);
    setFeedback(null);
    const nextPinned = !note.is_pinned;
    startTransition(async () => {
      const result = await toggleStudentNotePinAction({
        id: note.id,
        is_pinned: nextPinned,
      });
      if (result.status === "error") {
        setError(`핀 변경 실패. ${result.error}`);
        return;
      }
      setNotes((prev) =>
        prev.map((n) => (n.id === note.id ? { ...n, is_pinned: nextPinned } : n)),
      );
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>운영 코멘트</CardTitle>
        <CardDescription>
          운영자 / 강사 전용 메모입니다. 학생 본인은 이 영역을 볼 수 없습니다.
          중요 사항은 핀으로 상단 고정.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {feedback ? (
          <div className="mb-4 rounded-[var(--radius-sm)] bg-[#dcfae6] px-4 py-3 text-sm text-[#067647]">
            {feedback}
          </div>
        ) : null}
        {error ? (
          <div className="mb-4 rounded-[var(--radius-sm)] bg-[#fee4e2] px-4 py-3 text-sm text-[#b42318]">
            {error}
          </div>
        ) : null}

        {/* 신규 작성 form */}
        <div className="space-y-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--secondary)] p-4 mb-6">
          <div className="space-y-1.5">
            <Label htmlFor="note_body" className="text-xs">
              새 코멘트 (최대 {STUDENT_NOTE_MAX_BODY}자)
            </Label>
            <Textarea
              id="note_body"
              rows={4}
              maxLength={STUDENT_NOTE_MAX_BODY}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="예) 6/29 컨설팅 결과. HYBE 마케팅 직군 관심. 포트폴리오 보강 권유."
            />
            <p className="text-xs text-[var(--muted-foreground)] text-right">
              {body.length} / {STUDENT_NOTE_MAX_BODY}
            </p>
          </div>
          <div className="flex items-center justify-between">
            <label className="inline-flex items-center gap-2 text-sm text-[var(--foreground)] cursor-pointer">
              <input
                type="checkbox"
                checked={pinNew}
                onChange={(e) => setPinNew(e.target.checked)}
                className="h-4 w-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--ring)]"
              />
              <Pin className="h-3.5 w-3.5" />
              핀 고정
            </label>
            <Button
              onClick={onCreate}
              disabled={pending || body.trim().length === 0}
              className="h-12 px-6"
            >
              <Plus className="h-4 w-4 mr-2" />
              {pending ? "저장 중..." : "코멘트 추가"}
            </Button>
          </div>
        </div>

        {/* timeline */}
        {notes.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
            아직 코멘트가 없습니다.
          </p>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => {
              const isEditing = editing[note.id];
              return (
                <NoteCard
                  key={note.id}
                  note={note}
                  isEditing={isEditing}
                  pending={pending}
                  onStartEdit={() => toggleEdit(note.id, true)}
                  onCancelEdit={() => toggleEdit(note.id, false)}
                  onSaveEdit={(next) => onUpdate(note, next)}
                  onDelete={() => onDelete(note)}
                  onTogglePin={() => onTogglePin(note)}
                />
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function NoteCard({
  note,
  isEditing,
  pending,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onTogglePin,
}: {
  note: StudentNote;
  isEditing: boolean;
  pending: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (next: string) => void;
  onDelete: () => void;
  onTogglePin: () => void;
}) {
  const [draft, setDraft] = React.useState(note.body);

  React.useEffect(() => {
    setDraft(note.body);
  }, [note.body]);

  return (
    <div
      className={`rounded-[var(--radius)] border p-4 ${
        note.is_pinned
          ? "border-[var(--primary)]/30 bg-[var(--primary)]/5"
          : "border-[var(--border)] bg-[var(--card)]"
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
          {note.is_pinned ? (
            <Badge variant="default" className="gap-1">
              <Pin className="h-3 w-3" />핀
            </Badge>
          ) : null}
          <AuthorRoleBadge role={note.author_role} />
          <span>
            {new Date(note.created_at).toLocaleString("ko-KR", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {note.updated_at &&
          note.updated_at !== note.created_at ? (
            <span className="italic">수정됨</span>
          ) : null}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onTogglePin}
            disabled={pending}
            aria-label={note.is_pinned ? "핀 해제" : "핀 고정"}
            title={note.is_pinned ? "핀 해제" : "핀 고정"}
          >
            {note.is_pinned ? (
              <PinOff className="h-3.5 w-3.5" />
            ) : (
              <Pin className="h-3.5 w-3.5" />
            )}
          </Button>
          {!isEditing ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onStartEdit}
              disabled={pending}
              aria-label="수정"
              title="수정"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            disabled={pending}
            aria-label="삭제"
            title="삭제"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <Textarea
            rows={4}
            maxLength={STUDENT_NOTE_MAX_BODY}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancelEdit}
              disabled={pending}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              취소
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => onSaveEdit(draft)}
              disabled={pending || draft.trim().length === 0}
            >
              <Save className="h-3.5 w-3.5 mr-1" />
              {pending ? "저장 중..." : "저장"}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">
          {note.body}
        </p>
      )}
    </div>
  );
}

function AuthorRoleBadge({
  role,
}: {
  role: "super_admin" | "admin" | "instructor";
}) {
  const label =
    role === "super_admin"
      ? "운영"
      : role === "admin"
        ? "운영"
        : "강사";
  const variant: "default" | "secondary" =
    role === "instructor" ? "secondary" : "default";
  return <Badge variant={variant}>{label}</Badge>;
}
