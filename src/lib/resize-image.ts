/**
 * Client-side image resize helper (B0057).
 *
 * 학생 사진 / 프로필 이미지 업로드 전에 브라우저에서 리사이즈 + 압축.
 * 모바일에서 4MB iPhone 원본 → ~200~500KB JPEG 로 떨어뜨려 server action body
 * limit (Vercel 4.5MB) 안에 안전하게 들어가게 함.
 *
 * EXIF orientation 처리:
 *   - 모던 브라우저 (Chrome 81+, Safari 16+, FF 77+) 는 createImageBitmap()
 *     의 imageOrientation: "from-image" 옵션으로 EXIF 자동 회전.
 *   - 그 외 fallback (Image element) — drawImage 가 EXIF 무시 → iPhone
 *     세로 사진이 가로로 누워서 저장됨. 1기 운영 중에는 모던 브라우저만 지원
 *     공지로 처리 (Echo 별도 확인 권장).
 *
 * 출력:
 *   - data URL string ("data:image/jpeg;base64,...").
 *   - server action 의 file_data_url 필드에 그대로 전달.
 *
 * 사용 예:
 *   const dataUrl = await resizeImage(file, { maxWidth: 1024, maxHeight: 1024, quality: 0.85 });
 *   await uploadStudentPhotoAction({ student_id, mime: "image/jpeg", file_data_url: dataUrl });
 */

export type ResizeOptions = {
  /** 결과 최대 가로 px. 비율은 유지. */
  maxWidth: number;
  /** 결과 최대 세로 px. 비율은 유지. */
  maxHeight: number;
  /** JPEG quality 0~1. 0.85 권장 (시각적 차이 거의 없음, 용량 큼직). */
  quality: number;
  /** 출력 MIME — 기본 image/jpeg. PNG 는 quality 무시 + 용량 큼. */
  outputMime?: "image/jpeg" | "image/webp" | "image/png";
};

export type ResizeResult = {
  /** data URL. server action 의 file_data_url 로 전송. */
  dataUrl: string;
  /** base64 payload bytes 추정값 (디버깅 용). */
  estimatedBytes: number;
  /** 결과 가로 px. */
  width: number;
  /** 결과 세로 px. */
  height: number;
  /** 출력 MIME. */
  mime: "image/jpeg" | "image/webp" | "image/png";
};

/**
 * File → 리사이즈된 data URL 변환.
 *
 * 동작:
 *   1) createImageBitmap (imageOrientation: from-image) 로 EXIF 보정된 bitmap.
 *      미지원 브라우저는 Image element fallback (EXIF 안 함).
 *   2) maxWidth / maxHeight 안에 들어가도록 비율 유지하며 scale 계산.
 *   3) OffscreenCanvas 우선 (메인스레드 부담 적음). 미지원이면 일반 canvas.
 *   4) toDataURL (quality) 로 base64 인코딩.
 */
export async function resizeImage(
  file: File,
  options: ResizeOptions,
): Promise<ResizeResult> {
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("invalidFile");
  }

  const outputMime = options.outputMime ?? "image/jpeg";

  // 1. EXIF 보정 bitmap.
  const bitmap = await loadBitmapWithExif(file);

  try {
    // 2. scale 계산.
    const { width, height } = fitInside(
      bitmap.width,
      bitmap.height,
      options.maxWidth,
      options.maxHeight,
    );

    // 3. canvas 에 draw.
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvasContextUnavailable");

    // 화질 우선 smoothing.
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.drawImage(bitmap, 0, 0, width, height);

    // 4. data URL.
    const dataUrl = await canvasToDataUrl(canvas, outputMime, options.quality);

    return {
      dataUrl,
      estimatedBytes: estimateBytesFromDataUrl(dataUrl),
      width,
      height,
      mime: outputMime,
    };
  } finally {
    // bitmap close — 메모리 즉시 해제.
    if (bitmap instanceof ImageBitmap) {
      bitmap.close();
    }
  }
}

// ---------- 내부 ----------

type Bitmap = ImageBitmap | HTMLImageElement;

async function loadBitmapWithExif(file: File): Promise<Bitmap> {
  // createImageBitmap + imageOrientation: from-image — EXIF 자동 적용.
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, {
        imageOrientation: "from-image",
      });
    } catch {
      // 일부 브라우저 (Safari 구버전) 가 imageOrientation 옵션 미지원
      // → 옵션 없이 한 번 더 시도. EXIF 미적용 (회전 이슈 가능성).
      try {
        return await createImageBitmap(file);
      } catch {
        // 아예 createImageBitmap 자체 실패 — fallback.
      }
    }
  }
  return await loadImageElement(file);
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("fileReadFailed"));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("imageDecodeFailed"));
      img.src = typeof reader.result === "string" ? reader.result : "";
    };
    reader.readAsDataURL(file);
  });
}

function fitInside(
  srcW: number,
  srcH: number,
  maxW: number,
  maxH: number,
): { width: number; height: number } {
  if (srcW <= maxW && srcH <= maxH) {
    return { width: srcW, height: srcH };
  }
  const ratio = Math.min(maxW / srcW, maxH / srcH);
  return {
    width: Math.round(srcW * ratio),
    height: Math.round(srcH * ratio),
  };
}

type DrawableCanvas = HTMLCanvasElement | OffscreenCanvas;

function createCanvas(width: number, height: number): DrawableCanvas {
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(width, height);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

async function canvasToDataUrl(
  canvas: DrawableCanvas,
  mime: string,
  quality: number,
): Promise<string> {
  if (canvas instanceof HTMLCanvasElement) {
    return canvas.toDataURL(mime, quality);
  }
  // OffscreenCanvas → convertToBlob → FileReader → dataURL.
  const blob = await canvas.convertToBlob({ type: mime, quality });
  return await blobToDataUrl(blob);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("blobReadFailed"));
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("blobReadInvalid"));
    reader.readAsDataURL(blob);
  });
}

function estimateBytesFromDataUrl(dataUrl: string): number {
  const idx = dataUrl.indexOf(",");
  if (idx < 0) return 0;
  const base64 = dataUrl.slice(idx + 1);
  // base64 인코딩 4 chars → 3 bytes.
  const padding = (base64.endsWith("==") ? 2 : 0) + (base64.endsWith("=") ? 1 : 0);
  return Math.floor((base64.length * 3) / 4) - padding;
}
