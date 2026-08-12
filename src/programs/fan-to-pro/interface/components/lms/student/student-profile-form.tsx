"use client";

/**
 * Student Profile Form (B0044 LMS Launch Phase 2).
 *
 * 기본 정보 — name_ko / name_en / phone / birth_year / gender / visa_type.
 *
 * 단일 폼 + [저장] 버튼. upsertStudentProfileAction 호출.
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
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
import { upsertStudentProfileAction } from "@/src/programs/fan-to-pro/application/student-profile/upsert-profile";
import { StudentPhotoUpload } from "@/src/programs/fan-to-pro/interface/components/lms/student/student-photo-upload";
import {
  MAX_BIRTH_YEAR,
  MAX_MONTHS_IN_KOREA,
  MIN_BIRTH_YEAR,
  MIN_MONTHS_IN_KOREA,
  STUDENT_GENDERS,
  deriveBirthYearFromDate,
  type StudentProfile,
} from "@/src/programs/fan-to-pro/domain/entities/student-profile";

const GENDER_LABELS_KO: Record<(typeof STUDENT_GENDERS)[number], string> = {
  male: "남성",
  female: "여성",
  other: "기타",
  prefer_not_to_say: "응답하지 않음",
};

const GENDER_LABELS_EN: Record<(typeof STUDENT_GENDERS)[number], string> = {
  male: "Male",
  female: "Female",
  other: "Other",
  prefer_not_to_say: "Prefer not to say",
};

type Props = {
  studentId: string;
  initialProfile: StudentProfile | null;
  /** 신청서 원본 이름 (students.display_name = applicants.name) — 영문 이름 자동 채움. */
  originalName: string;
  locale: string;
  /** B0057 사진 signed URL (5분 TTL). 페이지 server component 가 미리 발급. */
  initialPhotoUrl?: string | null;
  /** B0057 사진 컴포넌트 mode — admin 페이지에선 운영자 안내 라벨 노출. */
  photoMode?: "self" | "admin";
};

