"use client";

/**
 * Cohort Materials Dashboard (B0044 LMS Launch Phase 2 — admin).
 *
 * /[locale]/fan-to-pro/admin/cohorts/[cohortSlug]/materials.
 *
 * 운영자가 회차별 자료를 업로드 / list / 삭제.
 *
 * 디자인:
 *   - 회차 (week_number) 기준 grouping (1~8 + 미지정)
 *   - 추가 모달: storage_method (file_upload / external_url) 분기
 *   - 다운로드: getMaterialDownloadUrlAction → window.open(new tab, noopener)
 *   - 삭제: confirm + deleteLectureMaterialAction
 *
 * 보안:
 *   - external_url 은 SSRF 가드 (server action) 의존 — UI 는 https 만 권유
 *   - 다운로드 새 탭 `noopener,noreferrer` (Sage MED-2)
 *   - title / description / file_name 은 React default escape — 안전
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  Download,
  ExternalLink,
  FileText,
  Upload,
  Link2,
} from "lucide-react";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/dialog";
import { createLectureUploadUrlAction } from "@/src/programs/fan-to-pro/application/lecture-material/create-signed-upload-url";
import { finalizeMaterialUploadAction } from "@/src/programs/fan-to-pro/application/lecture-material/finalize-material-upload";
import { saveMaterialExternalUrlAction } from "@/src/programs/fan-to-pro/application/lecture-material/save-material-external-url";
import { deleteLectureMaterialAction } from "@/src/programs/fan-to-pro/application/lecture-material/delete-material";
import { getMaterialDownloadUrlAction } from "@/src/programs/fan-to-pro/application/lecture-material/get-material-download-url";
import { useSignedUpload } from "@/src/programs/fan-to-pro/interface/hooks/use-signed-upload";
import {
  STAGGER_ITEM_CLASS,
  staggerDelay,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/stagger";
import {
  MAX_LECTURE_FILE_SIZE_BYTES,
  MAX_WEEK_NUMBER,
  MIN_WEEK_NUMBER,
  type LectureMaterial,
  type LectureMaterialVisibility,
} from "@/src/programs/fan-to-pro/domain/entities/lecture-material";

type Props = {
  cohortId: string;
  cohortName: string;
  initialMaterials: LectureMaterial[];
};

type StorageMethod = "file_upload" | "external_url";

const VISIBILITY_LABEL: Record<LectureMaterialVisibility, string> = {
  draft: "비공개",
  scheduled: "예약",
  published: "공개",
  archived: "보관",
};

const VISIBILITY_VARIANT: Record<
  LectureMaterialVisibility,
  "default" | "secondary" | "outline" | "success" | "warning"
> = {
  draft: "outline",
  scheduled: "warning",
  published: "success",
  archived: "secondary",
};

export function CohortMaterialsDashboard({
  cohortId,
  cohortName,
  initialMaterials,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [open, setOpen] = React.useState(false);
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // 회차별 grouping (1~MAX_WEEK_NUMBER + 미지정).
  const grouped = React.useMemo(() => {
    const map = new Map<number | "unassigned", LectureMaterial[]>();
    for (const m of initialMaterials) {
      const key: number | "unassigned" =
        typeof m.week_number === "number" ? m.week_number : "unassigned";
      const arr = map.get(key) ?? [];
      arr.push(m);
      map.set(key, arr);
    }
    return map;
  }, [initialMaterials]);

  // 회차 정렬: 1, 2, 3, ..., unassigned.
  const sortedWeeks: Array<number | "unassigned"> = React.useMemo(() => {
    const weeks = Array.from(grouped.keys()).filter(
      (k): k is number => typeof k === "number",
    );
    weeks.sort((a, b) => a - b);
    const result: Array<number | "unassigned"> = [...weeks];
    if (grouped.has("unassigned")) result.push("unassigned");
    return result;
  }, [grouped]);

  function reset() {
    setOpen(false);
    setErrorMsg(null);
    router.refresh();
  }

  function onDelete(materialId: string, title: string) {
    if (
      !confirm(
        `"${title}" 자료를 삭제할까요. 파일도 함께 영구 삭제됩니다.`,
      )
    ) {
      return;
    }
    setFeedback(null);
    startTransition(async () => {
      const result = await deleteLectureMaterialAction({
        material_id: materialId,
      });
      if (result.status === "error") {
        setFeedback(`삭제 실패. ${result.error}`);
        return;
      }
      setFeedback("자료 삭제 완료.");
      router.refresh();
    });
  }

  function onDownload(materialId: string) {
    setFeedback(null);
    startTransition(async () => {
      const result = await getMaterialDownloadUrlAction({
        material_id: materialId,
      });
      if (result.status === "error") {
        setFeedback(`다운로드 실패. ${result.error}`);
        return;
      }
      // 새 탭으로 — noopener,noreferrer (Sage MED-2 referer leak 차단).
      window.open(result.url, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <div className="space-y-6">
      {/* 상단 액션 카드 */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <CardTitle>강의 자료 ({initialMaterials.length}개)</CardTitle>
              <CardDescription>
                {cohortName}. 회차별로 파일 또는 외부 링크를 등록합니다.
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
                <UploadDialogContent
                  cohortId={cohortId}
                  pending={pending}
                  startTransition={startTransition}
                  errorMsg={errorMsg}
                  setErrorMsg={setErrorMsg}
                  onSuccess={reset}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {feedback ? (
            <div className="mb-4 rounded-[var(--radius-sm)] bg-[var(--secondary)] px-4 py-3 text-sm text-[var(--foreground)]">
              {feedback}
            </div>
          ) : null}

          {initialMaterials.length === 0 ? (
            <p className="py-10 text-center text-sm text-[var(--muted-foreground)]">
              아직 등록된 강의 자료가 없습니다. 위 [자료 추가] 버튼으로 첫
              자료를 올려주세요.
            </p>
          ) : (
            <div className="space-y-8">
              {sortedWeeks.map((week) => {
                const items = grouped.get(week) ?? [];
                return (
                  <section key={String(week)} className="space-y-3">
                    <h3 className="text-sm font-bold text-[var(--foreground)]">
                      {week === "unassigned"
                        ? "회차 미지정"
                        : `${week}주차`}
                      <span className="ml-2 text-xs font-medium text-[var(--muted-foreground)]">
                        {items.length}개
                      </span>
                    </h3>
                    <div className="space-y-2">
                      {items.map((m, i) => (
                        <MaterialRow
                          key={m.id}
                          index={i}
                          material={m}
                          pending={pending}
                          onDelete={() => onDelete(m.id, m.title)}
                          onDownload={() => onDownload(m.id)}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MaterialRow({
  material,
  pending,
  index,
  onDelete,
  onDownload,
}: {
  material: LectureMaterial;
  pending: boolean;
  index: number;
  onDelete: () => void;
  onDownload: () => void;
}) {
  const isFile = material.storage_method === "file_upload";
  const Icon = isFile ? FileText : ExternalLink;
  return (
    <div
      className={`flex items-start gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 ${STAGGER_ITEM_CLASS}`}
      style={staggerDelay(index)}
    >
      <Icon
        className="h-5 w-5 text-[var(--muted-foreground)] shrink-0 mt-0.5"
        aria-hidden
      />
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-[var(--foreground)] truncate">
            {material.title}
          </p>
          <Badge variant={VISIBILITY_VARIANT[material.visibility]}>
            {VISIBILITY_LABEL[material.visibility]}
          </Badge>
        </div>
        {material.description ? (
          <p className="text-xs text-[var(--muted-foreground)] line-clamp-2">
            {material.description}
          </p>
        ) : null}
        <p className="text-xs text-[var(--muted-foreground)]">
          {isFile ? (
            <>
              {material.file_name ?? "파일"}
              {material.file_size_bytes != null
                ? ` / ${formatBytes(material.file_size_bytes)}`
                : ""}
            </>
          ) : (
            <span className="truncate inline-block max-w-[480px] align-middle">
              {material.external_url}
            </span>
          )}
          {material.created_at ? (
            <>
              {" / "}
              {new Date(material.created_at).toLocaleDateString("ko-KR", {
                month: "short",
                day: "numeric",
              })}
            </>
          ) : null}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={onDownload}
          aria-label="다운로드 또는 외부 링크 열기"
          title="다운로드"
        >
          <Download className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={onDelete}
          aria-label="자료 삭제"
          title="삭제"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function UploadDialogContent({
  cohortId,
  pending,
  startTransition,
  errorMsg,
  setErrorMsg,
  onSuccess,
}: {
  cohortId: string;
  pending: boolean;
  startTransition: React.TransitionStartFunction;
  errorMsg: string | null;
  setErrorMsg: (v: string | null) => void;
  onSuccess: () => void;
}) {
  const [method, setMethod] = React.useState<StorageMethod>("file_upload");
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const upload = useSignedUpload();

  /**
   * Signed URL 흐름 (B0067 slice 1):
   *   1) create-signed-upload-url → { path, signed_url, material_id }
   *   2) xhr PUT signed_url (progress bar)
   *   3) finalize-material-upload → DB INSERT
   *
   * pending state = useTransition (finalize) OR upload.status === 'uploading'.
   */
  function onSubmitFile(formData: FormData) {
    setErrorMsg(null);
    upload.reset();

    // file client-side 검증 (hint — 서버 재검증).
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setErrorMsg("파일을 선택해주세요.");
      return;
    }
    if (file.size > MAX_LECTURE_FILE_SIZE_BYTES) {
      setErrorMsg(
        `파일 크기는 ${formatBytes(MAX_LECTURE_FILE_SIZE_BYTES)} 이하여야 합니다.`,
      );
      return;
    }

    const title = String(formData.get("title") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim() || null;
    const weekRaw = formData.get("week_number");
    const week =
      typeof weekRaw === "string" && weekRaw.length > 0 ? Number(weekRaw) : null;
    const visibilityRaw =
      String(formData.get("visibility") ?? "published").trim() || "published";

    if (!title) {
      setErrorMsg("제목은 필수입니다.");
      return;
    }

    startTransition(async () => {
      // step 1) signed URL 발급
      const signed = await createLectureUploadUrlAction({
        cohort_id: cohortId,
        week_number: week,
        file_name: file.name,
        mime_type: file.type || "application/octet-stream",
        file_size_bytes: file.size,
      });
      if (signed.status === "error") {
        setErrorMsg(translateError(signed.error));
        return;
      }

      // step 2) client direct upload with progress
      try {
        await upload.start(
          signed.signed_url,
          file,
          file.type || "application/octet-stream",
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "uploadFailed";
        setErrorMsg(translateError(msg));
        return;
      }

      // step 3) finalize (DB INSERT)
      const finalized = await finalizeMaterialUploadAction({
        material_id: signed.material_id,
        cohort_id: cohortId,
        week_number: week,
        title,
        description,
        visibility: visibilityRaw as LectureMaterialVisibility,
        path: signed.path,
        file_name: file.name,
        mime_type: file.type || "application/octet-stream",
        file_size_bytes: file.size,
      });
      if (finalized.status === "error") {
        setErrorMsg(translateError(finalized.error));
        return;
      }

      onSuccess();
    });
  }

  function onSubmitUrl(formData: FormData) {
    setErrorMsg(null);
    const externalUrl = String(formData.get("external_url") ?? "").trim();
    const title = String(formData.get("title") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim() || null;
    const weekRaw = formData.get("week_number");
    const visibilityRaw =
      String(formData.get("visibility") ?? "published").trim() || "published";
    const week =
      typeof weekRaw === "string" && weekRaw.length > 0
        ? Number(weekRaw)
        : null;

    if (!externalUrl || !title) {
      setErrorMsg("제목과 URL 은 필수입니다.");
      return;
    }
    if (!/^https:\/\//i.test(externalUrl)) {
      setErrorMsg("외부 URL 은 https:// 로 시작해야 합니다.");
      return;
    }

    startTransition(async () => {
      const result = await saveMaterialExternalUrlAction({
        cohort_id: cohortId,
        title,
        description,
        week_number: week,
        external_url: externalUrl,
        visibility: visibilityRaw as LectureMaterialVisibility,
      });
      if (result.status === "error") {
        setErrorMsg(translateError(result.error));
        return;
      }
      onSuccess();
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>자료 추가</DialogTitle>
        <DialogDescription>
          파일 직접 업로드 또는 외부 링크 (Google Drive / Notion / YouTube)
          중 선택합니다.
        </DialogDescription>
      </DialogHeader>

      {/* method 토글 */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className={`flex items-center justify-center gap-2 rounded-[var(--radius-sm)] border px-4 py-3 text-sm font-semibold transition-colors ${
            method === "file_upload"
              ? "border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--primary)]"
              : "border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)] hover:bg-[var(--secondary)]"
          }`}
          onClick={() => {
            setMethod("file_upload");
            setErrorMsg(null);
            // 노아 UX fix (2026-07-11): 탭 클릭 시 파일 선택 dialog 자동 트리거.
            // React state 반영 후 다음 tick 에서 click (Input 렌더 대기).
            setTimeout(() => fileInputRef.current?.click(), 0);
          }}
          disabled={pending}
        >
          <Upload className="h-4 w-4" />
          파일 업로드
        </button>
        <button
          type="button"
          className={`flex items-center justify-center gap-2 rounded-[var(--radius-sm)] border px-4 py-3 text-sm font-semibold transition-colors ${
            method === "external_url"
              ? "border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--primary)]"
              : "border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)] hover:bg-[var(--secondary)]"
          }`}
          onClick={() => {
            setMethod("external_url");
            setErrorMsg(null);
          }}
          disabled={pending}
        >
          <Link2 className="h-4 w-4" />
          외부 링크
        </button>
      </div>

      {errorMsg ? (
        <div className="rounded-[var(--radius-sm)] bg-[#fee4e2] px-4 py-3 text-sm text-[#b42318]">
          {errorMsg}
        </div>
      ) : null}

      {method === "file_upload" ? (
        <form action={onSubmitFile} className="space-y-4">
          <CommonFields />
          <div className="space-y-1.5">
            <Label htmlFor="file" className="text-xs">
              파일 (최대 500MB) *
            </Label>
            <Input
              id="file"
              name="file"
              type="file"
              required
              disabled={pending}
              ref={fileInputRef}
            />
            <p className="text-[11px] text-[var(--muted-foreground)]">
              브라우저에서 Supabase Storage 로 직접 업로드합니다. 대용량 파일 지원.
            </p>
          </div>

          {/* Progress bar — upload 진행 중일 때만 노출. */}
          {upload.status === "uploading" ? (
            <UploadProgressBar progress={upload.progress} />
          ) : upload.status === "done" && pending ? (
            <UploadProgressBar progress={100} finalizing />
          ) : null}

          <DialogFooter>
            <Button type="submit" disabled={pending} className="h-12 px-6">
              {pending
                ? upload.status === "uploading"
                  ? `업로드 중 ${upload.progress}%`
                  : upload.status === "done"
                    ? "저장 중..."
                    : "준비 중..."
                : "업로드"}
            </Button>
          </DialogFooter>
        </form>
      ) : (
        <form action={onSubmitUrl} className="space-y-4">
          <CommonFields />
          <div className="space-y-1.5">
            <Label htmlFor="external_url" className="text-xs">
              외부 URL (https) *
            </Label>
            <Input
              id="external_url"
              name="external_url"
              type="url"
              required
              placeholder="https://drive.google.com/..."
              disabled={pending}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending} className="h-12 px-6">
              {pending ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </form>
      )}
    </>
  );
}

function CommonFields() {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="title" className="text-xs">
          제목 *
        </Label>
        <Input
          id="title"
          name="title"
          required
          maxLength={200}
          placeholder="1주차 강의 자료"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="week_number" className="text-xs">
            회차
          </Label>
          <select
            id="week_number"
            name="week_number"
            defaultValue=""
            className="h-12 w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
          >
            <option value="">미지정</option>
            {Array.from(
              { length: MAX_WEEK_NUMBER - MIN_WEEK_NUMBER + 1 },
              (_, i) => MIN_WEEK_NUMBER + i,
            ).map((w) => (
              <option key={w} value={w}>
                {w}주차
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="visibility" className="text-xs">
            공개 상태
          </Label>
          <select
            id="visibility"
            name="visibility"
            defaultValue="published"
            className="h-12 w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
          >
            <option value="published">공개</option>
            <option value="draft">비공개 (운영자만)</option>
            <option value="archived">보관</option>
          </select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description" className="text-xs">
          설명 (선택)
        </Label>
        <Textarea
          id="description"
          name="description"
          rows={3}
          maxLength={1000}
          placeholder="학생들이 받을 자료에 대한 간단한 설명"
        />
      </div>
    </>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function translateError(code: string): string {
  switch (code) {
    case "fileMissing":
      return "파일을 선택해주세요.";
    case "fileEmpty":
      return "빈 파일은 업로드할 수 없습니다.";
    case "fileTooLarge":
      return "파일 크기는 500MB 이하여야 합니다.";
    case "fileTooLargeForServerAction":
      return "이 파일은 크기가 커서 새 업로드 경로로 다시 시도해주세요. (100MB 초과)";
    case "mimeMissing":
      return "파일 형식을 인식할 수 없습니다.";
    case "invalidInput":
    case "invalidFileName":
      return "입력값을 확인해주세요.";
    case "forbidden":
      return "권한이 없습니다.";
    case "signedUrlFailed":
      return "업로드 준비 실패. 잠시 후 다시 시도해주세요.";
    case "supabaseUnavailable":
      return "저장소가 일시 사용 불가입니다. 잠시 후 다시 시도해주세요.";
    case "pathCohortMismatch":
      return "잘못된 업로드 경로입니다.";
    case "objectMissing":
      return "업로드된 파일을 찾을 수 없습니다. 다시 시도해주세요.";
    case "sizeMismatch":
      return "파일 크기 검증 실패. 다시 시도해주세요.";
    case "networkError":
      return "네트워크 오류. 연결 확인 후 다시 시도해주세요.";
    case "aborted":
      return "업로드가 취소되었습니다.";
    default:
      return `오류. ${code}`;
  }
}

/**
 * Upload progress bar (인터렉션 §6.7).
 *   - 진행 중: 파란 채움 + % 텍스트
 *   - finalizing: 100% 유지 + "저장 중..." 표시 (Storage upload 는 끝, DB INSERT 대기)
 */
function UploadProgressBar({
  progress,
  finalizing,
}: {
  progress: number;
  finalizing?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
        <span>{finalizing ? "저장 중..." : "업로드 중..."}</span>
        <span className="tabular-nums">{progress}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--secondary)]">
        <div
          className="h-full bg-[var(--primary)] transition-all duration-200 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
