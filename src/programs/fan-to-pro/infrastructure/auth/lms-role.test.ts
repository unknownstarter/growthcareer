/**
 * Characterization 안전망 (Task #9, 2/2) — lms-role.ts 판정 잠금.
 *
 * 이 파일이 green = 현재 auth 가드의 통과/throw 판정을 그대로 녹화한 상태.
 * 인증 Phase 1 (#10) 리팩터가 판정을 하나라도 바꾸면 이 테스트가 red 난다
 * = 회귀 0 보장. 로직 변경 X, 오직 현재 동작 기록.
 *
 * 모킹 전략 (라운드2 플랜):
 *   - getLmsUser / assert* 직접 mock X (내부 호출이라 안 먹음).
 *   - boundary (getSupabaseServer + getSupabaseAuthServer) 만 mock.
 *   - 실제 getLmsUser + 가드 로직이 통째로 돌아 판정이 잠긴다.
 *   - React cache() 는 identity 로 mock (node 에 request context 없음).
 */
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  makeAuthClient,
  makeServiceClient,
  type FakeDb,
} from "./__testutils__/mock-supabase";

// -------------------------------------------------------------------------
// hoisted mock state — vi.mock factory 가 참조. 각 테스트가 arrange() 로 주입.
// -------------------------------------------------------------------------
const h = vi.hoisted(() => ({
  state: {
    authUser: null as { id: string } | null,
    serviceClient: null as unknown, // null 이면 getSupabaseServer null 함정 재현.
  },
}));

// React cache() → identity. node/vitest 에 request store 없어 실제 cache 는
// per-call 로 동작하지만, 판정 로직에는 영향 없게 identity 로 고정.
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return { ...actual, cache: (fn: unknown) => fn };
});

vi.mock(
  "@/src/programs/fan-to-pro/infrastructure/auth/supabase-server-auth",
  () => ({
    getSupabaseAuthServer: () => Promise.resolve(makeAuthClient(h.state.authUser)),
  }),
);

vi.mock("@/src/programs/fan-to-pro/infrastructure/supabase/server", () => ({
  getSupabaseServer: () => h.state.serviceClient,
}));

// mock 선언 후 import (hoist 보장되지만 명시적으로).
import {
  getLmsUser,
  assertSuperAdmin,
  isProgramAdmin,
  assertProgramAdmin,
  assertCohortRole,
  assertCanAccessStudentCareer,
  getCohortMembershipRole,
  assertCanUploadMaterial,
  assertCanDownloadMaterial,
  assertCanWriteStudentNote,
  assertCanReadStudentNote,
  assertCanWriteStudentProfile,
  assertCanReadStudentProfile,
} from "./lms-role";

// -------------------------------------------------------------------------
// arrange 헬퍼 — role 별 profile + DB 셋업.
// -------------------------------------------------------------------------
const PROGRAM_ID = "prog-ftp";
const COHORT_ID = "cohort-1";
const OTHER_COHORT_ID = "cohort-2";

/** 주어진 user + DB 로 boundary state 주입. */
function arrange(opts: {
  authUser: { id: string } | null;
  db?: FakeDb;
  serviceNull?: boolean;
}) {
  h.state.authUser = opts.authUser;
  h.state.serviceClient = opts.serviceNull
    ? null
    : makeServiceClient(opts.db ?? {});
}

/** super_admin 시나리오: profile.is_super_admin = true. */
function superAdminDb(userId = "u-super"): FakeDb {
  return {
    userProfile: {
      id: userId,
      email: "super@x.com",
      display_name: "Super",
      company_id: null,
      student_id: null,
      instructor_id: null,
      is_super_admin: true,
      must_change_password: false,
    },
  };
}

