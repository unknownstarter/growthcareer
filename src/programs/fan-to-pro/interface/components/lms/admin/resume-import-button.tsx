"use client";

/**
 * Resume Import Button (B0064) — admin / 학생 본인 둘 다 가능.
 *
 * 흐름:
 *   1) [docx 가져오기] 버튼 클릭 → Dialog 오픈.
 *   2) docx 파일 선택 → FileReader 로 data URL 변환 → parseResumeDocxAction(...).
 *   3) 서버 return 받은 ParsedResume → preview 카드 (인적사항 / 진로 / 이력서 항목 수 / warnings).
 *   4) 운영자 모드 선택 (replace vs append) + [저장] → commitResumeImportAction(...).
 *   5) 성공 toast + router.refresh() → 학생 상세 페이지 갱신.
 *
 * 권한:
 *   - 본 컴포넌트 자체는 UI — 서버 가드 (assertCanWriteStudentProfile) 가 진짜 방어선.
 *   - admin only 가 아닌 학생 surface 에서도 재사용 OK.
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload, FileText, AlertTriangle, CheckCircle2 } from "lucide-react";

import {
  parseResumeDocxAction,
  commitResumeImportAction,
  type ParseResumeDocxResult,
} from "@/src/programs/fan-to-pro/application/student-resume/import-resume-from-docx";
import type { ParsedResume } from "@/src/programs/fan-to-pro/application/student-resume/parse-resume-docx";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/dialog";
import { Button } from "@/src/programs/fan-to-pro/interface/components/lms/ui/button";
import { Label } from "@/src/programs/fan-to-pro/interface/components/lms/ui/label";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MAX_BYTES = 5 * 1024 * 1024;

type Mode = "replace" | "append";

export function ResumeImportButton({ studentId }: { studentId: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [parsing, startParsing] = React.useTransition();
  const [committing, startCommitting] = React.useTransition();
  const [preview, setPreview] = React.useState<ParsedResume | null>(null);
  const [mode, setMode] = React.useState<Mode>("append");
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  function reset() {
    setFileName(null);
    setPreview(null);
    setMode("append");
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_BYTES) {
      setError("파일이 5MB 를 넘어요. 이미지 embed 가 많지 않은지 확인해 주세요.");
      e.target.value = "";
      return;
    }
    if (file.type && file.type !== DOCX_MIME) {
      setError(".docx 만 지원해요. .doc (구버전) 은 .docx 로 저장 후 다시 시도해 주세요.");
      e.target.value = "";
      return;
    }

    setFileName(file.name);
    setPreview(null);

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== "string") {
        setError("파일을 읽지 못했어요. 다시 선택해 주세요.");
        return;
      }
      startParsing(async () => {
        const r: ParseResumeDocxResult = await parseResumeDocxAction({
          student_id: studentId,
          file_data_url: dataUrl,
        });
        if (r.status === "error") {
          setError(mapErrorMessage(r.error));
          setPreview(null);
          return;
        }
        setPreview(r.parsed);
      });
    };
    reader.onerror = () => setError("파일 읽기에 실패했어요.");
    reader.readAsDataURL(file);
  }

  function onCommit() {
    if (!preview) return;
    setError(null);
    startCommitting(async () => {
      const r = await commitResumeImportAction({
        student_id: studentId,
        parsed: preview,
        mode,
      });
      if (r.status === "error") {
        setError(mapErrorMessage(r.error));
        return;
      }
      const parts: string[] = [];
      if (r.profile_updated) parts.push("인적사항");
      if (r.career_target_updated) parts.push("희망 진로");
      if (r.items_inserted > 0) {
        parts.push(
          `이력서 항목 ${r.items_inserted}개${
            r.items_deleted > 0 ? ` (기존 ${r.items_deleted}개 삭제)` : ""
          }`,
        );
      }
      toast.success(
        parts.length > 0
          ? `${parts.join(" · ")} 저장 완료`
          : "변경 사항이 없어 저장하지 않았어요.",
      );
      setOpen(false);
      reset();
      router.refresh();
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          reset();
          setOpen(true);
        }}
        className="h-12"
      >
        <Upload className="h-4 w-4 mr-2" />
        docx 가져오기
      </Button>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) reset();
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>이력서 docx 가져오기</DialogTitle>
            <DialogDescription>
              학생이 작성한 우리 양식 (Fan to Pro 이력서 양식.docx) 을 업로드하면 자동으로 항목을 추출해서 미리보기 합니다. 확인 후 [저장] 을 눌러 DB 에 반영하세요.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 1. 파일 선택 */}
            <div className="space-y-2">
              <Label htmlFor="resume-docx" className="text-xs">
                docx 파일
              </Label>
              <input
                ref={fileInputRef}
                id="resume-docx"
                type="file"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={onFileChange}
                disabled={parsing || committing}
                className="block w-full text-sm file:mr-3 file:rounded file:border-0 file:bg-[var(--accent)] file:px-3 file:py-2 file:text-xs file:font-medium hover:file:bg-[var(--accent)]/80"
              />
              {fileName ? (
                <p className="text-[11px] text-[var(--muted-foreground)]">
                  선택된 파일: <span className="font-mono">{fileName}</span>
                </p>
              ) : null}
              {parsing ? (
                <p className="text-xs text-[var(--muted-foreground)]">파싱 중...</p>
              ) : null}
            </div>

            {/* 2. preview */}
            {preview ? (
              <div className="rounded-md border border-[var(--border)] bg-[var(--accent)]/30 p-3 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-medium text-sm">
                  <FileText className="h-4 w-4" />
                  파싱 결과 미리보기
                </div>
                <PreviewProfile parsed={preview} />
                <PreviewCareerTarget parsed={preview} />
                <PreviewItemsSummary parsed={preview} />
                {preview.warnings.length > 0 ? (
                  <div className="mt-2 rounded border border-[#ffc107]/40 bg-[#fff8e1] p-2 space-y-1">
                    <div className="flex items-center gap-1 text-[11px] font-medium text-[#7a5500]">
                      <AlertTriangle className="h-3 w-3" />
                      파싱 경고 ({preview.warnings.length})
                    </div>
                    <ul className="list-disc pl-4 text-[11px] text-[#7a5500] space-y-0.5">
                      {preview.warnings.slice(0, 10).map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                      {preview.warnings.length > 10 ? (
                        <li>... 외 {preview.warnings.length - 10}개</li>
                      ) : null}
                    </ul>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-[11px] text-[#067647]">
                    <CheckCircle2 className="h-3 w-3" />
                    파싱 경고 없음
                  </div>
                )}
              </div>
            ) : null}

            {/* 3. mode */}
            {preview ? (
              <fieldset className="space-y-2">
                <legend className="text-xs font-medium">
                  이력서 항목 저장 방식
                </legend>
                <label className="flex items-start gap-2 text-xs cursor-pointer">
                  <input
                    type="radio"
                    name="resume-import-mode"
                    value="append"
                    checked={mode === "append"}
                    onChange={() => setMode("append")}
                    disabled={committing}
                    className="mt-0.5"
                  />
                  <span>
                    <strong>추가</strong> — 기존 이력서 항목은 그대로 두고 새로 파싱된 항목만 뒤에 추가합니다.
                  </span>
                </label>
                <label className="flex items-start gap-2 text-xs cursor-pointer">
                  <input
                    type="radio"
                    name="resume-import-mode"
                    value="replace"
                    checked={mode === "replace"}
                    onChange={() => setMode("replace")}
                    disabled={committing}
                    className="mt-0.5"
                  />
                  <span>
                    <strong>덮어쓰기</strong> — 기존 이력서 항목 전체 삭제 후 새로 파싱된 항목으로 교체합니다. (인적사항 / 희망 진로는 항상 merge — null 필드는 보존)
                  </span>
                </label>
              </fieldset>
            ) : null}

            {error ? (
              <p className="text-xs text-[#b42318]">{error}</p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setOpen(false);
                reset();
              }}
              disabled={parsing || committing}
            >
              취소
            </Button>
            <Button
              type="button"
              onClick={onCommit}
              disabled={!preview || parsing || committing}
            >
              {committing ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---------- preview sub-components ----------------------------------------

function PreviewProfile({ parsed }: { parsed: ParsedResume }) {
  const p = parsed.profile;
  const rows = [
    ["한글 이름", p.name_ko],
    ["영문 이름", p.name_en],
    ["생년월일", p.birth_date],
    ["성별", p.gender ? GENDER_LABEL[p.gender] : null],
    ["연락처", p.phone],
    ["비자", p.visa_type],
    ["한국 거주", p.months_in_korea !== null ? `${p.months_in_korea}개월` : null],
    ["웹사이트", p.website_url],
  ].filter(([, v]) => v) as Array<[string, string]>;

  if (rows.length === 0) {
    return <p className="text-[11px] text-[var(--muted-foreground)]">인적사항: 추출된 필드 없음</p>;
  }
  return (
    <div>
      <p className="font-medium mb-1">인적사항</p>
      <dl className="grid grid-cols-[80px_1fr] gap-x-2 gap-y-0.5">
        {rows.map(([k, v]) => (
          <React.Fragment key={k}>
            <dt className="text-[var(--muted-foreground)]">{k}</dt>
            <dd className="truncate">{v}</dd>
          </React.Fragment>
        ))}
      </dl>
    </div>
  );
}

function PreviewCareerTarget({ parsed }: { parsed: ParsedResume }) {
  const t = parsed.career_target;
  const hasAny =
    t.target_role_category ||
    t.target_role_text ||
    t.target_companies.length > 0 ||
    t.desired_start_date ||
    t.self_pitch;
  if (!hasAny) return null;
  return (
    <div>
      <p className="font-medium mb-1">희망 진로</p>
      <dl className="grid grid-cols-[80px_1fr] gap-x-2 gap-y-0.5">
        {t.target_role_category ? (
          <>
            <dt className="text-[var(--muted-foreground)]">직무</dt>
            <dd className="truncate">{t.target_role_category}</dd>
          </>
        ) : t.target_role_text ? (
          <>
            <dt className="text-[var(--muted-foreground)]">직무</dt>
            <dd className="truncate">{t.target_role_text} (카테고리 미매칭)</dd>
          </>
        ) : null}
        {t.target_companies.length > 0 ? (
          <>
            <dt className="text-[var(--muted-foreground)]">회사</dt>
            <dd className="truncate">{t.target_companies.join(", ")}</dd>
          </>
        ) : null}
        {t.desired_start_date ? (
          <>
            <dt className="text-[var(--muted-foreground)]">시작</dt>
            <dd>{t.desired_start_date}</dd>
          </>
        ) : null}
        {t.self_pitch ? (
          <>
            <dt className="text-[var(--muted-foreground)]">자기 PR</dt>
            <dd className="line-clamp-2">{t.self_pitch}</dd>
          </>
        ) : null}
      </dl>
    </div>
  );
}

function PreviewItemsSummary({ parsed }: { parsed: ParsedResume }) {
  const counts: Record<string, number> = {};
  for (const item of parsed.resume_items) {
    counts[item.type] = (counts[item.type] ?? 0) + 1;
  }
  const entries = Object.entries(counts);
  return (
    <div>
      <p className="font-medium mb-1">
        이력서 항목 ({parsed.resume_items.length}개)
      </p>
      {entries.length === 0 ? (
        <p className="text-[11px] text-[var(--muted-foreground)]">
          추출된 항목 없음
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {entries.map(([type, count]) => (
            <span
              key={type}
              className="rounded bg-[var(--background)] px-2 py-0.5 text-[11px] border border-[var(--border)]"
            >
              {RESUME_TYPE_LABEL[type] ?? type} × {count}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

const GENDER_LABEL: Record<string, string> = {
  male: "남",
  female: "여",
  other: "기타",
  prefer_not_to_say: "비공개",
};

const RESUME_TYPE_LABEL: Record<string, string> = {
  education: "학력",
  experience: "경력",
  certification: "자격증",
  award: "수상",
  language: "어학",
  project: "프로젝트",
  activity: "기타활동",
  skill: "활용능력",
};

// ---------- 에러 메시지 매핑 ----------------------------------------------

function mapErrorMessage(code: string): string {
  if (code.startsWith("[lms-role] forbidden")) return "권한이 없어요.";
  if (code.includes("unauthenticated")) return "로그인이 필요해요.";
  if (code === "invalidInput") return "입력이 올바르지 않아요.";
  if (code === "invalidDataUrl") return "파일을 읽지 못했어요.";
  if (code === "fileTooLarge") return "파일이 5MB 를 넘어요.";
  if (code === "unsupportedFileType") return ".docx 만 지원해요.";
  if (code.startsWith("parseFailed")) return "docx 파싱에 실패했어요. 파일이 손상되었거나 양식이 아닐 수 있어요.";
  if (code === "supabaseUnavailable") return "DB 연결이 끊어졌어요. 다시 시도해 주세요.";
  return `오류: ${code}`;
}
