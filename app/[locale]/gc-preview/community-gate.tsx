"use client";

import { useLocale } from "next-intl";
import { type ReactNode, useState } from "react";
import { Button } from "@/src/shared/ui/button";
import { Modal } from "@/src/shared/ui/modal";

/**
 * 커뮤니티 게이트 (프리뷰).
 * 커뮤니티는 수강생 전용이라 라우팅 대신 안내 모달을 연다.
 * GNB 슬롯 주입용 기본 트리거(GNB 텍스트 스타일) + children 으로 커스텀 트리거 주입 가능.
 *
 * variant: 기본 트리거 톤 (triggerClassName 미지정 시).
 *   - "light-clean": 라이트 GNB 텍스트 (기존 gc-preview / insight / press)
 *   - "dark-pixel": 다크 GNB 텍스트 (2기 모집 공통 GNB) — 다른 메뉴 항목과 동일 톤
 * triggerClassName 을 주면 variant 무시하고 그 클래스만 적용 (커스텀 트리거).
 */
const TRIGGER_TONE = {
  "light-clean": "transition-colors duration-150 hover:text-brand-pink",
  "dark-pixel": "text-fg-muted transition-colors duration-150 hover:text-fg",
} as const;

// 트리거 라벨은 공통 영어(GNB/푸터 통일). 모달 내용만 locale 대응.
const MODAL_COPY = {
  ko: {
    title: "커뮤니티",
    body: "커뮤니티는 수강생에게만 공개됩니다",
    ok: "확인",
  },
  en: {
    title: "Community",
    body: "Community is open to enrolled students only.",
    ok: "OK",
  },
} as const;

export function CommunityGate({
  children,
  triggerClassName,
  variant = "light-clean",
}: {
  children?: ReactNode;
  triggerClassName?: string;
  variant?: "light-clean" | "dark-pixel";
}) {
  const [open, setOpen] = useState(false);
  const locale = useLocale();
  const copy = locale === "en" ? MODAL_COPY.en : MODAL_COPY.ko;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={triggerClassName ?? TRIGGER_TONE[variant]}
      >
        {children ?? "Community"}
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={copy.title}
        actions={
          <Button variant="pink-solid" onClick={() => setOpen(false)} className="px-5 py-2.5 text-sm">
            {copy.ok}
          </Button>
        }
      >
        {copy.body}
      </Modal>
    </>
  );
}