/** program admin 시나리오 (super_admin=false + program_memberships admin). */
function programAdminDb(userId = "u-padmin"): FakeDb {
  return {
    userProfile: {
      id: userId,
      email: "padmin@x.com",
      display_name: "PAdmin",
      company_id: null,
      student_id: null,
      instructor_id: "i-1",
      is_super_admin: false,
      must_change_password: false,
    },
    cohortMembershipsForRoleInference: [],
    programsBySlug: { "fan-to-pro": { id: PROGRAM_ID } },
    programAdminPairs: new Set([`${userId}:${PROGRAM_ID}`]),
    cohortsById: { [COHORT_ID]: { program_id: PROGRAM_ID } },
  };
}

/** cohort instructor 시나리오. */
function instructorDb(userId = "u-inst"): FakeDb {
  return {
    userProfile: {
      id: userId,
      email: "inst@x.com",
      display_name: "Inst",
      company_id: null,
      student_id: null,
      instructor_id: "i-9",
      is_super_admin: false,
      must_change_password: false,
    },
    cohortMembershipsForRoleInference: [{ role: "instructor" }],
    programsBySlug: { "fan-to-pro": { id: PROGRAM_ID } },
    programAdminPairs: new Set(),
    cohortsById: { [COHORT_ID]: { program_id: PROGRAM_ID } },
    cohortMembershipByPair: { [`${userId}:${COHORT_ID}`]: { role: "instructor" } },
  };
}

/** cohort student 시나리오. studentId 는 이 학생의 user_profiles.student_id. */
function studentDb(userId = "u-stu", studentId = "s-self"): FakeDb {
  return {
    userProfile: {
      id: userId,
      email: "stu@x.com",
      display_name: "Stu",
      company_id: null,
      student_id: studentId,
      instructor_id: null,
      is_super_admin: false,
      must_change_password: false,
    },
    cohortMembershipsForRoleInference: [{ role: "student" }],
    programsBySlug: { "fan-to-pro": { id: PROGRAM_ID } },
    programAdminPairs: new Set(),
    cohortsById: { [COHORT_ID]: { program_id: PROGRAM_ID } },
    cohortMembershipByPair: { [`${userId}:${COHORT_ID}`]: { role: "student" } },
    studentsById: {
      [studentId]: {
        id: studentId,
        cohort_id: COHORT_ID,
        cohorts: { program_id: PROGRAM_ID },
      },
    },
  };
}

afterEach(() => {
  vi.useRealTimers();
});

// =========================================================================
// getLmsUser — 판정의 뿌리.
// =========================================================================
describe("getLmsUser", () => {
  it("session 없음 → null (미인증)", async () => {
    arrange({ authUser: null });
    expect(await getLmsUser()).toBeNull();
  });

  it("함정 방어: getSupabaseServer null → null (거짓 super_admin 방지)", async () => {
    // authUser 는 있지만 service client 가 null 이면 profile 조회 불가 → null.
    arrange({ authUser: { id: "u-1" }, serviceNull: true });
    expect(await getLmsUser()).toBeNull();
  });

  it("profile 없음(error) → null", async () => {
    arrange({ authUser: { id: "u-1" }, db: { userProfile: null } });
    expect(await getLmsUser()).toBeNull();
  });

  it("super_admin profile → isSuperAdmin true + role super_admin", async () => {
    arrange({ authUser: { id: "u-super" }, db: superAdminDb() });
    const u = await getLmsUser();
    expect(u?.isSuperAdmin).toBe(true);
    expect(u?.role).toBe("super_admin");
  });

  it("instructor membership 우선 추론", async () => {
    arrange({
      authUser: { id: "u-inst" },
      db: {
        userProfile: {
          id: "u-inst",
          email: "i@x.com",
          display_name: "I",
          company_id: null,
          student_id: null,
          instructor_id: "i-1",
          is_super_admin: false,
          must_change_password: false,
        },
        cohortMembershipsForRoleInference: [
          { role: "student" },
          { role: "instructor" },
        ],
      },
    });
    const u = await getLmsUser();
    expect(u?.role).toBe("instructor");
  });

  it("membership 없음 → 기본 student", async () => {
    arrange({
      authUser: { id: "u-x" },
      db: {
        userProfile: {
          id: "u-x",
          email: "x@x.com",
          display_name: "X",
          company_id: null,
          student_id: null,
          instructor_id: null,
          is_super_admin: false,
          must_change_password: false,
        },
        cohortMembershipsForRoleInference: [],
      },
    });
    const u = await getLmsUser();
    expect(u?.role).toBe("student");
  });
});

