/**
 * Coming Soon — 미구현 페이지의 placeholder.
 *
 * 메뉴에는 있지만 페이지가 아직 없는 경우 404 대신 친근한 안내.
 */
import { Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/card";

export function ComingSoon({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader className="text-center pb-3">
        <div className="mx-auto h-14 w-14 rounded-full bg-[var(--primary)]/10 flex items-center justify-center mb-3">
          <Sparkles className="h-7 w-7 text-[var(--primary)]" />
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>
          {description ??
            "곧 제공돼요. 준비되면 이 메뉴에서 바로 확인할 수 있어요."}
        </CardDescription>
      </CardHeader>
      <CardContent />
    </Card>
  );
}
