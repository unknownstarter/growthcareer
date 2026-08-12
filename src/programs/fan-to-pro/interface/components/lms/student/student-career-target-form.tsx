"use client";

/**
 * Student Career Target Form (B0044 LMS Launch Phase 2).
 *
 * 희망 진로 — target_role_category / target_companies (배열) / desired_start_date / self_pitch.
 *
 * target_companies 는 chip 형식으로 추가/삭제. 단순 string array.
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import { Save, X, Plus } from "lucide-react";
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
import { upsertStudentCareerTargetAction } from "@/src/programs/fan-to-pro/application/student-career-target/upsert-career-target";
import {
  TARGET_ROLE_CATEGORIES,
  TARGET_ROLE_LABELS,
  type StudentCareerTarget,
  type TargetRoleCategory,
} from "@/src/programs/fan-to-pro/domain/entities/student-career-target";

const TARGET_ROLE_LABELS_EN: Record<TargetRoleCategory, string> = {
  concert_pd: "Concert PD",
  a_n_r: "A&R",
  mgmt: "Management",
  marketing: "Marketing",
  video: "Video",
  sound: "Sound",
  visual_director: "Visual Director",
  stage_manager: "Stage Manager",
  music_business: "Music Business",
  other: "Other",
};

const SELF_PITCH_MAX = 300;

type Props = {
  studentId: string;
  initialTarget: StudentCareerTarget | null;
  locale: string;
};

export function StudentCareerTargetForm({
  studentId,
  initialTarget,
  locale,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const isEn = locale === "en";
  const labels = isEn ? TARGET_ROLE_LABELS_EN : TARGET_ROLE_LABELS;

  const [companies, setCompanies] = React.useState<string[]>(
    initialTarget?.target_companies ?? [],
  );
  const [companyDraft, setCompanyDraft] = React.useState("");
  const [pitch, setPitch] = React.useState(initialTarget?.self_pitch ?? "");

  function addCompany() {
    const trimmed = companyDraft.trim();
    if (!trimmed) return;
    if (companies.length >= 20) return;
    if (companies.includes(trimmed)) {
      setCompanyDraft("");
      return;
    }
    setCompanies([...companies, trimmed]);
    setCompanyDraft("");
  }

  function removeCompany(name: string) {
    setCompanies(companies.filter((c) => c !== name));
  }

  function onSubmit(formData: FormData) {
    setFeedback(null);
    setError(null);
    const roleRaw = String(formData.get("target_role_category") ?? "").trim();
    const roleTextRaw = String(formData.get("target_role_text") ?? "").trim();
    const startRaw = String(formData.get("desired_start_date") ?? "").trim();
    const pitchVal = pitch.trim();

    startTransition(async () => {
      const result = await upsertStudentCareerTargetAction({
        student_id: studentId,
        target_role_category:
          roleRaw.length > 0 ? (roleRaw as TargetRoleCategory) : null,
        target_role_text: roleTextRaw.length > 0 ? roleTextRaw : null,
        target_companies: companies,
        desired_start_date: startRaw.length > 0 ? startRaw : null,
        self_pitch: pitchVal.length > 0 ? pitchVal : null,
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
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEn ? "Career goal" : "희망 진로"}
        </CardTitle>
        <CardDescription>
          {isEn
            ? "Tell us which role and companies you are aiming for so we can match opportunities."
            : "운영진이 적합한 회사 / 포지션을 추천할 때 활용해요"}
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
        <form action={onSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="target_role_category" className="text-xs">
                {isEn ? "Target role" : "희망 직무"}
              </Label>
              <select
                id="target_role_category"
                name="target_role_category"
                defaultValue={initialTarget?.target_role_category ?? ""}
                className="h-12 w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
              >
                <option value="">
                  {isEn ? "Select" : "선택"}
                </option>
                {TARGET_ROLE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {labels[c]}
                  </option>
                ))}
              </select>
              <Input
                id="target_role_text"
                name="target_role_text"
                maxLength={200}
                defaultValue={initialTarget?.target_role_text ?? ""}
                placeholder={
                  isEn
                    ? "Original text (if enum not matched, free-form preserved)"
                    : "원본 표기 (예: \"공연 PD + A&R 병행\")"
                }
                className="h-10 text-xs"
              />
              <p className="text-[11px] text-[var(--muted-foreground)]">
                {isEn
                  ? "Auto-filled from docx import when enum does not match. Free-form text preserved."
                  : "docx import 시 enum 매칭 실패하면 원본 표기가 그대로 저장돼요. 직접 추가/수정 가능"}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="desired_start_date" className="text-xs">
                {isEn ? "Desired start date" : "희망 시작일"}
              </Label>
              <Input
                id="desired_start_date"
                name="desired_start_date"
                type="date"
                defaultValue={initialTarget?.desired_start_date ?? ""}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="company_draft" className="text-xs">
              {isEn
                ? "Target companies (up to 20)"
                : "관심 회사 (최대 20개)"}
            </Label>
            <div className="flex gap-2">
              <Input
                id="company_draft"
                value={companyDraft}
                onChange={(e) => setCompanyDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCompany();
                  }
                }}
                maxLength={100}
                placeholder={
                  isEn
                    ? "e.g. HYBE, SM, JYP"
                    : "예: HYBE, SM, JYP"
                }
              />
              <Button
                type="button"
                variant="outline"
                onClick={addCompany}
                disabled={companies.length >= 20 || !companyDraft.trim()}
                className="h-12 shrink-0"
              >
                <Plus className="h-4 w-4 mr-1" />
                {isEn ? "Add" : "추가"}
              </Button>
            </div>
            {companies.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-2">
                {companies.map((name) => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[var(--secondary)] pl-3 pr-1 py-1 text-xs font-medium text-[var(--foreground)]"
                  >
                    {name}
                    <button
                      type="button"
                      onClick={() => removeCompany(name)}
                      className="rounded-full p-0.5 hover:bg-[var(--background)]"
                      aria-label={
                        isEn
                          ? `Remove ${name}`
                          : `${name} 제거`
                      }
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="self_pitch" className="text-xs">
              {isEn
                ? `Self pitch (max ${SELF_PITCH_MAX} characters)`
                : `자기 PR (최대 ${SELF_PITCH_MAX}자)`}
            </Label>
            <Textarea
              id="self_pitch"
              name="self_pitch"
              rows={4}
              maxLength={SELF_PITCH_MAX}
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              placeholder={
                isEn
                  ? "What kind of work do you want to do, what experiences do you have, what's your strength?"
                  : "어떤 일을 하고 싶고, 어떤 경험이 있고, 강점이 무엇인지 짧게 적어주세요"
              }
            />
            <p className="text-xs text-[var(--muted-foreground)] text-right">
              {pitch.length} / {SELF_PITCH_MAX}
            </p>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={pending}
              className="h-12 px-6"
            >
              <Save className="h-4 w-4 mr-2" />
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
      </CardContent>
    </Card>
  );
}