// =========================================================================
// assertSuperAdmin
// =========================================================================
describe("assertSuperAdmin", () => {
  it("super_admin 통과", async () => {
    arrange({ authUser: { id: "u-super" }, db: superAdminDb() });
    await expect(assertSuperAdmin()).resolves.toBeTruthy();
  });
  it("program_admin throw", async () => {
    arrange({ authUser: { id: "u-padmin" }, db: programAdminDb() });
    await expect(assertSuperAdmin()).rejects.toThrow(/not super_admin/);
  });
  it("미인증 throw", async () => {
    arrange({ authUser: null });
    await expect(assertSuperAdmin()).rejects.toThrow(/unauthenticated/);
  });
});

// =========================================================================
// isProgramAdmin (raw boolean)
// =========================================================================
describe("isProgramAdmin", () => {
  it("admin membership 있으면 true", async () => {
    arrange({ authUser: { id: "u-padmin" }, db: programAdminDb() });
    expect(await isProgramAdmin("u-padmin", "fan-to-pro")).toBe(true);
  });
  it("program slug 미존재 → false", async () => {
    arrange({
      authUser: { id: "u-1" },
      db: { programsBySlug: { "fan-to-pro": null } },
    });
    expect(await isProgramAdmin("u-1", "fan-to-pro")).toBe(false);
  });
  it("membership 없음 → false", async () => {
    arrange({
      authUser: { id: "u-1" },
      db: {
        programsBySlug: { "fan-to-pro": { id: PROGRAM_ID } },
        programAdminPairs: new Set(),
      },
    });
    expect(await isProgramAdmin("u-1", "fan-to-pro")).toBe(false);
  });
  it("supabase null → false", async () => {
    arrange({ authUser: { id: "u-1" }, serviceNull: true });
    expect(await isProgramAdmin("u-1", "fan-to-pro")).toBe(false);
  });
});

// =========================================================================
// assertProgramAdmin
// =========================================================================
describe("assertProgramAdmin", () => {
  it("super_admin 통과 (program 무관)", async () => {
    arrange({ authUser: { id: "u-super" }, db: superAdminDb() });
    await expect(assertProgramAdmin("fan-to-pro")).resolves.toBeTruthy();
  });
  it("program admin 통과", async () => {
    arrange({ authUser: { id: "u-padmin" }, db: programAdminDb() });
    await expect(assertProgramAdmin("fan-to-pro")).resolves.toBeTruthy();
  });
  it("instructor throw", async () => {
    arrange({ authUser: { id: "u-inst" }, db: instructorDb() });
    await expect(assertProgramAdmin("fan-to-pro")).rejects.toThrow(/not admin of program/);
  });
  it("미인증 throw", async () => {
    arrange({ authUser: null });
    await expect(assertProgramAdmin("fan-to-pro")).rejects.toThrow(/unauthenticated/);
  });
});

