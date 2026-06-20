/**
 * LMS route group layout (ADR 0006 §3).
 *
 * 향후 `/instructor/*`, `/student/*`, 강사/학생 surface 가 들어갈 자리.
 * 어드민 LMS 페이지 (`/admin/cohorts`) 는 `app/admin/*` (locale 밖 root
 * layout) 라 별개 — 페이지 내부에 동일한 `<div data-theme="light">`
 * wrapper 를 두는 패턴.
 *
 * 핵심: `<html data-theme>` 가 아닌 nested wrapper. SSR/hydration 안전
 * + 한 페이지 두 theme 섞임 사고 방지 (마케팅 다크 / LMS 라이트).
 *
 * Wave 0 에서는 학생/강사 라우트 없음 — 이 layout 은 Wave 1 시점에
 * 실제 페이지가 들어올 때 의미를 가짐. 지금은 골격만 박음.
 */
export default function LmsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-theme="light" className="min-h-screen">
      {children}
    </div>
  );
}
