"use client";

import { useCallback, useRef } from "react";

/**
 * 이력서 인쇄 trigger button (B0062).
 *
 * iframe id 를 받아 contentWindow.print() 호출 — 부모 page UI 는 인쇄 X,
 * iframe 안의 이력서만 인쇄. 실패 시 window.print() fallback.
 */
export function ResumePrintButton({ iframeId }: { iframeId: string }) {
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
      // 인쇄 dialog 가 닫히면 다시 호출 가능.
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
