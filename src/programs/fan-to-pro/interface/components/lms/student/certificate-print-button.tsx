"use client";

/**
 * 수료증 인쇄 trigger button (B0081).
 *
 * iframe id 를 받아 contentWindow.print() 호출 — 부모 page UI 는 인쇄 X,
 * iframe 안의 수료증만 인쇄. resume-print-button.tsx 와 동일 패턴.
 */
import { useCallback, useRef } from "react";

export function CertificatePrintButton({ iframeId }: { iframeId: string }) {
  const inFlightRef = useRef(false);

  const handlePrint = useCallback(() => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const iframe = document.getElementById(iframeId) as HTMLIFrameElement | null;
      if (iframe?.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } else {
        window.print();
      }
    } finally {
      setTimeout(() => {
        inFlightRef.current = false;
      }, 500);
    }
  }, [iframeId]);

  return (
    <button
      type="button"
      onClick={handlePrint}
      className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
    >
      PDF 로 저장 / 인쇄
    </button>
  );
}
