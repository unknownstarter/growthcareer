import { redirect } from "next/navigation";

/**
 * /lms - 단순 진입점. middleware 가 이미 role 따라 /lms/admin/dashboard 등으로
 * redirect 처리하지만, fallback 으로 client side 진입한 경우를 위해 /lms/login 으로.
 */
export default function LmsRoot() {
  redirect("/lms/login");
}
