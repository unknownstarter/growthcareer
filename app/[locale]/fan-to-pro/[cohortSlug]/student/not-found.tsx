/**
 * 학생 surface 404 (라이트 톤).
 *
 * cohortSlug 는 not-found 에서 접근 불가 -> NotFoundView 가 pathname 으로 안전 목적지 계산.
 */
import { NotFoundView } from "@/src/programs/fan-to-pro/interface/components/lms/ui/not-found-view";

export default function StudentNotFound() {
  return (
    <NotFoundView
      title="페이지를 찾을 수 없어요"
      description="주소가 바뀌었거나 삭제된 페이지일 수 있어요. 대시보드에서 다시 시작해주세요."
      homeLabel="대시보드로 돌아가기"
    />
  );
}
