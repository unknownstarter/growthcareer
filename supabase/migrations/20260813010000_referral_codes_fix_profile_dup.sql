-- 레퍼럴 코드 교정 (2026-08-13)
--
-- 직전 마이그레이션(20260813000000)의 user_profiles 백필이 lineage 있는 계정
-- (student_id / instructor_id 연결된 학생/강사 계정)에도 referral_code 를 부여해
-- "한 사람이 코드 2개"(students/instructors 코드 + user_profiles 코드) 상태가 됨.
--
-- 정정: 본인 코드의 소유 주체 = person 레코드(students / instructors).
--   user_profiles.referral_code 는 lineage 없는 순수 admin 계정(노아 GCFTP0)만 보유.
--   lineage 있는 계정은 자기 students/instructors 코드를 사용 → user_profiles 코드 제거.
--
-- 안전성: student_id/instructor_id 있는 profile 의 referral_code 만 NULL 로.
--   GCFTP0(노아, lineage 없음)은 영향 없음. person 레코드 코드는 그대로 유지.

update public.user_profiles
   set referral_code = null
 where referral_code is not null
   and (student_id is not null or instructor_id is not null);
