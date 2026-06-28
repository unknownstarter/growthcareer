"use client";

/**
 * Student Career Documents Panel — 단일 카드 안 3 영역 (B0057).
 *
 * profile 페이지 (학생 본인 + admin 양쪽) 임베드용. 기존 CareerDocumentsPanel
 * (3 큰 카드, /admin/students/[id]/career 단독 페이지) 와 별도 — 이쪽은 더 컴팩트.
 *
 * 영역 (resume / cover_letter / portfolio):
 *   - 빈 상태: 파일 업로드 input + 외부 링크 input + 안내 cap.
 *   - 채워진 상태: 파일명 / 크기 / 업로드일 + [다운로드] / [열기] / [삭제] / [교체].
 *
 * cap (UI 표시 — 서버 측 검증은 별도):
 *   - resume: 5MB PDF
 *   - cover_letter: 5MB PDF
 *   - portfolio: 50MB PDF / ZIP / PPT
 *
 * 권한 검증은 server action 의 assertCanAccessStudentCareer 가 담당.
 * UI 는 표시만.
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  ExternalLink,
  FileText,
  FilePlus2,
  Folder,
  Link2,
  Loader2,
  Pencil,
  Trash2,
  Upload,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/card";
import { Button } from "@/src/programs/fan-to-pro/interface/components/lms/ui/button";
import { CareerDocumentEditModal } from "@/src/programs/fan-to-pro/interface/components/lms/career/career-document-edit-modal";
import { deleteCareerDocumentAction } from "@/src/programs/fan-to-pro/application/career/delete-document";
import { getCareerSignedDownloadUrlAction } from "@/src/programs/fan-to-pro/application/career/get-signed-download-url";
import {
  CAREER_DOC_TYPES,
  type CareerDocType,
  type CareerDocument,
} from "@/src/programs/fan-to-pro/domain/entities/career-document";

type Mode = "self" | "admin";

type Props = {
  studentId: string;
  studentName: string;
  initialDocuments: CareerDocument[];
  mode: Mode;
  locale: string;
};

type DocConfig = {
  label: { ko: string; en: string };
  icon: typeof FileText;
  capLabel: { ko: string; en: string };
  mimeHint: { ko: string; en: string };
};

const DOC_CONFIG: Record<CareerDocType, DocConfig> = {
  resume: {
    label: { ko: "이력서", en: "Resume" },
    icon: FileText,
    capLabel: { ko: "PDF, 5MB 이내", en: "PDF, up to 5MB" },
    mimeHint: { ko: "PDF 권장", en: "PDF recommended" },
  },
  cover_letter: {
    label: { ko: "자기소개서", en: "Cover letter" },
    icon: FileText,
    capLabel: { ko: "PDF, 5MB 이내", en: "PDF, up to 5MB" },
    mimeHint: { ko: "PDF 권장", en: "PDF recommended" },
  },
  portfolio: {
    label: { ko: "포트폴리오", en: "Portfolio" },
    icon: Folder,
    capLabel: {
      ko: "PDF / ZIP / PPT, 50MB 이내",
      en: "PDF / ZIP / PPT, up to 50MB",
    },
    mimeHint: {
      ko: "50MB 초과 시 Google Drive / Notion 외부 링크",
      en: "Over 50MB: use Google Drive / Notion link",
    },
  },
};

type CopyDict = {
  title: string;
  description: string;
  upload: string;
  addLink: string;
  download: string;
  open: string;
  replace: string;
  remove: string;
  removeConfirm: (label: string) => string;
  empty: string;
  updatedAt: string;
};

const COPY: Record<"ko" | "en", CopyDict> = {
  ko: {
    title: "이력서 / 자기소개서 / 포트폴리오",
    description:
      "원하는 형식 (PDF 파일 또는 외부 링크) 으로 등록해주세요. 운영진과 강사가 첨삭 시 참고합니다.",
    upload: "파일 업로드",
    addLink: "외부 링크 등록",
    download: "다운로드",
    open: "열기",
    replace: "교체",
    remove: "삭제",
    removeConfirm: (label) =>
      `${label} 을(를) 삭제할까요. 다시 등록할 수 있습니다.`,
    empty: "아직 등록되지 않음",
    updatedAt: "마지막 수정",
  },
  en: {
    title: "Resume / cover letter / portfolio",
    description:
      "Upload as PDF file or paste an external link (Notion, Google Doc, etc). Used during instructor reviews.",
    upload: "Upload file",
    addLink: "Add external link",
    download: "Download",
    open: "Open",
    replace: "Replace",
    remove: "Remove",
    removeConfirm: (label) => `Remove ${label}. You can add it again later.`,
    empty: "Not added yet",
    updatedAt: "Last updated",
  },
};

export function StudentCareerDocsPanel({
  studentId,
  studentName,
  initialDocuments,
  mode,
  locale,
}: Props) {
  const router = useRouter();
  const isEn = locale === "en";
  const t: CopyDict = isEn ? COPY.en : COPY.ko;

  const [editing, setEditing] = React.useState<CareerDocType | null>(null);
  const [pendingType, setPendingType] = React.useState<CareerDocType | null>(
    null,
  );
  const [feedback, setFeedback] = React.useState<string | null>(null);

  const byType = React.useMemo(() => {
    const map = new Map<CareerDocType, CareerDocument>();
    for (const d of initialDocuments) map.set(d.doc_type, d);
    return map;
  }, [initialDocuments]);

  function onDelete(docType: CareerDocType) {
    const label = DOC_CONFIG[docType].label[isEn ? "en" : "ko"];
    if (!confirm(t.removeConfirm(label))) return;

    setFeedback(null);
    setPendingType(docType);
    void (async () => {
      const result = await deleteCareerDocumentAction({
        student_id: studentId,
        doc_type: docType,
      });
      setPendingType(null);
      if (result.status === "error") {
        setFeedback(
          isEn
            ? `Remove failed. ${result.error}`
            : `삭제 실패. ${result.error}`,
        );
        return;
      }
      router.refresh();
    })();
  }

  function onDownload(docType: CareerDocType) {
    setFeedback(null);
    setPendingType(docType);
    void (async () => {
      const result = await getCareerSignedDownloadUrlAction({
        student_id: studentId,
        doc_type: docType,
      });
      setPendingType(null);
      if (result.status === "error") {
        setFeedback(
          isEn
            ? `Download failed. ${result.error}`
            : `다운로드 실패. ${result.error}`,
        );
        return;
      }
      window.open(result.url, "_blank", "noopener,noreferrer");
    })();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.title}</CardTitle>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {feedback ? (
          <div
            role="status"
            className="rounded-[var(--radius-sm)] bg-[var(--secondary)] px-4 py-2.5 text-sm text-[var(--foreground)]"
          >
            {feedback}
          </div>
        ) : null}

        <div className="divide-y divide-[var(--border)]">
          {CAREER_DOC_TYPES.map((docType) => (
            <DocRow
              key={docType}
              docType={docType}
              doc={byType.get(docType)}
              pending={pendingType === docType}
              locale={locale}
              t={t}
              onEdit={() => setEditing(docType)}
              onDelete={() => onDelete(docType)}
              onDownload={() => onDownload(docType)}
            />
          ))}
        </div>

        {mode === "admin" ? (
          <p className="pt-2 text-[11px] text-[var(--muted-foreground)] leading-relaxed">
            {isEn
              ? "Operator upload: file or link is saved on behalf of the student. Visible to the student."
              : "운영자 대리 업로드. 학생 본인 페이지에도 동일하게 표시됩니다."}
          </p>
        ) : null}
      </CardContent>

      <CareerDocumentEditModal
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        studentId={studentId}
        studentName={studentName}
        docType={editing}
        existing={editing ? (byType.get(editing) ?? null) : null}
        mode={mode}
        onSaved={() => {
          setEditing(null);
          router.refresh();
        }}
      />
    </Card>
  );
}

// ---------- 개별 row ----------

function DocRow({
  docType,
  doc,
  pending,
  locale,
  t,
  onEdit,
  onDelete,
  onDownload,
}: {
  docType: CareerDocType;
  doc: CareerDocument | undefined;
  pending: boolean;
  locale: string;
  t: CopyDict;
  onEdit: () => void;
  onDelete: () => void;
  onDownload: () => void;
}) {
  const isEn = locale === "en";
  const config = DOC_CONFIG[docType];
  const Icon = config.icon;
  const label = config.label[isEn ? "en" : "ko"];
  const cap = config.capLabel[isEn ? "en" : "ko"];
  const mimeHint = config.mimeHint[isEn ? "en" : "ko"];

  return (
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--secondary)] text-[var(--muted-foreground)]">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <h4 className="text-sm font-bold text-[var(--foreground)]">
              {label}
            </h4>
            <span className="text-[11px] text-[var(--muted-foreground)]">
              {cap}
            </span>
          </div>
          {doc ? (
            <DocSummary doc={doc} locale={locale} updatedLabel={t.updatedAt} />
          ) : (
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              {t.empty}. {mimeHint}.
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin text-[var(--muted-foreground)]" />
        ) : null}

        {doc ? (
          <>
            {doc.storage_method === "file_upload" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onDownload}
                disabled={pending}
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                {t.download}
              </Button>
            ) : doc.external_url ? (
              <Button type="button" variant="outline" size="sm" asChild>
                <a
                  href={doc.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  {t.open}
                </a>
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onEdit}
              disabled={pending}
            >
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              {t.replace}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDelete}
              disabled={pending}
              className="text-[var(--destructive)] hover:bg-[var(--destructive)]/10"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              {t.remove}
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              size="sm"
              onClick={onEdit}
              disabled={pending}
              className="bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary)]/90"
            >
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              {t.upload}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onEdit}
              disabled={pending}
            >
              <Link2 className="h-3.5 w-3.5 mr-1.5" />
              {t.addLink}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function DocSummary({
  doc,
  locale,
  updatedLabel,
}: {
  doc: CareerDocument;
  locale: string;
  updatedLabel: string;
}) {
  const d = new Date(doc.updated_at);
  const dateStr = d.toLocaleString(locale === "en" ? "en-US" : "ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  if (doc.storage_method === "external_url" && doc.external_url) {
    return (
      <div className="mt-1 space-y-0.5">
        <p className="truncate text-xs font-mono text-[var(--foreground)]">
          {doc.external_url}
        </p>
        <p className="text-[11px] text-[var(--muted-foreground)]">
          {updatedLabel}. {dateStr}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-1 space-y-0.5">
      <p className="truncate text-xs font-semibold text-[var(--foreground)]">
        <FilePlus2 className="mr-1 inline h-3 w-3 text-[var(--muted-foreground)]" />
        {doc.file_name ?? "(no name)"}
      </p>
      <p className="text-[11px] text-[var(--muted-foreground)]">
        {formatBytes(doc.file_size_bytes)} . {updatedLabel}. {dateStr}
      </p>
    </div>
  );
}

function formatBytes(b: number | null): string {
  if (b == null || b < 0) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}
