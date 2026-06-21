"use client";

/**
 * Career Document 등록/수정 modal.
 *
 * 라디오 (external_url / file_upload) — 두 입력 영역 동적 toggle. notes 공통.
 * 저장 시 해당 server action 호출.
 */
import * as React from "react";
import { Upload, Link as LinkIcon } from "lucide-react";
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
import { Textarea } from "@/src/programs/fan-to-pro/interface/components/lms/ui/textarea";
import { Label } from "@/src/programs/fan-to-pro/interface/components/lms/ui/label";
import {
  CAREER_DOC_LABELS,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  validateFileInput,
  type CareerDocType,
  type CareerDocument,
  type StorageMethod,
} from "@/src/programs/fan-to-pro/domain/entities/career-document";
import { saveCareerExternalUrlAction } from "@/src/programs/fan-to-pro/application/career/save-external-url";
import { uploadCareerFileAction } from "@/src/programs/fan-to-pro/application/career/upload-file";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
  docType: CareerDocType | null;
  existing: CareerDocument | null;
  mode: "admin" | "self";
  onSaved: () => void;
};

const ACCEPT = ALLOWED_MIME_TYPES.join(",");

export function CareerDocumentEditModal({
  open,
  onOpenChange,
  studentId,
  studentName,
  docType,
  existing,
  mode,
  onSaved,
}: Props) {
  const [method, setMethod] = React.useState<StorageMethod>("external_url");
  const [url, setUrl] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // open 또는 docType 변경 시 form 리셋.
  React.useEffect(() => {
    if (!open) return;
    if (existing) {
      setMethod(existing.storage_method);
      setUrl(existing.external_url ?? "");
      setNotes(existing.notes ?? "");
    } else {
      setMethod("external_url");
      setUrl("");
      setNotes("");
    }
    setFile(null);
    setFileError(null);
    setSubmitError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [open, existing, docType]);

  if (!docType) return null;

  const label = CAREER_DOC_LABELS[docType];
  const titlePrefix = existing ? "수정" : "등록";
  const subjectName = mode === "admin" ? `${studentName} 학생의 ` : "";

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (!f) {
      setFileError(null);
      return;
    }
    const err = validateFileInput({ size: f.size, mime: f.type });
    if (err === "fileTooLarge") {
      setFileError(
        `파일이 너무 큽니다. ${(MAX_FILE_SIZE_BYTES / 1024 / 1024).toFixed(0)} MB 이하만 가능합니다.`,
      );
    } else if (err === "mimeNotAllowed") {
      setFileError(
        "허용되지 않은 형식입니다. PDF, DOCX, PPTX, ZIP, JPG, PNG, WEBP 만 가능합니다.",
      );
    } else if (err === "fileEmpty") {
      setFileError("빈 파일입니다.");
    } else {
      setFileError(null);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (!docType) return;

    if (method === "external_url") {
      const trimmed = url.trim();
      if (!trimmed) {
        setSubmitError("URL 을 입력해주세요.");
        return;
      }
      try {
        // 단순 URL 검증 — server-side 가 최종 검증.
        new URL(trimmed);
      } catch {
        setSubmitError("올바른 URL 형식이 아닙니다.");
        return;
      }
      setSubmitting(true);
      const result = await saveCareerExternalUrlAction({
        student_id: studentId,
        doc_type: docType,
        external_url: trimmed,
        notes: notes.trim() || null,
      });
      setSubmitting(false);
      if (result.status === "error") {
        setSubmitError(`저장 실패. ${result.error}`);
        return;
      }
      onSaved();
      return;
    }

    // file_upload mode.
    if (!file) {
      // 기존이 file_upload 였고 file 새로 안 골랐으면 notes 만 업데이트하는 시나리오.
      // 본 Wave 에선 단순화 — 파일 변경 안 할거면 외부 링크로 전환하거나 그대로 두라.
      if (existing?.storage_method === "file_upload") {
        setSubmitError(
          "파일을 다시 선택해주세요. notes 만 변경하는 기능은 추후 추가 예정입니다.",
        );
      } else {
        setSubmitError("파일을 선택해주세요.");
      }
      return;
    }
    if (fileError) return;

    const formData = new FormData();
    formData.set("student_id", studentId);
    formData.set("doc_type", docType);
    formData.set("file", file);
    if (notes.trim()) formData.set("notes", notes.trim());

    setSubmitting(true);
    const result = await uploadCareerFileAction(formData);
    setSubmitting(false);
    if (result.status === "error") {
      setSubmitError(`업로드 실패. ${result.error}`);
      return;
    }
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {label} {titlePrefix}
          </DialogTitle>
          <DialogDescription>
            {subjectName}
            {label} 을(를) {titlePrefix}합니다. 외부 링크 또는 파일 업로드 중 하나를 선택해주세요.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-5">
          {/* 라디오 — 저장 방식 */}
          <div className="space-y-2">
            <Label>저장 방식</Label>
            <div className="grid grid-cols-2 gap-2">
              <MethodChoice
                checked={method === "external_url"}
                onClick={() => setMethod("external_url")}
                icon={<LinkIcon className="h-4 w-4" />}
                label="외부 링크"
                sub="Notion, Google Docs 등"
              />
              <MethodChoice
                checked={method === "file_upload"}
                onClick={() => setMethod("file_upload")}
                icon={<Upload className="h-4 w-4" />}
                label="파일 업로드"
                sub="PDF, DOCX, PPTX 등 10MB 이하"
              />
            </div>
          </div>

          {/* 입력 영역 — 방식별 */}
          {method === "external_url" ? (
            <div className="space-y-2">
              <Label htmlFor="career-url">링크 URL</Label>
              <Input
                id="career-url"
                type="url"
                placeholder="https://www.notion.so/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="career-file">파일 선택</Label>
              <input
                id="career-file"
                ref={fileInputRef}
                type="file"
                accept={ACCEPT}
                onChange={onFileChange}
                className="block w-full text-sm text-[var(--foreground)] file:mr-4 file:py-2 file:px-4 file:rounded-[var(--radius-sm)] file:border-0 file:text-sm file:font-semibold file:bg-[var(--secondary)] file:text-[var(--foreground)] hover:file:bg-[var(--accent)] file:cursor-pointer cursor-pointer"
              />
              {fileError ? (
                <p className="text-xs text-[var(--destructive)]">{fileError}</p>
              ) : (
                <p className="text-xs text-[var(--muted-foreground)]">
                  최대 10MB. PDF, DOCX, PPTX, ZIP, JPG, PNG, WEBP.
                </p>
              )}
              {existing?.storage_method === "file_upload" && !file ? (
                <p className="text-xs text-[var(--muted-foreground)]">
                  현재 등록된 파일. {existing.file_name ?? "(파일명 없음)"}
                </p>
              ) : null}
            </div>
          )}

          {/* notes */}
          <div className="space-y-2">
            <Label htmlFor="career-notes">메모 (선택)</Label>
            <Textarea
              id="career-notes"
              placeholder="예. 최종 버전. 면접 후 추가 보완 예정."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              rows={3}
            />
            <p className="text-xs text-[var(--muted-foreground)]">
              {notes.length} / 500
            </p>
          </div>

          {submitError ? (
            <div className="rounded-[var(--radius-sm)] bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]">
              {submitError}
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              취소
            </Button>
            <Button type="submit" disabled={submitting || !!fileError}>
              {submitting ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MethodChoice({
  checked,
  onClick,
  icon,
  label,
  sub,
}: {
  checked: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "flex flex-col items-start gap-1 rounded-[var(--radius-sm)] border px-3 py-3 text-left transition-colors " +
        (checked
          ? "border-[var(--primary)] bg-[var(--primary)]/5"
          : "border-[var(--border)] bg-[var(--background)] hover:bg-[var(--secondary)]")
      }
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
        {icon}
        {label}
      </div>
      <p className="text-xs text-[var(--muted-foreground)]">{sub}</p>
    </button>
  );
}
