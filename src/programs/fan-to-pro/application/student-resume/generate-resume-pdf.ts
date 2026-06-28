"use server";

/**
 * Student Resume PDF — server action (B0062).
 *
 * 현재 구현 (Iris 권고):
 *   - HTML 만 반환. PDF buffer 생성은 deferred.
 *   - 학생/운영자는 `/print` route 에서 window.print() → "PDF 로 저장" 사용.
 *
 * 이유:
 *   1. Vercel Function 50MB cap — playwright (450MB) 도 chromium-min (200MB) 도
 *      cap 초과 또는 가까움. 콜드 스타트 + 메모리 비용도 큼.
 *   2. 한국어 폰트 — chromium-min 은 noto-cjk 같은 한글 폰트 동봉 X.
 *      별도 빌드 step 으로 폰트 파일 ~5MB 추가 필요.
 *   3. browser print 는 OS 폰트 사용 + 사용자 친화 미리보기 + 무비용.
 *
 * 향후 server-side PDF 필요 시 옵션:
 *   A) Vercel + @sparticuz/chromium-min + playwright-core (별 빌드 + 폰트 동봉)
 *   B) 별 microservice (Cloud Run 등) 외부 호출
 *   C) @react-pdf/renderer (HTML 재구현 필요, 한글 폰트 manual 등록)
 *
 * 현재 응답 contract:
 *   - status: "html-only" + html: string + filename: string
 *     UI 가 다운로드 trigger (Blob URL + a.download) 또는 print() 호출.
 *
 * 권한: assertCanReadStudentProfile — student-self / super_admin /
 *   program admin / cohort instructor. 학생은 본인 이력서만.
 */
import { z } from "zod";
import { assertCanReadStudentProfile } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { buildResumeData } from "./build-resume-data";
import { renderResumeHtml } from "./resume-html-template";

const InputSchema = z.object({
  student_id: z.string().uuid(),
});

export type GenerateResumePdfResult =
  | {
      status: "html-only";
      html: string;
      filename: string;
      completion_percent: number;
    }
  | { status: "error"; error: string };

/**
 * 학생 이력서 HTML 생성 (server action).
 *
 * 현재 PDF buffer 는 미반환. 클라이언트가 HTML 받아 print() 또는 Blob 다운로드.
 *
 * @param input { student_id: uuid }
 * @returns { status: "html-only", html, filename, completion_percent }
 */
export async function generateStudentResumePdfAction(
  input: unknown,
): Promise<GenerateResumePdfResult> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: "invalidInput" };

  try {
    await assertCanReadStudentProfile(parsed.data.student_id);
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "forbidden",
    };
  }

  try {
    const data = await buildResumeData(parsed.data.student_id);
    const html = renderResumeHtml(data);

    // 파일명 — 영문/한글 이름 우선, fallback display_name. 확장자는 클라가 결정.
    const baseName =
      data.profile?.name_ko ||
      data.profile?.name_en ||
      data.student.display_name ||
      "resume";
    const safeName = baseName
      .replace(/[^a-zA-Z0-9가-힣_-]/g, "_")
      .slice(0, 40);
    const filename = `resume_${safeName}_${new Date()
      .toISOString()
      .slice(0, 10)}.html`;

    return {
      status: "html-only",
      html,
      filename,
      completion_percent: data.completion.percent,
    };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}
