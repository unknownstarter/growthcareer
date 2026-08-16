import { AdminLoadingSkeleton } from "@/src/programs/fan-to-pro/admin/components/admin-loading-skeleton";

// force-dynamic 페이지 첫 페인트 blank 방지 (§6.7). 다크 톤 테이블 스켈레톤.
export default function Loading() {
  return <AdminLoadingSkeleton tabs={3} variant="table" />;
}
