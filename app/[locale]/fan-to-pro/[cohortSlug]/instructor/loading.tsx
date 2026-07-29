/**
 * 강사 surface loading ([cohortSlug]/instructor/* — 회차 / 출석 / 자료 관리).
 *
 * 왜 세그먼트 레벨:
 *   - student / admin 트리는 각자 loading.tsx 보유. instructor 트리는 부재였음.
 *   - 상위 [cohortSlug]/loading.tsx (StudentLoading 재사용) 로 상속 커버되긴 하나,
 *     학생용 3-카드 skeleton 은 강사 관리 화면 형태와 어긋남.
 *   - 강사 화면 형태 (헤더 + 세션 리스트 골격) 에 맞춘 skeleton 을 세그먼트에 둔다.
 *
 * instructor 페이지가 아직 route 로 없더라도, 향후 페이지 landing 시 즉시 이 skeleton 이 적용됨.
 */
import { LoadingOverlay } from "@/src/programs/fan-to-pro/interface/components/lms/ui/loading-overlay";

export default function InstructorLoading() {
  return (
    <LoadingOverlay title="페이지">
      <div className="px-6 py-8 md:px-10 md:py-10 max-w-5xl mx-auto motion-safe:animate-pulse">
        {/* PageHeader skeleton */}
        <header className="border-b border-[var(--border)] pb-6 mb-6 space-y-2">
          <div className="h-7 w-52 rounded bg-[var(--muted)]" />
          <div className="h-4 w-72 rounded bg-[var(--muted)]" />
        </header>

        {/* 세션 리스트 골격 (강사 = 회차 중심 화면) */}
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4"
            >
              <div className="h-10 w-10 shrink-0 rounded-[var(--radius)] bg-[var(--muted)]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 rounded bg-[var(--muted)]" />
                <div className="h-3 w-64 rounded bg-[var(--muted)]" />
              </div>
              <div className="h-8 w-20 rounded-[var(--radius)] bg-[var(--muted)]" />
            </div>
          ))}
        </div>
      </div>
    </LoadingOverlay>
  );
}
