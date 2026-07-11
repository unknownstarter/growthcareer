"use client";

/**
 * useSignedUpload — client-side direct upload to Supabase Storage via signed URL.
 *
 * B0067 slice 1: Vercel Server Action bodySizeLimit 우회. Supabase Storage 는
 * signed upload URL 을 PUT 으로 인증 없이 받음 (토큰이 URL 안에 포함).
 *
 * Progress bar 필요 → XMLHttpRequest 사용 (fetch 는 upload progress 미지원).
 *
 * Usage:
 *   const upload = useSignedUpload();
 *   await upload.start(signedUrl, file, mime);
 *   // upload.progress (0~100), upload.status ('idle' | 'uploading' | 'done' | 'error')
 */
import * as React from "react";

export type UploadStatus = "idle" | "uploading" | "done" | "error";

export interface UseSignedUploadResult {
  progress: number;
  status: UploadStatus;
  error: string | null;
  start: (signedUrl: string, file: File, mime: string) => Promise<void>;
  reset: () => void;
}

export function useSignedUpload(): UseSignedUploadResult {
  const [progress, setProgress] = React.useState(0);
  const [status, setStatus] = React.useState<UploadStatus>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const xhrRef = React.useRef<XMLHttpRequest | null>(null);

  const reset = React.useCallback(() => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
    setProgress(0);
    setStatus("idle");
    setError(null);
  }, []);

  const start = React.useCallback(
    (signedUrl: string, file: File, mime: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        setProgress(0);
        setStatus("uploading");
        setError(null);

        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;

        xhr.open("PUT", signedUrl, true);
        // Supabase signed upload URL 은 Content-Type 필수.
        xhr.setRequestHeader("Content-Type", mime);
        // x-upsert 옵션은 signed URL 발급 시 이미 반영 — 여기선 별도 header 불필요.

        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable) {
            const pct = Math.round((evt.loaded / evt.total) * 100);
            setProgress(pct);
          }
        };

        xhr.onload = () => {
          xhrRef.current = null;
          if (xhr.status >= 200 && xhr.status < 300) {
            setProgress(100);
            setStatus("done");
            resolve();
          } else {
            // Supabase 는 실패 body 를 JSON 으로 반환. parse best-effort.
            let msg = `upload_failed_${xhr.status}`;
            try {
              const body = JSON.parse(xhr.responseText);
              if (body?.message) msg = String(body.message);
              else if (body?.error) msg = String(body.error);
            } catch {
              // ignore parse.
            }
            setStatus("error");
            setError(msg);
            reject(new Error(msg));
          }
        };

        xhr.onerror = () => {
          xhrRef.current = null;
          setStatus("error");
          setError("networkError");
          reject(new Error("networkError"));
        };

        xhr.onabort = () => {
          xhrRef.current = null;
          setStatus("error");
          setError("aborted");
          reject(new Error("aborted"));
        };

        xhr.send(file);
      });
    },
    [],
  );

  // unmount 시 in-flight upload abort.
  React.useEffect(() => {
    return () => {
      if (xhrRef.current) xhrRef.current.abort();
    };
  }, []);

  return { progress, status, error, start, reset };
}
