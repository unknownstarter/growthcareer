"use client";

import { useState } from "react";

export function PickButton({
  section,
  option,
  label,
}: {
  section: string;
  option: string;
  label: string;
}) {
  const [picked, setPicked] = useState(false);

  const handleClick = async () => {
    const text = `[picked] ${section}: ${option} — ${label}`;
    try {
      await navigator.clipboard.writeText(text);
      setPicked(true);
      setTimeout(() => setPicked(false), 2500);
    } catch {
      window.prompt("복사 실패 — 아래 텍스트를 직접 복사해서 채팅에 paste 해주세요", text);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`mt-6 w-full border-2 px-6 py-4 font-black text-sm uppercase transition-colors ${
        picked
          ? "border-brand-fuchsia bg-brand-fuchsia text-bg"
          : "border-brand-pink bg-bg text-brand-pink hover:bg-brand-pink hover:text-bg"
      }`}
      style={{ letterSpacing: "0.2em" }}
    >
      {picked ? "✓ 복사됨 — 채팅에 paste" : "이걸 골랐어"}
    </button>
  );
}
