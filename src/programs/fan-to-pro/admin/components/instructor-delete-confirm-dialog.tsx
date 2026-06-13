"use client";

import { Modal } from "./modal";
import type { InstructorRow } from "@/src/programs/fan-to-pro/domain/instructor";

const dangerBtn =
  "inline-flex min-h-[40px] items-center justify-center gap-2 bg-red-500 px-4 py-2.5 text-xs font-black uppercase text-fg hover:bg-red-400 disabled:opacity-60";
const ghostBtn =
  "inline-flex min-h-[40px] items-center justify-center border border-border bg-bg px-4 py-2.5 text-xs font-black uppercase text-fg hover:text-fg disabled:opacity-40";
const btnStyle = { letterSpacing: "0.15em" } as const;

export function InstructorDeleteConfirmDialog({
  open,
  busy,
  row,
  onClose,
  onConfirm,
}: {
  open: boolean;
  busy: boolean;
  row: InstructorRow | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!row) return null;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`강사 삭제 / ${row.name}`}
      busy={busy}
      size="sm"
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-fg">
          <span className="font-bold">{row.name}</span> 강사 row 를 삭제할까요?
        </p>
        <p className="text-[11px] text-fg/80">
          이미 정산 기록 또는 세션에 연결된 강사는 삭제할 수 없어요. 그 경우 메모에
          비활성 표시를 권장합니다.
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className={ghostBtn}
            style={btnStyle}
            disabled={busy}
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={dangerBtn}
            style={btnStyle}
            disabled={busy}
          >
            삭제
          </button>
        </div>
      </div>
    </Modal>
  );
}