export function StudentProfileForm({
  studentId,
  initialProfile,
  originalName,
  locale,
  initialPhotoUrl = null,
  photoMode = "self",
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const isEn = locale === "en";
  const labels = isEn ? GENDER_LABELS_EN : GENDER_LABELS_KO;

  function onSubmit(formData: FormData) {
    setFeedback(null);
    setError(null);
    const nameKo = String(formData.get("name_ko") ?? "").trim();
    // 영문 이름은 신청서 원본 사용 — 폼에서 입력 받지 않음. existing 값만 유지.
    const nameEn = initialProfile?.name_en ?? null;
    const phone = String(formData.get("phone") ?? "").trim();
    const birthYearRaw = String(formData.get("birth_year") ?? "").trim();
    const birthDateRaw = String(formData.get("birth_date") ?? "").trim();
    const monthsRaw = String(formData.get("months_in_korea") ?? "").trim();
    const gender = String(formData.get("gender") ?? "").trim();
    const nationality = String(formData.get("nationality") ?? "").trim();
    const visa = String(formData.get("visa_type") ?? "").trim();
    const website = String(formData.get("website_url") ?? "").trim();

    const birthDate = birthDateRaw.length > 0 ? birthDateRaw : null;
    // birth_date 가 있으면 derive, 없으면 birth_year input 사용
    const birthYear =
      birthDate !== null
        ? deriveBirthYearFromDate(birthDate)
        : birthYearRaw.length > 0
          ? Number(birthYearRaw)
          : null;
    const monthsInKorea = monthsRaw.length > 0 ? Number(monthsRaw) : null;

    startTransition(async () => {
      const result = await upsertStudentProfileAction({
        student_id: studentId,
        name_ko: nameKo.length > 0 ? nameKo : null,
        name_en: nameEn,
        phone: phone.length > 0 ? phone : null,
        birth_year: birthYear,
        birth_date: birthDate,
        gender:
          gender.length > 0
            ? (gender as (typeof STUDENT_GENDERS)[number])
            : null,
        nationality: nationality.length > 0 ? nationality : null,
        visa_type: visa.length > 0 ? visa : null,
        months_in_korea: monthsInKorea,
        website_url: website.length > 0 ? website : null,
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
          {isEn ? "Basic information" : "기본 정보"}
        </CardTitle>
        <CardDescription>
          {isEn
            ? "We use this for certificates, official documents, and instructor introductions."
            : "수료증 / 공식 서류 / 강사 소개 시 사용됩니다"}
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
        {/* B0057 사진 영역 — 폼 mutation 과 독립. 사진 영역 자체 server action 사용. */}
        <div className="mb-6 flex flex-col items-center gap-4 rounded-[var(--radius-sm)] border border-dashed border-[var(--border)] bg-[var(--background)] p-6 sm:flex-row sm:items-center sm:justify-start sm:gap-8">
          <StudentPhotoUpload
            studentId={studentId}
            initialPhotoUrl={initialPhotoUrl}
            displayName={
              initialProfile?.name_ko ?? initialProfile?.name_en ?? originalName
            }
            locale={locale}
            mode={photoMode}
          />
          <div className="flex-1 space-y-1 text-center sm:text-left">
            <h3 className="text-sm font-bold text-[var(--foreground)]">
              {isEn ? "Profile photo" : "프로필 사진"}
            </h3>
            <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
              {isEn
                ? "Optional. Used in operator dashboard, attendance, and instructor introductions. Not shown publicly."
                : "선택 사항. 운영자 대시보드 / 출석 체크 / 강사 소개 시 사용해요. 외부에는 공개되지 않습니다"}
            </p>
            <p className="text-[11px] text-[var(--muted-foreground)] leading-relaxed">
              {isEn
                ? "Upload only square-style headshots. Other photos auto-fit but corners may look awkward."
                : "정사각형 프로필 사진을 업로드하면 가장 깔끔해요. 다른 비율도 자동으로 맞춰지지만 모서리가 잘릴 수 있습니다"}
            </p>
          </div>
        </div>

        <form action={onSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name_ko" className="text-xs">
                {isEn ? "Korean name / nickname" : "한국 이름 (닉네임 또는 본인이 쓰는 이름)"}
              </Label>
              <Input
                id="name_ko"
                name="name_ko"
                maxLength={100}
                defaultValue={initialProfile?.name_ko ?? ""}
                placeholder={isEn ? "예: 마티나, 추엔" : "예: 마티나, 추엔"}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name_en" className="text-xs">
                {isEn ? "English name" : "영문 이름"}
              </Label>
              <Input
                id="name_en"
                name="name_en_display"
                maxLength={100}
                defaultValue={initialProfile?.name_en || originalName}
                readOnly
                disabled
                className="bg-[var(--muted)]/40 cursor-not-allowed"
              />
              <p className="text-[11px] text-[var(--muted-foreground)]">
                {isEn
                  ? "Auto-filled from signup form."
                  : "신청서 원본의 이름으로 자동 채워져요"}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs">
                {isEn ? "Phone" : "연락처"}
              </Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                maxLength={30}
                defaultValue={initialProfile?.phone ?? ""}
                placeholder={isEn ? "+82 10-..." : "010-0000-0000"}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="birth_date" className="text-xs">
                {isEn ? "Date of birth" : "생년월일"}
              </Label>
              <Input
                id="birth_date"
                name="birth_date"
                type="date"
                min={`${MIN_BIRTH_YEAR}-01-01`}
                max={`${MAX_BIRTH_YEAR}-12-31`}
                defaultValue={initialProfile?.birth_date ?? ""}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="birth_year" className="text-xs">
                {isEn
                  ? "Birth year (if no exact date)"
                  : "출생연도 (정확한 날짜를 모르면)"}
              </Label>
              <Input
                id="birth_year"
                name="birth_year"
                type="number"
                min={MIN_BIRTH_YEAR}
                max={MAX_BIRTH_YEAR}
                defaultValue={initialProfile?.birth_year ?? ""}
                placeholder={isEn ? "e.g. 1998" : "예: 1998"}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="months_in_korea" className="text-xs">
                {isEn ? "Months in Korea" : "한국 거주 기간 (개월)"}
              </Label>
              <Input
                id="months_in_korea"
                name="months_in_korea"
                type="number"
                min={MIN_MONTHS_IN_KOREA}
                max={MAX_MONTHS_IN_KOREA}
                defaultValue={initialProfile?.months_in_korea ?? ""}
                placeholder={
                  isEn
                    ? "e.g. 18 (1 year 6 months) / leave blank if Korean"
                    : "예: 18 (1년 6개월) / 한국 국적이면 빈칸"
                }
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="gender" className="text-xs">
                {isEn ? "Gender" : "성별"}
              </Label>
              <select
                id="gender"
                name="gender"
                defaultValue={initialProfile?.gender ?? ""}
                className="h-12 w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
              >
                <option value="">
                  {isEn ? "Select" : "선택"}
                </option>
                {STUDENT_GENDERS.map((g) => (
                  <option key={g} value={g}>
                    {labels[g]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="visa_type" className="text-xs">
                {isEn ? "Visa type" : "비자 종류"}
              </Label>
              <Input
                id="visa_type"
                name="visa_type"
                maxLength={30}
                defaultValue={initialProfile?.visa_type ?? ""}
                placeholder={
                  isEn
                    ? "e.g. D-2, F-4 (leave blank if Korean citizen)"
                    : "예: D-2, F-4 (한국 국적이면 빈칸)"
                }
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nationality" className="text-xs">
              {isEn ? "Nationality" : "국적"}
            </Label>
            <Input
              id="nationality"
              name="nationality"
              maxLength={100}
              defaultValue={initialProfile?.nationality ?? ""}
              placeholder={
                isEn
                  ? "e.g. Korea, Vietnam, Portugal, France"
                  : "예: Korea, Vietnam, Portugal, France"
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="website_url" className="text-xs">
              {isEn
                ? "Website / SNS / Portfolio (optional)"
                : "홈페이지 / SNS / 포트폴리오 (선택)"}
            </Label>
            <Input
              id="website_url"
              name="website_url"
              type="url"
              maxLength={2048}
              defaultValue={initialProfile?.website_url ?? ""}
              placeholder="https://"
            />
            <p className="text-[11px] text-[var(--muted-foreground)]">
              {isEn
                ? "Link 1 piece. Behance / Notion / personal site / Instagram all OK."
                : "링크 1개. Behance / Notion / 개인 사이트 / Instagram 다 OK"}
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
