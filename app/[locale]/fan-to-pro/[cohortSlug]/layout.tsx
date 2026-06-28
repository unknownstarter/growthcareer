/**
 * /[locale]/fan-to-pro/[cohortSlug]/* — 학생 / 강사 surface 의 light theme wrap.
 *
 * (lms) group 의 LmsGroupLayout 과 동일 패턴. cohortSlug 디렉토리가 (lms) group
 * 밖에 있어서 별도 wrap 필요. ADR 0006 §3 — `<html className="dark">` 안에서
 * `<div data-theme="light">` nested override.
 *
 * student layout 의 LmsShell 이 sidebar/topbar 처리 — 본 wrap 은 theme 만.
 */
export default function CohortSurfaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      data-theme="light"
      className="min-h-screen bg-[var(--background)] text-[var(--foreground)]"
    >
      {children}
    </div>
  );
}
