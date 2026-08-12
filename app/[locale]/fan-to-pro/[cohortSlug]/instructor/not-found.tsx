/**
 * 강사 surface 404 (라이트 톤). student not-found 미러링.
 */
import { NotFoundView } from "@/src/programs/fan-to-pro/interface/components/lms/ui/not-found-view";

export default function InstructorNotFound() {
  return (
    <NotFoundView
      title="페이지를 찾을 수 없어요"
      description="주소가 바뀌었거나 삭제된 페이지일 수 있어요. 커뮤니티에서 다시 시작해주세요."
      homeLabel="커뮤니티로 돌아가기"
    />
  );
}