// =========================================================================
// assertCohortRole
// =========================================================================
describe("assertCohortRole", () => {
  it("super_admin 통과", async () => {
    arrange({ authUser: { id: "u-super" }, db: superAdminDb() });
    await expect(assertCohortRole(COHORT_ID, "instructor")).resolves.toBeTruthy();
  });
  it("program admin 통과", async () => {
    arrange({ authUser: { id: "u-padmin" }, db: programAdminDb() });
    await expect(assertCohortRole(COHORT_ID, "student")).resolves.toBeTruthy();
  });
  it("cohort instructor 가 instructor 가드 통과", async () => {
    arrange({ authUser: { id: "u-inst" }, db: instructorDb() });
    await expect(assertCohortRole(COHORT_ID, "instructor")).resolves.toBeTruthy();
  });
  it("cohort instructor 가 student 가드 요청 → throw (role 불일치)", async () => {
    arrange({ authUser: { id: "u-inst" }, db: instructorDb() });
    await expect(assertCohortRole(COHORT_ID, "student")).rejects.toThrow(/is not student/);
  });
  it("cohort student 가 자기 cohort student 가드 통과", async () => {
    arrange({ authUser: { id: "u-stu" }, db: studentDb() });
    await expect(assertCohortRole(COHORT_ID, "student")).resolves.toBeTruthy();
  });
  it("다른 cohort 요청 → throw", async () => {
    arrange({ authUser: { id: "u-stu" }, db: studentDb() });
    // OTHER_COHORT_ID 는 cohortsById 에 없음 → unknownCohort throw.
    await expect(assertCohortRole(OTHER_COHORT_ID, "student")).rejects.toThrow(/unknownCohort/);
  });
  it("미인증 throw", async () => {
    arrange({ authUser: null });
    await expect(assertCohortRole(COHORT_ID, "student")).rejects.toThrow(/unauthenticated/);
  });
  it("supabase null → throw", async () => {
    arrange({ authUser: { id: "u-stu" }, serviceNull: true });
    // getLmsUser 도 null 반환하므로 미인증 throw (함정: service null 이면 profile 못 읽음).
    await expect(assertCohortRole(COHORT_ID, "student")).rejects.toThrow(/unauthenticated/);
  });
});

// =========================================================================
// getCohortMembershipRole
// =========================================================================
describe("getCohortMembershipRole", () => {
  it("instructor row → instructor", async () => {
    arrange({ authUser: { id: "u-inst" }, db: instructorDb() });
    expect(await getCohortMembershipRole("u-inst", COHORT_ID)).toBe("instructor");
  });
  it("student row → student", async () => {
    arrange({ authUser: { id: "u-stu" }, db: studentDb() });
    expect(await getCohortMembershipRole("u-stu", COHORT_ID)).toBe("student");
  });
  it("membership 없음 → null", async () => {
    arrange({ authUser: { id: "u-x" }, db: { cohortMembershipByPair: {} } });
    expect(await getCohortMembershipRole("u-x", COHORT_ID)).toBeNull();
  });
  it("supabase null → null", async () => {
    arrange({ authUser: { id: "u-x" }, serviceNull: true });
    expect(await getCohortMembershipRole("u-x", COHORT_ID)).toBeNull();
  });
});

