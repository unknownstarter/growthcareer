"use client";

/**
 * Student Resume Items Editor (B0044 LMS Launch Phase 2).
 *
 * 다중 row — type 별 (education / experience / certification / award / language /
 * project) item 추가 / 수정 / 삭제.
 *
 * 디자인:
 *   - type 별 grouping (학력 / 경력 / 자격증 / 수상 / 어학 / 프로젝트)
 *   - 각 group 내 [추가] 버튼 → 카드 inline 에 새 row form
 *   - 각 item 의 [수정] / [삭제] 버튼
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Pencil, X, Save } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/card";
import { Button } from "@/src/programs/fan-to-pro/interface/components/lms/ui/button";
import { Input } from "@/src/programs/fan-to-pro/interface/components/lms/ui/input";
import { Label } from "@/src/programs/fan-to-pro/interface/components/lms/ui/label";
import { Textarea } from "@/src/programs/fan-to-pro/interface/components/lms/ui/textarea";
import { createStudentResumeItemAction } from "@/src/programs/fan-to-pro/application/student-resume-item/create-resume-item";
import { updateStudentResumeItemAction } from "@/src/programs/fan-to-pro/application/student-resume-item/update-resume-item";
import { deleteStudentResumeItemAction } from "@/src/programs/fan-to-pro/application/student-resume-item/delete-resume-item";
import {
  RESUME_ITEM_TYPES,
  RESUME_ITEM_LABELS,
  type ResumeItemType,
  type StudentResumeItem,
} from "@/src/programs/fan-to-pro/domain/entities/student-resume-item";

const RESUME_ITEM_LABELS_EN: Record<ResumeItemType, string> = {
  education: "Education",
  experience: "Experience",
  certification: "Certification",
  award: "Award",
  language: "Language",
  project: "Project",
  activity: "Activities",
  skill: "Skills",
};

type Props = {
  studentId: string;
  initialItems: StudentResumeItem[];
  locale: string;
};

export function StudentResumeItemsEditor({
  studentId,
  initialItems,
  locale,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const isEn = locale === "en";
  const labels = isEn ? RESUME_ITEM_LABELS_EN : RESUME_ITEM_LABELS;

  // 편집 상태: { itemId | 'new:<type>' : true } 형식.
  const [editing, setEditing] = React.useState<Record<string, boolean>>({});

  function toggleEdit(key: string, on: boolean) {
    setEditing((s) => ({ ...s, [key]: on }));
  }

  const byType = React.useMemo(() => {
    const map = new Map<ResumeItemType, StudentResumeItem[]>();
    for (const t of RESUME_ITEM_TYPES) map.set(t, []);
    for (const item of initialItems) {
      const arr = map.get(item.type) ?? [];
      arr.push(item);
      map.set(item.type, arr);
    }
    return map;
  }, [initialItems]);

  function onSubmitNew(type: ResumeItemType, formData: FormData) {
    setError(null);
    setFeedback(null);
    const title = String(formData.get("title") ?? "").trim();
    const organization = String(formData.get("organization") ?? "").trim();
    const start = String(formData.get("start_date") ?? "").trim();
    const end = String(formData.get("end_date") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const credentialUrl = String(formData.get("credential_url") ?? "").trim();

    if (!title) {
      setError(isEn ? "Title is required." : "제목은 필수입니다");
      return;
    }

    startTransition(async () => {
      const result = await createStudentResumeItemAction({
        student_id: studentId,
        type,
        title,
        organization: organization.length > 0 ? organization : null,
        start_date: start.length > 0 ? start : null,
        end_date: end.length > 0 ? end : null,
        description: description.length > 0 ? description : null,
        credential_url: credentialUrl.length > 0 ? credentialUrl : null,
      });
      if (result.status === "error") {
        setError(
          isEn
            ? `Save failed. ${result.error}`
            : `저장 실패. ${result.error}`,
        );
        return;
      }
      setFeedback(isEn ? "Added." : "추가 완료");
      toggleEdit(`new:${type}`, false);
      router.refresh();
    });
  }

  function onSubmitUpdate(item: StudentResumeItem, formData: FormData) {
    setError(null);
    setFeedback(null);
    const title = String(formData.get("title") ?? "").trim();
    const organization = String(formData.get("organization") ?? "").trim();
    const start = String(formData.get("start_date") ?? "").trim();
    const end = String(formData.get("end_date") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const credentialUrl = String(formData.get("credential_url") ?? "").trim();

    if (!title) {
      setError(isEn ? "Title is required." : "제목은 필수입니다");
      return;
    }

    startTransition(async () => {
      const result = await updateStudentResumeItemAction({
        id: item.id,
        student_id: studentId,
        title,
        organization: organization.length > 0 ? organization : null,
        start_date: start.length > 0 ? start : null,
        end_date: end.length > 0 ? end : null,
        description: description.length > 0 ? description : null,
        credential_url: credentialUrl.length > 0 ? credentialUrl : null,
      });
      if (result.status === "error") {
        setError(
          isEn
            ? `Save failed. ${result.error}`
            : `저장 실패. ${result.error}`,
        );
        return;
      }
      setFeedback(isEn ? "Saved." : "저장 완료");
      toggleEdit(item.id, false);
      router.refresh();
    });
  }

  function onDelete(item: StudentResumeItem) {
    if (
      !confirm(
        isEn
          ? `Delete "${item.title}"?`
          : `"${item.title}" 항목을 삭제할까요`,
      )
    ) {
      return;
    }
    setError(null);
    setFeedback(null);
    startTransition(async () => {
      const result = await deleteStudentResumeItemAction({
        id: item.id,
        student_id: studentId,
      });
      if (result.status === "error") {
        setError(
          isEn
            ? `Delete failed. ${result.error}`
            : `삭제 실패. ${result.error}`,
        );
        return;
      }
      setFeedback(isEn ? "Deleted." : "삭제 완료");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEn ? "Resume items" : "이력서 항목"}
        </CardTitle>
        <CardDescription>
          {isEn
            ? "Add education, experience, certifications, awards, languages, projects, activities, and skills."
            : "학력, 경력, 자격증, 수상, 어학, 프로젝트, 기타활동, 활용능력을 추가합니다"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {feedback ? (
          <div className="mb-4 rounded-[var(--radius-sm)] bg-[#dcfae6] px-4 py-3 text-sm text-[#067647]">
            {feedback}
          </div>
        ) : null}
        {error ? (
          <div className="mb-4 rounded-[var(--radius-sm)] bg-[#fee4e2] px-4 py-3 text-sm text-[#b42318]">
            {error}
          </div>
        ) : null}

        <div className="space-y-6">
          {RESUME_ITEM_TYPES.map((type) => {
            const items = byType.get(type) ?? [];
            const newKey = `new:${type}`;
            const isAdding = editing[newKey];
            return (
              <section key={type} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[var(--foreground)]">
                    {labels[type]}
                    <span className="ml-2 text-xs font-medium text-[var(--muted-foreground)]">
                      {items.length}
                    </span>
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => toggleEdit(newKey, !isAdding)}
                    disabled={pending}
                  >
                    {isAdding ? (
                      <>
                        <X className="h-3.5 w-3.5 mr-1" />
                        {isEn ? "Cancel" : "취소"}
                      </>
                    ) : (
                      <>
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        {isEn ? "Add" : "추가"}
                      </>
                    )}
                  </Button>
                </div>

                {isAdding ? (
                  <ResumeItemForm
                    locale={locale}
                    type={type}
                    pending={pending}
                    onSubmit={(fd) => onSubmitNew(type, fd)}
                    onCancel={() => toggleEdit(newKey, false)}
                  />
                ) : null}

                {items.length === 0 && !isAdding ? (
                  <p className="text-xs text-[var(--muted-foreground)] italic">
                    {isEn
                      ? "No entries yet."
                      : "아직 등록된 항목이 없습니다"}
                  </p>
                ) : null}

                <div className="space-y-2">
                  {items.map((item) => {
                    const isEditing = editing[item.id];
                    return (
                      <div
                        key={item.id}
                        className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4"
                      >
                        {isEditing ? (
                          <ResumeItemForm
                            locale={locale}
                            type={type}
                            initial={item}
                            pending={pending}
                            onSubmit={(fd) => onSubmitUpdate(item, fd)}
                            onCancel={() => toggleEdit(item.id, false)}
                          />
                        ) : (
                          <ResumeItemRow
                            item={item}
                            locale={locale}
                            pending={pending}
                            onEdit={() => toggleEdit(item.id, true)}
                            onDelete={() => onDelete(item)}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function ResumeItemRow({
  item,
  locale,
  pending,
  onEdit,
  onDelete,
}: {
  item: StudentResumeItem;
  locale: string;
  pending: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isEn = locale === "en";
  return (
    <div className="flex items-start gap-3">
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <p className="text-sm font-semibold text-[var(--foreground)]">
            {item.title}
          </p>
          {item.organization ? (
            <p className="text-xs text-[var(--muted-foreground)]">
              {item.organization}
            </p>
          ) : null}
        </div>
        {item.start_date || item.end_date ? (
          <p className="text-xs text-[var(--muted-foreground)]">
            {item.start_date ?? "?"} ~ {item.end_date ?? (isEn ? "Present" : "현재")}
          </p>
        ) : null}
        {item.description ? (
          <p className="text-xs text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">
            {item.description}
          </p>
        ) : null}
        {item.credential_url && /^https?:\/\//i.test(item.credential_url) ? (
          <a
            href={item.credential_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[var(--primary)] underline"
          >
            {isEn ? "Credential link" : "증빙 링크"}
          </a>
        ) : null}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          disabled={pending}
          aria-label={isEn ? "Edit" : "수정"}
          title={isEn ? "Edit" : "수정"}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          disabled={pending}
          aria-label={isEn ? "Delete" : "삭제"}
          title={isEn ? "Delete" : "삭제"}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function ResumeItemForm({
  locale,
  type,
  initial,
  pending,
  onSubmit,
  onCancel,
}: {
  locale: string;
  type: ResumeItemType;
  initial?: StudentResumeItem;
  pending: boolean;
  onSubmit: (formData: FormData) => void;
  onCancel: () => void;
}) {
  const isEn = locale === "en";
  return (
    <form
      action={onSubmit}
      className="space-y-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--secondary)] p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">
            {labelForTitle(type, isEn)} *
          </Label>
          <Input
            name="title"
            required
            maxLength={200}
            defaultValue={initial?.title ?? ""}
            placeholder={placeholderForTitle(type, isEn)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">
            {labelForOrganization(type, isEn)}
          </Label>
          <Input
            name="organization"
            maxLength={200}
            defaultValue={initial?.organization ?? ""}
            placeholder={placeholderForOrganization(type, isEn)}
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">
            {isEn ? "Start date" : "시작일"}
          </Label>
          <Input
            type="date"
            name="start_date"
            defaultValue={initial?.start_date ?? ""}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">
            {isEn ? "End date" : "종료일"}
          </Label>
          <Input
            type="date"
            name="end_date"
            defaultValue={initial?.end_date ?? ""}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">
          {isEn ? "Description" : "설명"}
        </Label>
        <Textarea
          name="description"
          rows={3}
          maxLength={1000}
          defaultValue={initial?.description ?? ""}
          placeholder={
            isEn
              ? "Key responsibilities, achievements, what you learned."
              : "주요 업무 / 성과 / 배운 점"
          }
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">
          {isEn ? "Credential URL (optional)" : "증빙 링크 (선택)"}
        </Label>
        <Input
          type="url"
          name="credential_url"
          maxLength={2048}
          defaultValue={initial?.credential_url ?? ""}
          placeholder="https://"
        />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={pending}
        >
          {isEn ? "Cancel" : "취소"}
        </Button>
        <Button type="submit" disabled={pending}>
          <Save className="h-4 w-4 mr-1.5" />
          {pending
            ? isEn
              ? "Saving..."
              : "저장 중..."
            : isEn
              ? "Save"
              : "저장"}
        </Button>
      </div>
    </form>
  );
}

function labelForTitle(type: ResumeItemType, isEn: boolean): string {
  switch (type) {
    case "education":
      return isEn ? "Major / Degree" : "전공 / 학위";
    case "experience":
      return isEn ? "Job title / Role" : "직무명";
    case "certification":
      return isEn ? "Certification name" : "자격증 명";
    case "award":
      return isEn ? "Award name" : "수상명";
    case "language":
      return isEn ? "Language / Test" : "어학 / 시험";
    case "project":
      return isEn ? "Project name" : "프로젝트 명";
    case "activity":
      return isEn ? "Activity name" : "활동명";
    case "skill":
      return isEn ? "Tool / Skill" : "도구 / 기술";
  }
}

function labelForOrganization(type: ResumeItemType, isEn: boolean): string {
  switch (type) {
    case "education":
      return isEn ? "School" : "학교";
    case "experience":
      return isEn ? "Company" : "회사";
    case "certification":
      return isEn ? "Issuer" : "발급기관";
    case "award":
      return isEn ? "Organizer" : "주최";
    case "language":
      return isEn ? "Score / Level" : "점수 / 등급";
    case "project":
      return isEn ? "Client / Team" : "클라이언트 / 팀";
    case "activity":
      return isEn ? "Organization / Host" : "단체 / 주최";
    case "skill":
      return isEn ? "Proficiency (optional)" : "숙련도 (선택)";
  }
}

function placeholderForTitle(type: ResumeItemType, isEn: boolean): string {
  switch (type) {
    case "education":
      return isEn ? "B.A. in Business" : "경영학 학사";
    case "experience":
      return isEn ? "Marketing Intern" : "마케팅 인턴";
    case "certification":
      return isEn ? "TOPIK 5" : "정보처리기사";
    case "award":
      return isEn ? "Best Idea Award" : "장려상";
    case "language":
      return "TOEIC";
    case "project":
      return isEn ? "Brand campaign" : "브랜드 캠페인";
    case "activity":
      return isEn ? "Volunteer / Club / External activity" : "동아리 / 봉사 / 대외활동";
    case "skill":
      return isEn ? "Figma / Premiere / PA console" : "피그마 / 프리미어 / PA 콘솔";
  }
}

function placeholderForOrganization(
  type: ResumeItemType,
  isEn: boolean,
): string {
  switch (type) {
    case "education":
      return isEn ? "Seoul National University" : "서울대학교";
    case "experience":
      return isEn ? "HYBE" : "HYBE";
    case "certification":
      return isEn ? "Issuing body" : "한국산업인력공단";
    case "award":
      return isEn ? "Host" : "주최기관";
    case "language":
      return "900";
    case "project":
      return isEn ? "School club" : "교내 동아리";
    case "activity":
      return isEn ? "K-pop Fan Club" : "K-pop 팬클럽";
    case "skill":
      return isEn ? "Advanced / Intermediate / Beginner" : "상 / 중 / 하";
  }
}
