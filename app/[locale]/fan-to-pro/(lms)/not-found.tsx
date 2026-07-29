/**
 * LMS admin surface 404 (라이트 톤).
 *
 * layout 이 LmsShell 을 감싸므로 이 not-found 도 shell 안에서 렌더된다.
 * "대시보드로 돌아가기" 로 안전 복귀.
 */
import { NotFoundView } from "@/src/programs/fan-to-pro/interface/components/lms/ui/not-found-view";

export default function AdminNotFound() {
  return (
    <NotFoundView
      title="페이지를 찾을 수 없어요"
      description="주소가 바뀌었거나 삭제된 페이지일 수 있어요. 대시보드에서 다시 찾아주세요."
      homeLabel="대시보드로 돌아가기"
    />
  );
}