// =========================================================================
// assertCanAccessStudentCareer
// =========================================================================
describe("assertCanAccessStudentCareer", () => {
  it("super_admin 통과", async () => {
    arrange({ authUser: { id: "u-super" }, db: superAdminDb() });
    await expect(assertCanAccessStudentCareer("s-any")).resolves.toBeTruthy();
  });
  it("student-self fast-path 통과", async () => {
    arrange({ authUser: { id: "u-stu" }, db: studentDb("u-stu", "s-self") });
    await expect(assertCanAccessStudentCareer("s-self")).resolves.toBeTruthy();
  });
  it("IDOR: student 가 타인 studentId 접근 → throw", async () => {
    // 본인 student_id=s-self, 타인 s-other. s-other 는 자기 프로그램의 admin 아님.
    const db = studentDb("u-stu", "s-self");
    db.studentsById = {
      "s-other": {
        id: "s-other",
        cohort_id: COHORT_ID,
        cohorts: { program_id: PROGRAM_ID },
      },
    };
    arrange({ authUser: { id: "u-stu" }, db });
    await expect(assertCanAccessStudentCareer("s-other")).rejects.toThrow(/cannot access student/);
  });
  it("program admin 이 타 학생 접근 통과", async () => {
    const db = programAdminDb("u-padmin");
    db.studentsById = {
      "s-x": { id: "s-x", cohort_id: COHORT_ID, cohorts: { program_id: PROGRAM_ID } },
    };
    arrange({ authUser: { id: "u-padmin" }, db });
    await expect(assertCanAccessStudentCareer("s-x")).resolves.toBeTruthy();
  });
  it("cohort instructor 가 자기 cohort 학생 career read 통과", async () => {
    const db = instructorDb("u-inst");
    db.studentsById = {
      "s-x": { id: "s-x", cohort_id: COHORT_ID, cohorts: { program_id: PROGRAM_ID } },
    };
    arrange({ authUser: { id: "u-inst" }, db });
    await expect(assertCanAccessStudentCareer("s-x")).resolves.toBeTruthy();
  });
  it("알 수 없는 student → throw", async () => {
    const db = programAdminDb("u-padmin");
    db.studentsById = {};
    arrange({ authUser: { id: "u-padmin" }, db });
    await expect(assertCanAccessStudentCareer("s-none")).rejects.toThrow(/unknownStudent/);
  });
  it("미인증 throw", async () => {
    arrange({ authUser: null });
    await expect(assertCanAccessStudentCareer("s-x")).rejects.toThrow(/unauthenticated/);
  });
});

// =========================================================================
// assertCanUploadMaterial
// =========================================================================
describe("assertCanUploadMaterial", () => {
  it("super_admin 통과", async () => {
    arrange({ authUser: { id: "u-super" }, db: superAdminDb() });
    await expect(assertCanUploadMaterial(COHORT_ID)).resolves.toBeTruthy();
  });
  it("program admin 통과", async () => {
    arrange({ authUser: { id: "u-padmin" }, db: programAdminDb() });
    await expect(assertCanUploadMaterial(COHORT_ID)).resolves.toBeTruthy();
  });
  it("cohort instructor 통과", async () => {
    arrange({ authUser: { id: "u-inst" }, db: instructorDb() });
    await expect(assertCanUploadMaterial(COHORT_ID)).resolves.toBeTruthy();
  });
  it("student throw", async () => {
    arrange({ authUser: { id: "u-stu" }, db: studentDb() });
    await expect(assertCanUploadMaterial(COHORT_ID)).rejects.toThrow(/cannot upload material/);
  });
  it("sessionId 가 cohort 와 불일치 → throw", async () => {
    const db = superAdminDb();
    db.sessionsById = { "sess-1": { cohort_id: OTHER_COHORT_ID } };
    arrange({ authUser: { id: "u-super" }, db });
    await expect(assertCanUploadMaterial(COHORT_ID, "sess-1")).rejects.toThrow(/sessionCohortMismatch/);
  });
  it("sessionId 가 cohort 와 일치 → 통과", async () => {
    const db = superAdminDb();
    db.sessionsById = { "sess-1": { cohort_id: COHORT_ID } };
    arrange({ authUser: { id: "u-super" }, db });
    await expect(assertCanUploadMaterial(COHORT_ID, "sess-1")).resolves.toBeTruthy();
  });
  it("알 수 없는 session → throw", async () => {
    const db = superAdminDb();
    db.sessionsById = {};
    arrange({ authUser: { id: "u-super" }, db });
    await expect(assertCanUploadMaterial(COHORT_ID, "sess-none")).rejects.toThrow(/unknownSession/);
  });
  it("미인증 throw", async () => {
    arrange({ authUser: null });
    await expect(assertCanUploadMaterial(COHORT_ID)).rejects.toThrow(/unauthenticated/);
  });
});

