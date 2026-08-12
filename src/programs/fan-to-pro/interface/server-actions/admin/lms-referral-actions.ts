"use server";

/**
 * 레퍼럴 표시용 admin server actions.
 *
 * 모집 어드민 (/admin/applicants) 에서 신청자가 입력한 추천 코드(referred_by_code)
 * 의 주인(추천인) 실명 + kind 를 조회한다. 추천인 실명은 준-PII 이므로 반드시
 * assertAdmin 뒤에서만 노출 (viewer 차단, LMS 학생 노출 X).
 *
 * N+1 회피: 여러 신청자가 같은 코드를 입력할 수 있으므로, 화면에 있는 distinct
 * 코드 집합만 뽑아 코드당 1회 resolveReferrerByCode 호출. 100명 신청자에 코드
 * 20종이면 20회 조회. 결과를 code -> Referrer map 으로 반환 → 클라이언트가 각
 * row 의 referredByCode 로 lookup.
 */
import { assertAdmin } from "@/src/programs/fan-to-pro/infrastructure/auth/admin-role";
import {
  resolveReferrerByCode,
  type Referrer,
} from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/referral-repository";

export type ReferrerLookupResult =
  | {
      status: "ok";
      /** 대문자 정규화된 코드 -> 추천인. 매칭 없는 코드는 map 에서 제외. */
      referrers: Record<string, Referrer>;
    }
  | { status: "error"; error: string };

/**
 * 입력 코드 배열 -> 추천인 map. distinct 처리 + admin 가드.
 * 빈 입력이면 빈 map (에러 아님).
 */
export async function resolveReferrersForCodes(
  codes: string[],
): Promise<ReferrerLookupResult> {
  try {
    await assertAdmin();

    const distinct = Array.from(
      new Set(
        codes
          .map((c) => (typeof c === "string" ? c.trim().toUpperCase() : ""))
          .filter((c) => c.length > 0),
      ),
    );

    if (distinct.length === 0) {
      return { status: "ok", referrers: {} };
    }

    const resolved = await Promise.all(
      distinct.map(async (code) => {
        const referrer = await resolveReferrerByCode(code);
        return [code, referrer] as const;
      }),
    );

    const referrers: Record<string, Referrer> = {};
    for (const [code, referrer] of resolved) {
      if (referrer) referrers[code] = referrer;
    }

    return { status: "ok", referrers };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return { status: "error", error: message };
  }
}
