/**
 * 수료증 발급 불가 안내 card (B0081). 학생 certificates 페이지에서 사용.
 *
 * 종강 후 자격 미달 상태 표시. 사유 3종:
 *   - attendance-below: 출석률 < 75%
 *   - student-inactive: 자퇴 등 학생 상태 이상
 *   - cohort-cancelled: 폐강
 *
 * 종강 전 (cohort_in_progress) 은 별도 status-card 의 coming-soon variant 로 처리.
 *
 * 카피 룰 (CLAUDE.md §6.5): em dash / interpunct / 곡선 따옴표 / 단일 ellipsis 미사용.
 */
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/card";
import { AlertCircle } from "lucide-react";

export type CertificateBlockedReason =
  | "attendance-below"
  | "student-inactive"
  | "cohort-cancelled";

type Props = {
  reason: CertificateBlockedReason;
  /** attendance-below 일 때 실제 %. 0-100 정수. */
  attendancePercent?: number;
};

/**
 * 학생에게 발급 불가 사유를 부드럽게 안내. 구체 %는 표시하되 자책감 유발 X.
 * "운영자 문의" 채널 명시. 학생이 혼자 남지 않도록.
 */
export function CertificateBlockedCard({ reason, attendancePercent }: Props) {
  const { title, description, followup } = resolveCopy(reason, attendancePercent);
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-[#b42318]" />
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-[var(--muted-foreground)]">{followup}</p>
      </CardContent>
    </Card>
  );
}

function resolveCopy(
  reason: CertificateBlockedReason,
  attendancePercent?: number,
): { title: string; description: string; followup: string } {
  switch (reason) {
    case "attendance-below": {
      const pct = attendancePercent ?? 0;
      return {
        title: "출석률 미달로 발급이 어렵습니다",
        description: `현재 출석률 ${pct}% 로 수료 조건 (75%) 에 못 미쳤어요`,
        followup:
          "예외 사유 (부득이한 결석 등) 가 있다면 운영자에게 문의해 주세요. 개별 확인 후 안내 드립니다",
      };
    }
    case "student-inactive": {
      return {
        title: "발급 대상이 아닙니다",
        description:
          "학생 상태가 활성이 아니어서 자동 발급이 불가능해요",
        followup:
          "발급 재개가 필요하다면 운영자에게 문의해 주세요",
      };
    }
    case "cohort-cancelled": {
      return {
        title: "폐강된 기수입니다",
        description:
          "이 기수는 폐강되어 수료증 발급 대상이 아닙니다",
        followup:
          "다음 기수 안내가 필요하시면 운영자에게 문의해 주세요",
      };
    }
  }
}
