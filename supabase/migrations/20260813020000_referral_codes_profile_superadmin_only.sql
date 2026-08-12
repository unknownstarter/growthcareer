-- 레퍼럴 코드 교정 2 (2026-08-13)
--
-- 규칙 확정: user_profiles.referral_code 는 super_admin(노아 GCFTP0)만 보유.
--   학생/강사의 본인 코드는 person 레코드(students / instructors)가 소유.
--   admin 아닌 계정(orphan / lineage 미설정 포함)이 user_profiles 코드를 갖는 것은
--   "한 사람 코드 2개" 또는 잘못된 소유 → 제거.
--
-- 직전 교정(20260813010000)은 lineage(student_id/instructor_id) 기준이라 lineage 가
-- 안 걸린 계정을 못 잡음. 여기서 is_super_admin 기준으로 완전 정정.
--
-- 안전성: super_admin 이 아닌 user_profiles 의 referral_code 만 NULL.
--   GCFTP0(노아, is_super_admin=true) 유지. students/instructors 코드는 무관.

update public.user_profiles
   set referral_code = null
 where referral_code is not null
   and is_super_admin = false;
