import { cn } from "@/src/programs/fan-to-pro/presentation/components/cn";
import type { ApplicantStatus } from "../types";

/**
 * B0018 Wave 1 T3 - PII 파기된 row 의 시각 분기 chip.
 * status chip 옆에 함께 노출.
 */
export function RedactedChip({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 border border-zinc-600 bg-zinc-800/60 px-2 py-0.5 text-[10px] font-black uppercase text-zinc-400 whitespace-nowrap",
        className,
      )}
      style={{ letterSpacing: "0.18em" }}
      title="개인정보 파기됨 (PIPA §21)"
    >
      <span aria-hidden>REDACTED</span>
      <span className="sr-only">개인정보 파기됨</span>
    </span>
  );
}

const STATUS_LABEL: Record<ApplicantStatus, string> = {
  pending: "PENDING",
  notified: "NOTIFIED",
  paid: "PAID",
  overdue: "OVERDUE",
  enrolled: "ENROLLED",
  cancelled: "CANCELLED",
  refunded: "REFUNDED",
};

const STATUS_KO: Record<ApplicantStatus, string> = {
  pending: "신청만",
  notified: "안내 발송",
  paid: "입금 확인",
  overdue: "마감 초과",
  enrolled: "수강 확정",
  cancelled: "취소",
  refunded: "환불 완료",
};

const STATUS_TONE: Record<ApplicantStatus, string> = {
  pending: "border-fg-subtle/40 bg-fg-subtle/10 text-fg-muted",
  notified: "border-blue-400/60 bg-blue-500/15 text-blue-200",
  paid: "border-emerald-500/60 bg-emerald-500/15 text-emerald-200",
  overdue: "border-red-500/70 bg-red-500/20 text-red-200",
  enrolled: "border-brand-pink bg-brand-pink/20 text-brand-pink",
  cancelled: "border-zinc-700 bg-zinc-800/40 text-zinc-400",
  refunded: "border-zinc-700 bg-zinc-800/40 text-zinc-500",
};

export function StatusChip({
  status,
  className,
}: {
  status: ApplicantStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border px-2 py-0.5 text-[10px] font-black uppercase whitespace-nowrap",
        STATUS_TONE[status],
        className,
      )}
      style={{ letterSpacing: "0.18em" }}
      title={STATUS_KO[status]}
    >
      <span aria-hidden>{STATUS_LABEL[status]}</span>
      <span className="sr-only">{STATUS_KO[status]}</span>
    </span>
  );
}

export { STATUS_KO as STATUS_LABEL_KO };
