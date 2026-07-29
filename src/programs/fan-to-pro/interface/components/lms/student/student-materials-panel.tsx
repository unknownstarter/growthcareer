"use client";

/**
 * Student Materials Panel (B0044 LMS Launch Phase 2 — student).
 *
 * /[locale]/fan-to-pro/[cohortSlug]/student/materials.
 *
 * 학생 본인의 cohort 강의 자료 list + 다운로드.
 *
 * 디자인:
 *   - 회차 (week_number) 별 카드 grouping (1주차 ~ N주차)
 *   - 모바일 first — h-12 큰 버튼, 카드 간격 여유
 *   - 다운로드 클릭 → getMaterialDownloadUrlAction → 새 탭 (noopener,noreferrer)
 *
 * 카피:
 *   - 자료 보호 안내 ("강사님 지적 재산물, 외부 유출 금지")
 *
 * 보안:
 *   - server action 에서 cohort_memberships + visibility 가드
 *   - 새 탭 noopener,noreferrer 필수 (Sage MED-2)
 */
import * as React from "react";
import { Download, FileText, ExternalLink, ShieldAlert } from "lucide-react";
import {
  Card,
  CardContent,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/card";
import { Button } from "@/src/programs/fan-to-pro/interface/components/lms/ui/button";
import { Badge } from "@/src/programs/fan-to-pro/interface/components/lms/ui/badge";
import { getMaterialDownloadUrlAction } from "@/src/programs/fan-to-pro/application/lecture-material/get-material-download-url";
import {
  STAGGER_ITEM_CLASS,
  staggerDelay,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/stagger";
import type { LectureMaterial } from "@/src/programs/fan-to-pro/domain/entities/lecture-material";

type Props = {
  initialMaterials: LectureMaterial[];
  locale: string;
};

export function StudentMaterialsPanel({ initialMaterials, locale }: Props) {
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const isEn = locale === "en";

  // 회차 기준 grouping (1주차 ~ N).
  const grouped = React.useMemo(() => {
    const map = new Map<number | "unassigned", LectureMaterial[]>();
    for (const m of initialMaterials) {
      const key: number | "unassigned" =
        typeof m.week_number === "number" ? m.week_number : "unassigned";
      const arr = map.get(key) ?? [];
      arr.push(m);
      map.set(key, arr);
    }
    return map;
  }, [initialMaterials]);

  const sortedWeeks: Array<number | "unassigned"> = React.useMemo(() => {
    const weeks = Array.from(grouped.keys()).filter(
      (k): k is number => typeof k === "number",
    );
    weeks.sort((a, b) => a - b);
    const result: Array<number | "unassigned"> = [...weeks];
    if (grouped.has("unassigned")) result.push("unassigned");
    return result;
  }, [grouped]);

  function onDownload(materialId: string) {
    setError(null);
    startTransition(async () => {
      const result = await getMaterialDownloadUrlAction({
        material_id: materialId,
      });
      if (result.status === "error") {
        setError(
          isEn
            ? `Download failed. ${result.error}`
            : `다운로드 실패. ${result.error}`,
        );
        return;
      }
      window.open(result.url, "_blank", "noopener,noreferrer");
    });
  }

  if (initialMaterials.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-2">
          <FileText
            className="h-10 w-10 mx-auto text-[var(--muted-foreground)]"
            aria-hidden
          />
          <p className="text-sm font-semibold text-[var(--foreground)]">
            {isEn
              ? "No materials yet"
              : "아직 공개된 강의 자료가 없습니다"}
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">
            {isEn
              ? "Your instructor will upload session materials soon."
              : "강의가 시작되면 강사님이 자료를 업로드합니다."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 자료 보호 안내 — 학생에게 매번 강조 */}
      <div className="rounded-[var(--radius)] border border-[#fef0c7] bg-[#fffbeb] p-4 flex items-start gap-3">
        <ShieldAlert
          className="h-5 w-5 text-[#b54708] shrink-0 mt-0.5"
          aria-hidden
        />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-[#b54708]">
            {isEn ? "Material protection notice" : "자료 보호 안내"}
          </p>
          <p className="text-xs text-[#b54708] leading-relaxed">
            {isEn
              ? "These materials are the intellectual property of your instructors. Do not redistribute, share externally, or reuse without permission."
              : "본 자료는 강사님의 지적 재산물입니다. 외부 유출, 공유, 재사용은 금지되어 있습니다."}
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-[var(--radius-sm)] bg-[#fee4e2] px-4 py-3 text-sm text-[#b42318]">
          {error}
        </div>
      ) : null}

      {/* 회차별 sections */}
      <div className="space-y-6">
        {sortedWeeks.map((week) => {
          const items = grouped.get(week) ?? [];
          return (
            <section key={String(week)} className="space-y-3">
              <h2 className="text-base font-bold text-[var(--foreground)] flex items-baseline gap-2">
                {week === "unassigned"
                  ? isEn
                    ? "Additional"
                    : "추가 자료"
                  : isEn
                    ? `Week ${week}`
                    : `${week}주차`}
                <span className="text-xs font-medium text-[var(--muted-foreground)]">
                  {items.length}
                  {isEn ? "" : "개"}
                </span>
              </h2>
              <div className="space-y-2">
                {items.map((m, i) => (
                  <StudentMaterialCard
                    key={m.id}
                    index={i}
                    material={m}
                    pending={pending}
                    isEn={isEn}
                    onDownload={() => onDownload(m.id)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function StudentMaterialCard({
  material,
  pending,
  isEn,
  index,
  onDownload,
}: {
  material: LectureMaterial;
  pending: boolean;
  isEn: boolean;
  index: number;
  onDownload: () => void;
}) {
  const isExternal = material.storage_method === "external_url";
  const Icon = isExternal ? ExternalLink : FileText;
  return (
    <div
      className={`flex flex-col gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 sm:flex-row sm:items-center sm:gap-4 ${STAGGER_ITEM_CLASS}`}
      style={staggerDelay(index)}
    >
      <Icon
        className="h-5 w-5 text-[var(--muted-foreground)] shrink-0"
        aria-hidden
      />
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm font-semibold text-[var(--foreground)]">
          {material.title}
        </p>
        {material.description ? (
          <p className="text-xs text-[var(--muted-foreground)] line-clamp-2">
            {material.description}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted-foreground)]">
          {isExternal ? (
            <Badge variant="outline">
              {isEn ? "External link" : "외부 링크"}
            </Badge>
          ) : (
            <>
              {material.file_name ? <span>{material.file_name}</span> : null}
              {material.file_size_bytes != null ? (
                <span>{formatBytes(material.file_size_bytes)}</span>
              ) : null}
            </>
          )}
        </div>
      </div>
      <Button
        onClick={onDownload}
        disabled={pending}
        className="h-12 px-5 w-full sm:w-auto shrink-0"
        aria-label={
          isExternal
            ? isEn
              ? "Open external link"
              : "외부 링크 열기"
            : isEn
              ? "Download file"
              : "파일 다운로드"
        }
      >
        <Download className="h-4 w-4 mr-2" />
        {isExternal
          ? isEn
            ? "Open"
            : "열기"
          : isEn
            ? "Download"
            : "다운로드"}
      </Button>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
