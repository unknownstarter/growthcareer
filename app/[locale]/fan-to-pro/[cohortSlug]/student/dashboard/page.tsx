import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { User, BookOpen, Briefcase, Award, ArrowRight } from "lucide-react";
import { getLmsUser } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { fetchStudentById } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-repository";
import { fetchStudentProfile } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-profile-repository";
import { fetchCohortById } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/cohort-repository";
import { Badge } from "@/src/programs/fan-to-pro/interface/components/lms/ui/badge";
import {
  PageContainer,
  PageHeader,
} from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/card";

export const metadata: Metadata = {
  title: "내 학습 - Fan to Pro",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

/**
 * /[locale]/fan-to-pro/[cohortSlug]/student/dashboard. 학생 홈.
 *
 * 로그인 직후 진입 (post-login redirect target).
 * 빠른 3 link (프로필 / 수업 자료 / 커리어 문서) + 환영 메시지.
 */
export default async function StudentDashboardPage({
  params,
}: {
  params: Promise<{ locale: string; cohortSlug: string }>;
}) {
  const { locale, cohortSlug } = await params;
  const user = await getLmsUser();
  if (!user) redirect(`/${locale}/auth/login` as Route);
  if (!user.studentId) {
    if (user.isSuperAdmin) {
      redirect(`/${locale}/fan-to-pro/admin/students` as Route);
    }
    redirect(`/${locale}/auth/login?error=no_student` as Route);
  }

  const student = await fetchStudentById(user.studentId);
  const profile = await fetchStudentProfile(user.studentId).catch(() => null);
  const cohort = student
    ? await fetchCohortById(student.cohort_id).catch(() => null)
    : null;
  const displayName = profile?.name_ko ?? student?.display_name ?? user.displayName;
  const isEn = locale === "en";

  // 종강 여부. 수료증 카드 활성 조건 (§7 SSG 금지 룰: force-dynamic 이므로 매 요청 판정).
  const cohortCompleted = cohort?.status === "completed";

  const base = `/${locale}/fan-to-pro/${cohortSlug}/student`;
  const items: Array<{
    href: Route;
    icon: typeof User;
    title: string;
    desc: string;
    disabled?: boolean;
    badge?: string;
  }> = [
    {
      href: `${base}/profile` as Route,
      icon: User,
      title: isEn ? "My profile" : "내 프로필",
      desc: isEn
        ? "Basic info, career target, resume items, photo."
        : "기본 정보, 희망 진로, 이력서, 사진을 등록합니다.",
    },
    {
      href: `${base}/materials` as Route,
      icon: BookOpen,
      title: isEn ? "Course materials" : "수업 자료",
      desc: isEn
        ? "Download weekly slides, references, and recordings."
        : "회차별 강의 슬라이드, 참고 자료, 녹화본을 다운로드합니다.",
    },
    {
      href: `${base}/career` as Route,
      icon: Briefcase,
      title: isEn ? "Career documents" : "커리어 문서",
      desc: isEn
        ? "Upload resume, cover letter, and portfolio for review."
        : "이력서, 자기소개서, 포트폴리오를 등록하고 첨삭을 받습니다.",
    },
    {
      href: `${base}/certificates` as Route,
      icon: Award,
      title: isEn ? "Certificate" : "수료증",
      desc: isEn
        ? "Download your completion certificate as PDF after the program ends."
        : "종강 후 수료증을 PDF 로 다운로드할 수 있어요.",
      disabled: !cohortCompleted,
      badge: cohortCompleted
        ? undefined
        : isEn
          ? "After program ends"
          : "종강 후 발급",
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title={isEn ? `Welcome, ${displayName}` : `안녕하세요, ${displayName}`}
        description={
          isEn
            ? "Track your profile progress, download lecture materials, and manage your career documents."
            : "프로필 진척, 강의 자료 다운로드, 커리어 문서 관리를 한 곳에서."
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ href, icon: Icon, title, desc, disabled, badge }) => (
          <Link
            key={href}
            href={href}
            className={`block group ${disabled ? "pointer-events-none" : ""}`}
            aria-disabled={disabled}
          >
            <Card
              className={`h-full transition-shadow ${
                disabled ? "opacity-60" : "hover:shadow-md"
              }`}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius)] bg-[var(--primary)]/10 text-[var(--primary)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  {disabled ? (
                    <Badge variant="secondary" className="text-[10px]">
                      {badge}
                    </Badge>
                  ) : (
                    <ArrowRight className="h-4 w-4 text-[var(--muted-foreground)] group-hover:text-[var(--primary)] transition-colors" />
                  )}
                </div>
                <CardTitle className="mt-3 text-base">{title}</CardTitle>
                <CardDescription className="text-xs">{desc}</CardDescription>
              </CardHeader>
              <CardContent />
            </Card>
          </Link>
        ))}
      </div>
    </PageContainer>
  );
}
