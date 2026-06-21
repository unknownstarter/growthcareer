import {
  Card,
  CardContent,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/card";
import type { LucideIcon } from "lucide-react";

/**
 * 토스풍 KPI 카드. radius 12px (xl), padding p-6, 큰 숫자 강조.
 */
export function DashboardKpiCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
}) {
  return (
    <Card>
      <CardContent className="p-6 pt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-medium text-[var(--muted-foreground)]">
              {label}
            </p>
            <p className="text-2xl font-bold text-[var(--foreground)] tracking-tight">
              {value}
            </p>
            {hint ? (
              <p className="text-xs text-[var(--muted-foreground)]">{hint}</p>
            ) : null}
          </div>
          {Icon ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--secondary)] text-[var(--muted-foreground)]">
              <Icon className="h-5 w-5" />
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
