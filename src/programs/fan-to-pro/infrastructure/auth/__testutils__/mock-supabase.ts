/**
 * Characterization 테스트용 boundary mock 헬퍼 (Task #9, 안전망 2/2).
 *
 * 전략: getLmsUser / assert* 를 직접 mock 하지 않는다 (같은 모듈 내부 호출이라
 * 안 먹음 + 판정 로직이 잠기지 않음). 대신 그 아래 boundary 인
 *   - getSupabaseServer()      (service_role client, RLS 우회)
 *   - getSupabaseAuthServer()  (.auth.getUser())
 * 을 mock 해서 통제된 row shape 를 흘려보낸다. 실제 getLmsUser + 가드 로직이
 * 그 위에서 통째로 돈다 = 판정 잠금.
 *
 * 함정 방어 (라운드3 지적): getSupabaseServer 가 null 이면 getLmsUser 가 null
 * 반환 → 전 케이스 "미인증" 거짓통과. buildAuthedClient 는 항상 유효(=non-null)
 * 클라이언트를 반환한다. null 함정 자체도 lms-role.test.ts 에서 별도 방어.
 */
import { vi } from "vitest";

// -------------------------------------------------------------------------
// canned DB 상태 — 테스트가 이 shape 를 채워 넣으면 chainable builder 가 재현.
// -------------------------------------------------------------------------

export interface FakeDb {
  /** user_profiles row (getLmsUser). null = profile 없음 → getLmsUser null. */
  userProfile?: Record<string, unknown> | null;
  /** getLmsUser 안 cohort_memberships (.eq(user_id).order()) 가 반환할 배열. */
  cohortMembershipsForRoleInference?: Array<{ role: string }>;
  /** programs .eq(slug).single() → { id } | null. slug 별. */
  programsBySlug?: Record<string, { id: string } | null>;
  /** cohorts .eq(id) → { program_id } | null. cohortId 별. */
  cohortsById?: Record<string, { program_id: string } | null>;
  /**
   * program_memberships .eq(user_id).eq(program_id).eq(role,'admin').maybeSingle().
   * key = `${userId}:${programId}` → truthy row 면 admin.
   */
  programAdminPairs?: Set<string>;
  /**
   * cohort_memberships .eq(user_id).eq(cohort_id)[.eq(role)].maybeSingle().
   * key = `${userId}:${cohortId}` → { role } | undefined.
   */
  cohortMembershipByPair?: Record<string, { role: string } | undefined>;
  /** students .eq(id).maybeSingle(). studentId 별. */
  studentsById?: Record<string, Record<string, unknown> | null>;
  /** sessions .eq(id).maybeSingle(). sessionId 별. */
  sessionsById?: Record<string, { cohort_id: string } | null>;
  /** lecture_materials .eq(id).maybeSingle(). materialId 별. */
  materialsById?: Record<string, Record<string, unknown> | null>;
}

/**
 * 체이닝 가능한 query builder mock.
 *
 * from(table) 이 어떤 terminal(single/maybeSingle/order) 로 끝나는지에 따라
 * FakeDb 에서 canned row 를 골라 반환. .eq() 인자를 누적해 key 로 사용.
 */
function makeFrom(db: FakeDb) {
  return (table: string) => {
    const eqs: Record<string, unknown> = {};
    // eq 호출 순서 보존 (필요 시).
    const eqList: Array<[string, unknown]> = [];

    const builder: Record<string, unknown> = {
      select: () => builder,
      eq: (col: string, val: unknown) => {
        eqs[col] = val;
        eqList.push([col, val]);
        return builder;
      },
      order: () => {
        // getLmsUser 의 cohort_memberships.select("role").eq(user_id).order()
        // → Promise 로 { data: [...] }.
        return Promise.resolve({
          data: db.cohortMembershipsForRoleInference ?? [],
          error: null,
        });
      },
      single: () => Promise.resolve(resolveSingle(table, eqs, db)),
      maybeSingle: () => Promise.resolve(resolveSingle(table, eqs, db)),
    };
    return builder;
  };
}

function resolveSingle(
  table: string,
  eqs: Record<string, unknown>,
  db: FakeDb,
): { data: unknown; error: unknown } {
  switch (table) {
    case "user_profiles": {
      const p = db.userProfile ?? null;
      return p
        ? { data: p, error: null }
        : { data: null, error: { message: "no profile" } };
    }
    case "programs": {
      const slug = eqs.slug as string;
      const row = db.programsBySlug?.[slug] ?? null;
      return { data: row, error: null };
    }
    case "cohorts": {
      const id = eqs.id as string;
      const row = db.cohortsById?.[id] ?? null;
      return { data: row, error: null };
    }
    case "program_memberships": {
      const userId = eqs.user_id as string;
      const programId = eqs.program_id as string;
      const key = `${userId}:${programId}`;
      const isAdmin = db.programAdminPairs?.has(key) ?? false;
      return { data: isAdmin ? { user_id: userId } : null, error: null };
    }
    case "cohort_memberships": {
      const userId = eqs.user_id as string;
      const cohortId = eqs.cohort_id as string;
      const key = `${userId}:${cohortId}`;
      const row = db.cohortMembershipByPair?.[key];
      // assertCohortRole 은 .eq('role', role) 도 붙임 → role 불일치면 null.
      if (row && eqs.role !== undefined && row.role !== eqs.role) {
        return { data: null, error: null };
      }
      return { data: row ?? null, error: null };
    }
    case "students": {
      const id = eqs.id as string;
      const row = db.studentsById?.[id] ?? null;
      return { data: row, error: null };
    }
    case "sessions": {
      const id = eqs.id as string;
      const row = db.sessionsById?.[id] ?? null;
      return { data: row, error: null };
    }
    case "lecture_materials": {
      const id = eqs.id as string;
      const row = db.materialsById?.[id] ?? null;
      return { data: row, error: null };
    }
    default:
      return { data: null, error: null };
  }
}

/** 유효한(=non-null) service_role client mock. from() 이 canned row 를 흘림. */
export function makeServiceClient(db: FakeDb) {
  return { from: makeFrom(db) };
}

/** getSupabaseAuthServer mock — .auth.getUser() 가 주어진 user 반환. */
export function makeAuthClient(user: { id: string } | null) {
  return {
    auth: {
      getUser: () => Promise.resolve({ data: { user }, error: null }),
    },
  };
}

/**
 * 표준 셋업: vi.mock 으로 boundary 두 개를 hoisted mock 한 뒤, 각 테스트가
 * setScenario 로 (auth user + DB) 를 주입한다.
 *
 * vi.mock 은 hoist 되므로 이 함수는 mock factory 안에서 참조할 state 객체를
 * 돌려준다. 테스트 파일 상단에서 vi.mock 을 직접 선언하고 이 state 를 쓴다.
 */
export function makeMockState() {
  const state: {
    authUser: { id: string } | null;
    serviceClient: unknown;
  } = {
    authUser: null,
    serviceClient: null, // null 이면 getSupabaseServer null 함정 재현.
  };

  const setScenario = (opts: {
    authUser: { id: string } | null;
    db?: FakeDb;
    /** true 면 serviceClient 를 null 로 (getSupabaseServer null 함정 테스트). */
    serviceNull?: boolean;
  }) => {
    state.authUser = opts.authUser;
    state.serviceClient = opts.serviceNull
      ? null
      : makeServiceClient(opts.db ?? {});
  };

  return { state, setScenario };
}

// re-export vi 편의.
export { vi };