// =========================================================================
// assertCanDownloadMaterial — 시각 의존 (fakeTimers).
// =========================================================================
describe("assertCanDownloadMaterial", () => {
  const NOW = new Date("2026-07-29T12:00:00Z");
  const PAST = "2026-06-01T00:00:00Z";
  const FUTURE = "2026-12-01T00:00:00Z";

  function materialDb(
    base: FakeDb,
    material: Record<string, unknown>,
  ): FakeDb {
    return {
      ...base,
      materialsById: { "m-1": { id: "m-1", cohort_id: COHORT_ID, ...material } },
    };
  }

  it("super_admin 은 draft 도 통과", async () => {
    const db = materialDb(superAdminDb(), {
      storage_method: "file_upload",
      file_path: "p",
      file_name: "f",
      external_url: null,
      visibility: "draft",
      visible_from: null,
    });
    arrange({ authUser: { id: "u-super" }, db });
    await expect(assertCanDownloadMaterial("m-1")).resolves.toBeTruthy();
  });

  it("student + published → 통과", async () => {
    const db = materialDb(studentDb(), {
      storage_method: "file_upload",
      file_path: "p",
      file_name: "f",
      external_url: null,
      visibility: "published",
      visible_from: null,
    });
    arrange({ authUser: { id: "u-stu" }, db });
    await expect(assertCanDownloadMaterial("m-1")).resolves.toBeTruthy();
  });

  it("student + draft → throw", async () => {
    const db = materialDb(studentDb(), {
      storage_method: "file_upload",
      file_path: "p",
      file_name: "f",
      external_url: null,
      visibility: "draft",
      visible_from: null,
    });
    arrange({ authUser: { id: "u-stu" }, db });
    await expect(assertCanDownloadMaterial("m-1")).rejects.toThrow(/not visible to student/);
  });

  it("student + scheduled + visible_from 과거 → 통과", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const db = materialDb(studentDb(), {
      storage_method: "file_upload",
      file_path: "p",
      file_name: "f",
      external_url: null,
      visibility: "scheduled",
      visible_from: PAST,
    });
    arrange({ authUser: { id: "u-stu" }, db });
    await expect(assertCanDownloadMaterial("m-1")).resolves.toBeTruthy();
  });

  it("student + scheduled + visible_from 미래 → throw", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const db = materialDb(studentDb(), {
      storage_method: "file_upload",
      file_path: "p",
      file_name: "f",
      external_url: null,
      visibility: "scheduled",
      visible_from: FUTURE,
    });
    arrange({ authUser: { id: "u-stu" }, db });
    await expect(assertCanDownloadMaterial("m-1")).rejects.toThrow(/not visible to student/);
  });

  it("student + scheduled + visible_from null → throw", async () => {
    const db = materialDb(studentDb(), {
      storage_method: "file_upload",
      file_path: "p",
      file_name: "f",
      external_url: null,
      visibility: "scheduled",
      visible_from: null,
    });
    arrange({ authUser: { id: "u-stu" }, db });
    await expect(assertCanDownloadMaterial("m-1")).rejects.toThrow(/not visible to student/);
  });

  it("instructor 는 visibility 무관 통과 (draft 도)", async () => {
    const db = materialDb(instructorDb(), {
      storage_method: "file_upload",
      file_path: "p",
      file_name: "f",
      external_url: null,
      visibility: "draft",
      visible_from: null,
    });
    arrange({ authUser: { id: "u-inst" }, db });
    await expect(assertCanDownloadMaterial("m-1")).resolves.toBeTruthy();
  });

  it("cohort 비회원 → throw", async () => {
    const db = materialDb(
      {
        userProfile: {
          id: "u-out",
          email: "o@x.com",
          display_name: "O",
          company_id: null,
          student_id: null,
          instructor_id: null,
          is_super_admin: false,
          must_change_password: false,
        },
        cohortMembershipsForRoleInference: [],
        cohortsById: { [COHORT_ID]: { program_id: PROGRAM_ID } },
        programAdminPairs: new Set(),
        cohortMembershipByPair: {},
      },
      {
        storage_method: "file_upload",
        file_path: "p",
        file_name: "f",
        external_url: null,
        visibility: "published",
        visible_from: null,
      },
    );
    arrange({ authUser: { id: "u-out" }, db });
    await expect(assertCanDownloadMaterial("m-1")).rejects.toThrow(/not member of cohort/);
  });

  it("알 수 없는 material → throw", async () => {
    const db = { ...superAdminDb(), materialsById: {} };
    arrange({ authUser: { id: "u-super" }, db });
    await expect(assertCanDownloadMaterial("m-none")).rejects.toThrow(/unknownMaterial/);
  });

  it("미인증 throw", async () => {
    arrange({ authUser: null });
    await expect(assertCanDownloadMaterial("m-1")).rejects.toThrow(/unauthenticated/);
  });
});

