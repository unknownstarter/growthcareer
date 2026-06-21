"use client";

/**
 * Career Documents Panel — 3 카드 (resume / cover_letter / portfolio).
 *
 * admin surface + student surface 양쪽에서 재사용. props 로 학생 식별자 + 초기
 * 데이터 + 표시 모드 ('admin' | 'self') 받음.
 *
 * 작업:
 *   - 빈 카드: [등록] 버튼 → modal.
 *   - 채워진 카드: 링크/파일 표시 + [수정] / [삭제] / [다운로드(파일일 때)] 버튼.
 *
 * 권한 검증은 server action 의 assertCanAccessStudentCareer 가 담당 — UI 는
 * 버튼 노출만 결정.
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Download, FileText, Pencil, Trash2, Plus } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/card";
import { Button } from "@/src/programs/fan-to-pro/interface/components/lms/ui/button";
import { Badge } from "@/src/programs/fan-to-pro/interface/components/lms/ui/badge";
import {
  CAREER_DOC_TYPES,
  CAREER_DOC_LABELS,
  CAREER_DOC_DESCRIPTIONS,
  type CareerDocType,
  type CareerDocument,
} from "@/src/programs/fan-to-pro/domain/entities/career-document";
import { CareerDocumentEditModal } from "@/src/programs/fan-to-pro/interface/components/lms/career/career-document-edit-modal";
import { deleteCareerDocumentAction } from "@/src/programs/fan-to-pro/application/career/delete-document";
import { getCareerSignedDownloadUrlAction } from "@/src/programs/fan-to-pro/application/career/get-signed-download-url";

type Props = {
  studentId: string;
  studentName: string;
  initialDocuments: CareerDocument[];
  mode: "admin" | "self";
};

export function CareerDocumentsPanel({
  studentId,
  studentName,
  initialDocuments,
  mode,
}: Props) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<CareerDocType | null>(null);
  const [pending, startTransition] = React.useTransition();
  const [feedback, setFeedback] = React.useState<string | null>(null);

  // 빠른 lookup.
  const byType = React.useMemo(() => {
    const map = new Map<CareerDocType, CareerDocument>();
    for (const d of initialDocuments) map.set(d.doc_type, d);
    return map;
  }, [initialDocuments]);

  function onDelete(docType: CareerDocType) {
    if (
      !confirm(
        `${CAREER_DOC_LABELS[docType]} 을(를) 삭제할까요. 다시 등록할 수 있습니다.`,
      )
    )
      return;
    setFeedback(null);
    startTransition(async () => {
      const result = await deleteCareerDocumentAction({
        student_id: studentId,
        doc_type: docType,
      });
      if (result.status === "error") {
        setFeedback(`삭제 실패. ${result.error}`);
        return;
      }
      setFeedback(`${CAREER_DOC_LABELS[docType]} 삭제 완료.`);
      router.refresh();
    });
  }

  function onDownload(docType: CareerDocType) {
    setFeedback(null);
    startTransition(async () => {
      const result = await getCareerSignedDownloadUrlAction({
        student_id: studentId,
        doc_type: docType,
      });
      if (result.status === "error") {
        setFeedback(`다운로드 실패. ${result.error}`);
        return;
      }
      // 새 탭으로. signed URL 은 1 시간 유효.
      window.open(result.url, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <div className="space-y-4">
      {feedback ? (
        <div className="rounded-[var(--radius-sm)] bg-[var(--secondary)] px-4 py-3 text-sm text-[var(--foreground)]">
          {feedback}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        {CAREER_DOC_TYPES.map((docType) => {
          const doc = byType.get(docType);
          return (
            <CareerCard
              key={docType}
              docType={docType}
              doc={doc}
              pending={pending}
              onEdit={() => setEditing(docType)}
              onDelete={() => onDelete(docType)}
              onDownload={() => onDownload(docType)}
            />
          );
        })}
      </div>

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
    </div>
  );
}

function CareerCard({
  docType,
  doc,
  pending,
  onEdit,
  onDelete,
  onDownload,
}: {
  docType: CareerDocType;
  doc: CareerDocument | undefined;
  pending: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDownload: () => void;
}) {
  const label = CAREER_DOC_LABELS[docType];
  const description = CAREER_DOC_DESCRIPTIONS[docType];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>{label}</CardTitle>
          {doc ? (
            <Badge
              variant="outline"
              className="bg-[var(--primary)]/10 text-[var(--primary)] border-0"
            >
              등록됨
            </Badge>
          ) : (
            <Badge variant="outline">미등록</Badge>
          )}
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {doc ? (
          <>
            <DocBody doc={doc} />
            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onEdit}
                disabled={pending}
              >
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                수정
              </Button>
              {doc.storage_method === "file_upload" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onDownload}
                  disabled={pending}
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  다운로드
                </Button>
              ) : doc.external_url ? (
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={doc.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                    열기
                  </a>
                </Button>
              ) : null}
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                disabled={pending}
                className="text-[var(--destructive)] hover:bg-[var(--destructive)]/10"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                삭제
              </Button>
            </div>
          </>
        ) : (
          <div className="pt-2">
            <Button onClick={onEdit} disabled={pending} className="h-10 px-4">
              <Plus className="h-4 w-4 mr-1.5" />
              등록
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DocBody({ doc }: { doc: CareerDocument }) {
  if (doc.storage_method === "external_url") {
    return (
      <div className="space-y-2">
        <div className="flex items-start gap-2 text-sm">
          <ExternalLink className="h-4 w-4 mt-0.5 shrink-0 text-[var(--muted-foreground)]" />
          <span className="font-mono text-xs break-all text-[var(--foreground)]">
            {doc.external_url}
          </span>
        </div>
        <UpdatedAt updatedAt={doc.updated_at} />
        {doc.notes ? <Notes notes={doc.notes} /> : null}
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2 text-sm">
        <FileText className="h-4 w-4 mt-0.5 shrink-0 text-[var(--muted-foreground)]" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[var(--foreground)] truncate">
            {doc.file_name ?? "(파일명 없음)"}
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">
            {formatBytes(doc.file_size_bytes)}
          </p>
        </div>
      </div>
      <UpdatedAt updatedAt={doc.updated_at} />
      {doc.notes ? <Notes notes={doc.notes} /> : null}
    </div>
  );
}

function UpdatedAt({ updatedAt }: { updatedAt: string }) {
  const d = new Date(updatedAt);
  return (
    <p className="text-xs text-[var(--muted-foreground)]">
      마지막 수정. {d.toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" })}
    </p>
  );
}

function Notes({ notes }: { notes: string }) {
  return (
    <p className="text-xs text-[var(--muted-foreground)] whitespace-pre-wrap line-clamp-3">
      {notes}
    </p>
  );
}

function formatBytes(b: number | null): string {
  if (b == null) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}
