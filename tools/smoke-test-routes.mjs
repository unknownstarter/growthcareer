#!/usr/bin/env node
/**
 * Smoke test — production 라우트 200/302/404 검증.
 *
 * 노아 격노 lesson (2026-06-28): "테스트 코드 쓰면서 너가 테스트해서 품질 검증하고
 * 프로덕션에 내보내자고 해야지!". typecheck/build PASS = 충분 조건 아님.
 * 실제 HTTP 응답 코드로 라우트 살아있는지 검증 의무.
 *
 * 사용: node tools/smoke-test-routes.mjs [--prod | --local]
 *   --prod (default) → https://growthcareer.xyz
 *   --local          → http://localhost:3000
 *
 * 통과 조건:
 *   - 200 (페이지 로드 성공)
 *   - 302 (auth redirect — 비인증 사용자 차단 정상)
 * 실패 조건:
 *   - 404 / 500 / 5xx 모두 fail
 *
 * deploy 전 의무 (CLAUDE.md §7.4 5종 체크에 추가).
 */

const ARG = process.argv[2];
const BASE =
  ARG === "--local" ? "http://localhost:3000" : "https://growthcareer.xyz";

// 라우트 + 기대 코드 (200 또는 302). 404/500 = fail.
const ROUTES = [
  // 마케팅
  { path: "/ko", expect: [200] },
  { path: "/ko/fan-to-pro", expect: [200] },
  { path: "/en/fan-to-pro", expect: [200] },
  { path: "/ko/privacy", expect: [200] },
  { path: "/ko/terms", expect: [200] },

  // Auth
  { path: "/ko/auth/login", expect: [200] },
  { path: "/ko/auth/forgot-password", expect: [200] },
  { path: "/ko/auth/reset-password", expect: [200, 302] },
  { path: "/ko/auth/change-password", expect: [200, 302] }, // 미로그인이면 redirect

  // LMS admin (비로그인 → 302 redirect 정상)
  { path: "/ko/fan-to-pro/admin/dashboard", expect: [302] },
  { path: "/ko/fan-to-pro/admin/cohorts", expect: [302] },
  { path: "/ko/fan-to-pro/admin/students", expect: [302] },
  { path: "/ko/fan-to-pro/admin/instructors", expect: [302] },
  { path: "/ko/fan-to-pro/admin/talent-pool", expect: [302] },
  { path: "/ko/fan-to-pro/admin/finance", expect: [302] },
  { path: "/ko/fan-to-pro/admin/materials", expect: [302] }, // active cohort redirect
  { path: "/ko/fan-to-pro/admin/attendance", expect: [302] },
  { path: "/ko/fan-to-pro/admin/announcements", expect: [302] },
  { path: "/ko/fan-to-pro/admin/companies", expect: [302] },
  { path: "/ko/fan-to-pro/admin/consultations", expect: [302] },

  // 학생 surface (비로그인 → 302)
  { path: "/ko/fan-to-pro/b628b909/student/profile", expect: [302] },
  { path: "/ko/fan-to-pro/b628b909/student/materials", expect: [302] },
  { path: "/ko/fan-to-pro/b628b909/student/career", expect: [302] },

  // Basic Auth admin (옛 모집 어드민)
  { path: "/admin/applicants", expect: [200, 401, 302] }, // Basic Auth 또는 redirect
  { path: "/admin/cohorts", expect: [200, 401, 302] },
  { path: "/admin/finance", expect: [200, 401, 302] },
];

const PASS = "\x1b[32m✓\x1b[0m";
const FAIL = "\x1b[31m✗\x1b[0m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

console.log(`\nSmoke test → ${BASE}\n`);

let pass = 0;
let fail = 0;
const failures = [];

for (const r of ROUTES) {
  const url = `${BASE}${r.path}`;
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "manual" });
    const ok = r.expect.includes(res.status);
    if (ok) {
      console.log(`${PASS} ${res.status} ${r.path}`);
      pass++;
    } else {
      console.log(
        `${FAIL} ${res.status} ${r.path} ${DIM}(expected ${r.expect.join("/")})${RESET}`,
      );
      fail++;
      failures.push({ path: r.path, status: res.status, expect: r.expect });
    }
  } catch (e) {
    console.log(`${FAIL} ERR ${r.path} ${DIM}${e.message}${RESET}`);
    fail++;
    failures.push({ path: r.path, error: e.message });
  }
}

console.log(
  `\n${pass + fail} routes / ${PASS} ${pass} pass / ${FAIL} ${fail} fail\n`,
);

if (fail > 0) {
  console.log("Failed:");
  for (const f of failures) console.log(" ", f);
  console.log();
  process.exit(1);
}

console.log("✓ All routes healthy.\n");
