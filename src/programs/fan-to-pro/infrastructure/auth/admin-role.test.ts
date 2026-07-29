/**
 * Characterization 안전망 (Task #9, 2/2) — admin-role.ts 판정 잠금.
 *
 * dual-mode 가드: (1) Basic Auth surface = x-admin-role header, (2) LMS surface
 * = header 부재 시 getLmsUser super_admin / program admin fallback.
 *
 * 헤더 위조 방어 핵심: 클라이언트가 x-admin-role 을 위조해도, 이 값은 middleware
 * 만 set 하는 신뢰 경계. 테스트는 "header 가 admin 이면 통과, viewer 면 mutate
 * 차단, 그 외(빈/위조 문자열)는 LMS fallback 으로만 판정" 을 녹화.
 *
 * 모킹: next/headers 의 headers() + lms-role 의 getLmsUser/isProgramAdmin 를
 * boundary 로 mock. admin-role 자체 로직(header 파싱 + fallback 분기)은 실제로 돈다.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  headerValue: null as string | null,
  lmsUser: null as { id: string; isSuperAdmin: boolean } | null,
  programAdmin: false,
}));

vi.mock("next/headers", () => ({
  headers: () =>
    Promise.resolve({
      get: (name: string) =>
        name === "x-admin-role" ? h.headerValue : null,
    }),
}));

vi.mock("./lms-role", () => ({
  getLmsUser: () => Promise.resolve(h.lmsUser),
  isProgramAdmin: () => Promise.resolve(h.programAdmin),
}));

import { getAdminRole, assertAdmin, ADMIN_ROLE_HEADER } from "./admin-role";

beforeEach(() => {
  h.headerValue = null;
  h.lmsUser = null;
  h.programAdmin = false;
});

describe("ADMIN_ROLE_HEADER 상수", () => {
  it("x-admin-role", () => {
    expect(ADMIN_ROLE_HEADER).toBe("x-admin-role");
  });
});

// =========================================================================
// getAdminRole
// =========================================================================
describe("getAdminRole", () => {
  it("header admin → admin", async () => {
    h.headerValue = "admin";
    expect(await getAdminRole()).toBe("admin");
  });
  it("header viewer → viewer", async () => {
    h.headerValue = "viewer";
    expect(await getAdminRole()).toBe("viewer");
  });
  it("header 없음 + LMS super_admin → admin", async () => {
    h.headerValue = null;
    h.lmsUser = { id: "u", isSuperAdmin: true };
    expect(await getAdminRole()).toBe("admin");
  });
  it("header 없음 + LMS program admin → admin", async () => {
    h.headerValue = null;
    h.lmsUser = { id: "u", isSuperAdmin: false };
    h.programAdmin = true;
    expect(await getAdminRole()).toBe("admin");
  });
  it("header 없음 + LMS user 없음 → throw", async () => {
    h.headerValue = null;
    h.lmsUser = null;
    await expect(getAdminRole()).rejects.toThrow(/missing or invalid/);
  });
  it("헤더 위조: 임의 문자열 'root' 는 무시 → LMS fallback (없으면 throw)", async () => {
    // 위조된 값은 'admin'|'viewer' 화이트리스트에 안 맞아 header 경로 미통과.
    h.headerValue = "root";
    h.lmsUser = null;
    await expect(getAdminRole()).rejects.toThrow(/missing or invalid/);
  });
  it("헤더 위조 'root' + LMS 자격 없음 → 절대 admin 안 됨", async () => {
    h.headerValue = "root";
    h.lmsUser = { id: "u", isSuperAdmin: false };
    h.programAdmin = false;
    await expect(getAdminRole()).rejects.toThrow(/missing or invalid/);
  });
});

// =========================================================================
// assertAdmin — mutation 가드.
// =========================================================================
describe("assertAdmin", () => {
  it("header admin → 통과", async () => {
    h.headerValue = "admin";
    await expect(assertAdmin()).resolves.toBeUndefined();
  });
  it("header viewer → throw (mutate 차단)", async () => {
    h.headerValue = "viewer";
    await expect(assertAdmin()).rejects.toThrow(/viewer role cannot mutate/);
  });
  it("header 없음 + LMS super_admin → 통과", async () => {
    h.lmsUser = { id: "u", isSuperAdmin: true };
    await expect(assertAdmin()).resolves.toBeUndefined();
  });
  it("header 없음 + LMS program admin → 통과", async () => {
    h.lmsUser = { id: "u", isSuperAdmin: false };
    h.programAdmin = true;
    await expect(assertAdmin()).resolves.toBeUndefined();
  });
  it("header 없음 + LMS 자격 없음 → throw", async () => {
    h.lmsUser = null;
    await expect(assertAdmin()).rejects.toThrow(/not admin/);
  });
  it("헤더 위조 'admin ' (trailing space) → 화이트리스트 불일치 → LMS fallback throw", async () => {
    h.headerValue = "admin ";
    h.lmsUser = null;
    await expect(assertAdmin()).rejects.toThrow(/not admin/);
  });
  it("헤더 위조 'viewer' 지만 LMS super_admin 이면? → viewer 우선 차단 (현 동작 녹화)", async () => {
    // 현 동작: raw === 'viewer' 이면 즉시 throw. LMS fallback 도달 안 함.
    h.headerValue = "viewer";
    h.lmsUser = { id: "u", isSuperAdmin: true };
    await expect(assertAdmin()).rejects.toThrow(/viewer role cannot mutate/);
  });
});