// =========================================================================
// assertCanWriteStudentNote / assertCanReadStudentNote
// =========================================================================
describe("assertCanWriteStudentNote", () => {
  function noteDb(base: FakeDb, studentId = "s-x"): FakeDb {
    return {
      ...base,
      studentsById: {
        [studentId]: {
          id: studentId,
          cohort_id: COHORT_ID,
          cohorts: { program_id: PROGRAM_ID },
        },
      },
    };
  }

  it("super_admin 통과 authorRole super_admin", async () => {
    arrange({ authUser: { id: "u-super" }, db: superAdminDb() });
    const r = await assertCanWriteStudentNote("s-x");
    expect(r.authorRole).toBe("super_admin");
  });
  it("program admin 통과 authorRole admin", async () => {
    arrange({ authUser: { id: "u-padmin" }, db: noteDb(programAdminDb()) });
    const r = await assertCanWriteStudentNote("s-x");
    expect(r.authorRole).toBe("admin");
  });
  it("cohort instructor 통과 authorRole instructor", async () => {
    arrange({ authUser: { id: "u-inst" }, db: noteDb(instructorDb()) });
    const r = await assertCanWriteStudentNote("s-x");
    expect(r.authorRole).toBe("instructor");
  });
  it("학생 본인이어도 student_notes 차단 (student 는 통과 자격 없음)", async () => {
    // student self: user.studentId === s-self 이지만 note 는 self fast-path 없음.
    arrange({ authUser: { id: "u-stu" }, db: noteDb(studentDb("u-stu", "s-self"), "s-self") });
    await expect(assertCanWriteStudentNote("s-self")).rejects.toThrow(/cannot write notes/);
  });
  it("알 수 없는 student → throw", async () => {
    const db = { ...programAdminDb(), studentsById: {} };
    arrange({ authUser: { id: "u-padmin" }, db });
    await expect(assertCanWriteStudentNote("s-none")).rejects.toThrow(/unknownStudent/);
  });
  it("미인증 throw", async () => {
    arrange({ authUser: null });
    await expect(assertCanWriteStudentNote("s-x")).rejects.toThrow(/unauthenticated/);
  });
});

describe("assertCanReadStudentNote", () => {
  it("학생은 read 차단 (write 권한과 동일)", async () => {
    const db = {
      ...studentDb("u-stu", "s-self"),
      studentsById: {
        "s-self": { id: "s-self", cohort_id: COHORT_ID, cohorts: { program_id: PROGRAM_ID } },
      },
    };
    arrange({ authUser: { id: "u-stu" }, db });
    await expect(assertCanReadStudentNote("s-self")).rejects.toThrow(/cannot write notes/);
  });
  it("instructor read 통과", async () => {
    const db = {
      ...instructorDb(),
      studentsById: {
        "s-x": { id: "s-x", cohort_id: COHORT_ID, cohorts: { program_id: PROGRAM_ID } },
      },
    };
    arrange({ authUser: { id: "u-inst" }, db });
    await expect(assertCanReadStudentNote("s-x")).resolves.toBeTruthy();
  });
});

