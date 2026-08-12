"use client";

/**
 * Student Photo Upload (B0057).
 *
 * 원티드 식 원형 프로필 사진 + 호버 시 카메라 오버레이.
 *
 * 흐름:
 *   1) [변경] 클릭 → file input.
 *   2) resizeImage (1024x1024 / 0.85 JPEG) — iPhone 4MB → ~300KB.
 *   3) uploadStudentPhotoAction (data URL 전송).
 *   4) 성공 → router.refresh() + 새 signed URL 받아 표시.
 *
 * 삭제:
 *   - 우상단 [X] (사진 있을 때만) → confirm → deleteStudentPhotoAction.
 *
 * 빈 상태:
 *   - 이니셜 (학생 이름 첫 글자) + 회색 배경 (lms tone).
 *
 * 접근성:
 *   - <button type="button"> 으로 모든 클릭 가능 영역 래핑.
 *   - input[type=file] 은 sr-only — label 로 클릭 라벨 제공.
 *   - 삭제 버튼 aria-label.
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, X } from "lucide-react";
import { resizeImage } from "@/src/lib/resize-image";
import { uploadStudentPhotoAction } from "@/src/programs/fan-to-pro/application/student-profile/upload-photo";
import { deleteStudentPhotoAction } from "@/src/programs/fan-to-pro/application/student-profile/delete-photo";

type Props = {
  studentId: string;
  /**
   * 페이지 server component 가 미리 발급한 signed URL (5분 TTL).
   * 업로드 / 삭제 후 router.refresh() 로 새 URL 재발급.
   */
  initialPhotoUrl: string | null;
  /** 빈 상태 placeholder 의 이니셜 추출용 이름. */
  displayName: string;
  /** "ko" | "en". */
  locale: string;
  /** 본인 또는 운영자 모두 사용 — UI 차이만 (라벨). */
  mode?: "self" | "admin";
};

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
type AllowedMime = (typeof ALLOWED_MIME)[number];

const ACCEPT_ATTR = ALLOWED_MIME.join(",");

const COPY = {
  ko: {
    change: "사진 변경",
    upload: "사진 등록",
    remove: "사진 삭제",
    removeConfirm: "사진을 삭제할까요. 다시 등록할 수 있습니다",
    uploading: "업로드 중...",
    sizeError: "파일이 너무 큽니다 (10MB 이내)",
    typeError: "JPG / PNG / WebP 만 업로드 가능합니다",
    hint: "JPG / PNG / WebP, 자동으로 1024x1024 정사각형 안에 맞춰 리사이즈합니다",
    cta: "사진을 등록하면 운영진과 강사가 본인을 더 잘 기억해요",
  },
  en: {
    change: "Change photo",
    upload: "Upload photo",
    remove: "Remove photo",
    removeConfirm: "Remove your photo. You can upload again any time.",
    uploading: "Uploading...",
    sizeError: "File is too large (max 10MB).",
    typeError: "Only JPG / PNG / WebP allowed.",
    hint: "JPG / PNG / WebP. Resized to fit within 1024x1024 automatically.",
    cta:
      "Add a photo so operators and instructors can recognize you more easily.",
  },
} as const;

