/**
 * Certificate Status Badge (B0081) — admin students/[id] 페이지.
 *
 * 5 상태:
 *   - issued (녹색): 이미 발급 완료. serial_no 표시.
 *   - eligible (파랑): 조건 통과, 아직 발급 X
 *   - attendance-below (빨강): 출석률 < 75% 표시
 *   - waiting (회색): cohort 아직 in_progress — 종강 대기
 *   - inactive (회색): 학생 withdrawn / cohort cancelled 등
 */
import { Badge } from "@/src/programs/fan-to-pro/interface/components/lms/ui/badge";

export type CertificateStatusBadgeProps = {
  /** 이미 발급된 completion certificate 의 serial_no. 있으면 issued 상태. */
  issuedSerialNo?: string | null;
  /** cohort.status */
  cohortStatus: string;
  /** student.status */
  studentStatus: string;
  /** 0-1. null = ended 회차 0. */
  attendanceRate: number | null;
};

export function CertificateStatusBadge({
  issuedSerialNo,
  cohortStatus,
  studentStatus,
  attendanceRate,
}: CertificateStatusBadgeProps) {
  // 1) 이미 발급됨
  if (issuedSerialNo) {
    return (
      <Badge variant="success" title={`발급번호 ${issuedSerialNo}`}>
        수료증 발급됨
      </Badge>
    );
  }

  // 2) cohort cancelled
  if (cohortStatus === "cancelled") {
    return <Badge variant="secondary">폐강 (발급 불가)</Badge>;
  }

  // 3) 학생 withdrawn
  if (studentStatus !== "active" && studentStatus !== "completed") {
    return <Badge variant="secondary">발급 대상 아님</Badge>;
  }

  // 4) cohort 아직 진행 중
  if (cohortStatus !== "completed") {
    return <Badge variant="outline">종강 대기</Badge>;
  }

  // 5) 종강 후 — 출석률 판정
  const rate = attendanceRate ?? 0;
  if (rate < 0.75) {
    const pct = Math.round(rate * 100);
    return (
      <Badge variant="destructive">출석률 미달 {pct}%</Badge>
    );
  }

  // 6) 발급 가능
  return <Badge variant="default">발급 가능</Badge>;
}