// =========================================================================
// assertCanWriteStudentProfile — IDOR self fast-path 핵심.
// =========================================================================
describe("assertCanWriteStudentProfile", () => {
  function profDb(base: FakeDb, studentId = "s-x"): FakeDb {
    return {
      ...base,
      studentsById: {
        [studentId]: { id: studentId, cohorts: { program_id: PROGRAM_ID } },
      },
    };
  }

  it("super_admin 통과", async () => {
    arrange({ authUser: { id: "u-super" }, db: superAdminDb() });
    await expect(assertCanWriteStudentProfile("s-x")).resolves.toBeTruthy();
  });
  it("student self fast-path 통과", async () => {
    arrange({ authUser: { id: "u-stu" }, db: studentDb("u-stu", "s-self") });
    await expect(assertCanWriteStudentProfile("s-self")).resolves.toBeTruthy();
  });
  it("IDOR: student 가 타인 profile 쓰기 → throw", async () => {
    const db = studentDb("u-stu", "s-self");
    db.studentsById = { "s-other": { id: "s-other", cohorts: { program_id: PROGRAM_ID } } };
    arrange({ authUser: { id: "u-stu" }, db });
    await expect(assertCanWriteStudentProfile("s-other")).rejects.toThrow(/cannot write profile/);
  });
  it("program admin 통과", async () => {
    arrange({ authUser: { id: "u-padmin" }, db: profDb(programAdminDb()) });
    await expect(assertCanWriteStudentProfile("s-x")).resolves.toBeTruthy();
  });
  it("instructor 는 profile 쓰기 X → throw", async () => {
    arrange({ authUser: { id: "u-inst" }, db: profDb(instructorDb()) });
    await expect(assertCanWriteStudentProfile("s-x")).rejects.toThrow(/cannot write profile/);
  });
  it("미인증 throw", async () => {
    arrange({ authUser: null });
    await expect(assertCanWriteStudentProfile("s-x")).rejects.toThrow(/unauthenticated/);
  });
});

// =========================================================================
// assertCanReadStudentProfile — read 는 instructor 도 허용.
// =========================================================================
describe("assertCanReadStudentProfile", () => {
  function profDb(base: FakeDb, studentId = "s-x"): FakeDb {
    return {
      ...base,
      studentsById: {
        [studentId]: {
          id: studentId,
          cohort_id: COHORT_ID,
          cohorts: { program_id: PROGRAM_ID },
        },
      },
    };
  }

  it("super_admin 통과", async () => {
    arrange({ authUser: { id: "u-super" }, db: superAdminDb() });
    await expect(assertCanReadStudentProfile("s-x")).resolves.toBeTruthy();
  });
  it("student self 통과", async () => {
    arrange({ authUser: { id: "u-stu" }, db: studentDb("u-stu", "s-self") });
    await expect(assertCanReadStudentProfile("s-self")).resolves.toBeTruthy();
  });
  it("IDOR: student 가 타인 profile read → throw", async () => {
    const db = studentDb("u-stu", "s-self");
    db.studentsById = {
      "s-other": { id: "s-other", cohort_id: COHORT_ID, cohorts: { program_id: PROGRAM_ID } },
    };
    arrange({ authUser: { id: "u-stu" }, db });
    await expect(assertCanReadStudentProfile("s-other")).rejects.toThrow(/cannot read profile/);
  });
  it("program admin 통과", async () => {
    arrange({ authUser: { id: "u-padmin" }, db: profDb(programAdminDb()) });
    await expect(assertCanReadStudentProfile("s-x")).resolves.toBeTruthy();
  });
  it("cohort instructor read 통과 (write 와 다르게 허용)", async () => {
    arrange({ authUser: { id: "u-inst" }, db: profDb(instructorDb()) });
    await expect(assertCanReadStudentProfile("s-x")).resolves.toBeTruthy();
  });
  it("미인증 throw", async () => {
    arrange({ authUser: null });
    await expect(assertCanReadStudentProfile("s-x")).rejects.toThrow(/unauthenticated/);
  });
});
