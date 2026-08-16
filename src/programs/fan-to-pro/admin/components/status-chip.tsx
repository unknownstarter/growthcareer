import { cn } from "@/src/shared/ui/cn";
import type { ApplicantStatus } from "../types";
import {
  STATUS_LABEL_EN,
  STATUS_LABEL_KO,
} from "@/src/programs/fan-to-pro/application/dto/applicant-row";

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

// 라벨은 canonical 단일 소스 (application/dto/applicant-row) 에서. 색만 여기 정의.
const STATUS_TONE: Record<ApplicantStatus, string> = {
  pending: "border-fg-subtle/40 bg-fg-subtle/10 text-fg",
  notified: "border-blue-400/60 bg-blue-500/15 text-blue-200",
  paid: "border-emerald-500/60 bg-emerald-500/15 text-emerald-200",
  overdue: "border-red-500/70 bg-red-500/20 text-red-200",
  enrolled: "border-brand-pink bg-brand-pink/20 text-brand-pink",
  cancelled: "border-zinc-700 bg-zinc-800/40 text-zinc-400",
  refunded: "border-zinc-700 bg-zinc-800/40 text-zinc-500",
  next_cohort_interest: "border-sky-400/60 bg-sky-500/15 text-sky-200",
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
      title={STATUS_LABEL_KO[status]}
    >
      <span aria-hidden>{STATUS_LABEL_EN[status]}</span>
      <span className="sr-only">{STATUS_LABEL_KO[status]}</span>
    </span>
  );
}

export { STATUS_LABEL_KO };