export function StudentPhotoUpload({
  studentId,
  initialPhotoUrl,
  displayName,
  locale,
  mode = "self",
}: Props) {
  const router = useRouter();
  const isEn = locale === "en";
  const t = isEn ? COPY.en : COPY.ko;
  const [pending, startTransition] = React.useTransition();
  const [photoUrl, setPhotoUrl] = React.useState<string | null>(initialPhotoUrl);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const initial = React.useMemo(() => {
    const trimmed = displayName.trim();
    if (trimmed.length === 0) return "?";
    return trimmed.charAt(0).toUpperCase();
  }, [displayName]);

  React.useEffect(() => {
    setPhotoUrl(initialPhotoUrl);
  }, [initialPhotoUrl]);

  function pickFile() {
    setError(null);
    fileInputRef.current?.click();
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    // input value reset — 같은 파일 다시 선택 가능.
    e.target.value = "";
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError(t.sizeError);
      return;
    }
    if (!ALLOWED_MIME.includes(file.type as AllowedMime)) {
      setError(t.typeError);
      return;
    }

    startTransition(async () => {
      setError(null);
      try {
        // 리사이즈 — 항상 JPEG 으로 통일 (용량 + 호환성).
        const resized = await resizeImage(file, {
          maxWidth: 1024,
          maxHeight: 1024,
          quality: 0.85,
          outputMime: "image/jpeg",
        });

        const result = await uploadStudentPhotoAction({
          student_id: studentId,
          mime: "image/jpeg",
          file_data_url: resized.dataUrl,
        });

        if (result.status === "error") {
          setError(
            isEn
              ? `Upload failed. ${result.error}`
              : `업로드 실패. ${result.error}`,
          );
          return;
        }

        // 즉시 미리보기 (data URL) + 백엔드 refresh.
        setPhotoUrl(resized.dataUrl);
        router.refresh();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "unknown";
        setError(isEn ? `Resize failed. ${msg}` : `리사이즈 실패. ${msg}`);
      }
    });
  }

  function onRemove() {
    if (!photoUrl) return;
    if (!confirm(t.removeConfirm)) return;

    startTransition(async () => {
      setError(null);
      const result = await deleteStudentPhotoAction({ student_id: studentId });
      if (result.status === "error") {
        setError(
          isEn
            ? `Remove failed. ${result.error}`
            : `삭제 실패. ${result.error}`,
        );
        return;
      }
      setPhotoUrl(null);
      router.refresh();
    });
  }

  const ariaLabelPick = photoUrl ? t.change : t.upload;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <button
          type="button"
          onClick={pickFile}
          disabled={pending}
          aria-label={ariaLabelPick}
          className="group relative h-32 w-32 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--secondary)] shadow-sm transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-wait"
        >
          {photoUrl ? (
            // 사용자 업로드 — Next/Image 사용 X (signed URL + data URL 양쪽 대응).
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt={displayName}
              className="h-full w-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[var(--secondary)] text-3xl font-bold text-[var(--muted-foreground)]">
              {initial}
            </div>
          )}

          {/* hover overlay — 사진 있을 때만 카메라 + "변경" 노출. */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition-all group-hover:bg-black/45 group-hover:opacity-100 group-focus-visible:bg-black/45 group-focus-visible:opacity-100">
            {pending ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="flex flex-col items-center gap-1">
                <Camera className="h-5 w-5" />
                <span className="text-[11px] font-semibold">
                  {photoUrl ? t.change : t.upload}
                </span>
              </div>
            )}
          </div>

          {/* pending state — 호버 안 해도 spinner 노출 (빈 상태 포함). */}
          {pending ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/35 text-white">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : null}
        </button>

        {photoUrl ? (
          <button
            type="button"
            onClick={onRemove}
            disabled={pending}
            aria-label={t.remove}
            className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)] shadow-sm transition-colors hover:bg-[var(--destructive)] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--destructive)] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>
        ) : null}

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_ATTR}
          onChange={onFile}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>

      <div className="max-w-[16rem] text-center">
        <p className="text-[11px] leading-relaxed text-[var(--muted-foreground)]">
          {photoUrl ? t.hint : t.cta}
        </p>
        {!photoUrl ? (
          <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">{t.hint}</p>
        ) : null}
        {error ? (
          <p
            role="alert"
            className="mt-2 text-xs font-medium text-[var(--destructive)]"
          >
            {error}
          </p>
        ) : null}
        {/* mode 라벨 — admin 일 때만 안내, self 일 때 숨김. */}
        {mode === "admin" && !photoUrl ? (
          <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">
            {isEn ? "Operator can upload on behalf" : "운영자가 대리 업로드 가능"}
          </p>
        ) : null}
      </div>
    </div>
  );
}
