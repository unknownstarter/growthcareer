import { cn } from "./cn";

/**
 * 프로그램 / 기수 상태 pill (재사용).
 * status 로 컬러 + 기본 라벨을 결정하고, label 을 주면 라벨만 덮어쓴다.
 * solid 블록 컬러만 사용 (컬러 그라데이션 / 글로우 금지, §6.8).
 * 서버 컴포넌트로 렌더 가능.
 */

export type ProgramStatus = "open" | "upcoming" | "closed" | "completed";

const DEFAULT_LABEL: Record<ProgramStatus, string> = {
  open: "모집중",
  upcoming: "오픈 예정",
  closed: "모집 마감",
  completed: "종료",
};

const TONE: Record<ProgramStatus, string> = {
  open: "bg-brand-pink/10 text-brand-pink",
  upcoming: "bg-brand-indigo/10 text-brand-indigo",
  closed: "bg-[#F2F4F6] text-[#8B95A1]",
  completed: "bg-[#F2F4F6] text-[#8B95A1]",
};

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: ProgramStatus;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 break-keep rounded-full px-3 py-1 font-bold text-[13px]",
        TONE[status],
        className,
      )}
    >
      {status === "open" ? (
        <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-brand-pink" />
      ) : null}
      {label ?? DEFAULT_LABEL[status]}
    </span>
  );
}
