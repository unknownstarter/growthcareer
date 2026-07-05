/**
 * 수료증 발급 정보 요약 card (B0081) — 학생 certificates 페이지.
 *
 * 두 사용처:
 *   - eligibility 통과 시: 발급번호 / 발급일 / 출석률 표시
 *   - 종강 전 (coming-soon variant): "YYYY년 M월 D일 이후 발급" 표시
 */
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/card";
import { Award, Clock } from "lucide-react";

export type CertificateStatusCardVariant =
  | {
      kind: "issued";
      serialNo: string;
      attendanceRate: number;
      issuedDateKo: string;
    }
  | {
      kind: "coming-soon";
      /** 종강 예정일 표시용 (예: "2026년 7월 19일"). */
      cohortEndsOnKo: string;
    };

type Props = {
  variant: CertificateStatusCardVariant;
};

export function CertificateStatusCard({ variant }: Props) {
  if (variant.kind === "coming-soon") {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-[var(--muted-foreground)]" />
            <CardTitle className="text-base">종강 후 발급됩니다</CardTitle>
          </div>
          <CardDescription>
            {variant.cohortEndsOnKo} 이후 이 페이지에서 수료증을 확인할 수
            있어요. (출석률 75% 이상 시)
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const pct = Math.round(variant.attendanceRate * 100);
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-[var(--primary)]" />
          <CardTitle className="text-base">수료증 준비 완료</CardTitle>
        </div>
        <CardDescription>
          발급번호 {variant.serialNo} / 발급일 {variant.issuedDateKo} / 출석률{" "}
          {pct}%
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-[var(--muted-foreground)]">
          아래 미리보기의 [PDF 로 저장 / 인쇄] 버튼으로 다운로드하세요. 실물
          수료증은 수료식 당일 배포됩니다.
        </p>
      </CardContent>
    </Card>
  );
}
