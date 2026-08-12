/**
 * 커뮤니티 클라이언트 액션 공용 에러 메시지 매핑.
 */
export function communityErrorMessage(code: string): string {
  switch (code) {
    case "unauthenticated":
      return "로그인이 필요합니다";
    case "forbidden":
      return "권한이 없습니다";
    case "invalidInput":
      return "입력값을 확인해주세요";
    case "notFound":
      return "이미 삭제된 항목입니다";
    case "programUnavailable":
    case "supabaseUnavailable":
      return "잠시 후 다시 시도해주세요";
    default:
      return "처리에 실패했어요. 잠시 후 다시 시도해주세요";
  }
}
