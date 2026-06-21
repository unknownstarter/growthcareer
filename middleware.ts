/**
 * Edge middleware - 세 책임을 한 번에 처리한다.
 *
 * 1) `/admin/*` - HTTP Basic Auth 게이트. 두 단계 role:
 *    - admin: ADMIN_BASIC_AUTH_USER / ADMIN_BASIC_AUTH_PASS. 전체 권한.
 *    - viewer: VIEWER_BASIC_AUTH_USER / VIEWER_BASIC_AUTH_PASS. 신청자
 *      명단 read-only. /admin/instructors + /admin/finance 차단. 종강
 *      (2026-07-19 24:00 KST = 2026-07-19 15:00 UTC) 이후 자동 차단.
 *    role 결과는 `x-admin-role` 헤더로 server component / server action 에
 *    전달 (src/programs/fan-to-pro/admin/role.ts 의 getAdminRole 가 읽음).
 *    실패 시 401 + WWW-Authenticate.
 *    응답에 noindex 헤더 박음. robots.ts 의 disallow 와 이중 방어.
 *    next-intl middleware 는 거치지 않는다 (locale prefix 없는 단일 경로).
 *
 * 2) `/lms/*` - Supabase Auth (ADR 0007 §2~3). session cookie refresh +
 *    role-based redirect:
 *    - /lms/login, /lms/forgot-password, /lms/reset-password = public
 *    - /lms/admin/*  = super_admin 만 (그 외 → /lms/login)
 *    - /lms/instructor/* = instructor 만
 *    - /lms/student/* = student 만
 *    - /lms (정확히 일치) = 세션 없으면 /lms/login, 있으면 role 의 dashboard
 *    role 결정은 server component 에서 user_profiles 조회로 한 번 더 검증
 *    (middleware = URL 1차 차단, server action = mutation 2차 차단).
 *    응답에 noindex 헤더 박음. 마케팅 SEO 영향 0.
 *
 * 3) 그 외 경로 - 기존 next-intl middleware 그대로.
 *
 * 환경에 ADMIN_* 자격이 안 박혀 있으면 503 으로 잠근다. VIEWER_* 는
 * optional — 없으면 viewer 로그인만 거절.
 * Supabase 환경 변수 (NEXT_PUBLIC_SUPABASE_URL / ANON_KEY) 가 없으면 /lms/*
 * 는 503.
 * 평문 비밀번호 fallback 절대 금지.
 */
import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/src/i18n/routing";
import { getSupabaseAuthMiddleware } from "@/src/programs/fan-to-pro/infrastructure/auth/supabase-server-auth";

const intlMiddleware = createMiddleware(routing);

const ADMIN_PREFIX = "/admin";
const ADMIN_LOGOUT_PATH = "/admin/logout";
const ADMIN_ROLE_HEADER = "x-admin-role";

const LMS_PREFIX = "/lms";
const LMS_LOGIN_PATH = "/lms/login";
const LMS_PUBLIC_PATHS = new Set([
  "/lms/login",
  "/lms/forgot-password",
  "/lms/reset-password",
  "/lms/auth/callback",
]);

type LmsRoleStr = "super_admin" | "instructor" | "student";

const LMS_ROLE_DASHBOARD: Record<LmsRoleStr, string> = {
  super_admin: "/lms/admin/dashboard",
  instructor: "/lms/instructor/dashboard",
  student: "/lms/student/dashboard",
};

// 코워크 공유 viewer 가 더 이상 PII 를 볼 수 없는 시점. 종강 = 7/19 24:00 KST.
const VIEWER_ACCESS_END_UTC = Date.parse("2026-07-19T15:00:00.000Z");

// viewer 가 절대 접근 못 하는 경로 prefix.
const ADMIN_ONLY_PREFIXES = ["/admin/instructors", "/admin/finance"];

// HTTP Basic Auth 는 stateless 라 "세션 타임아웃" 을 cookie 의 timestamp 로
// 강제. 12 시간 후 자격을 통과해도 401 → 사용자가 자격 재입력해야 함. 로그
// 아웃 시에도 같은 cookie 삭제.
const ADMIN_SESSION_COOKIE = "gc_admin_session";
const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

// 로그아웃 직후 1회용 marker. middleware 가 이 cookie 를 보면 자격 헤더가
// 와도 무시하고 401 응답 + 매번 다른 realm 으로 자격 다이얼로그 강제. 그래야
// 브라우저가 캐시된 admin 자격을 자동 첨부해서 재로그인되는 현상을 회피.
// cookie 는 401 보낸 직후 삭제 → 한 번만 효과.
const ADMIN_LOGGED_OUT_COOKIE = "gc_admin_logged_out";

type Role = "admin" | "viewer";

function unauthorized(): NextResponse {
  const res = new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="growthcareer-admin", charset="UTF-8"',
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "Cache-Control": "no-store",
    },
  });
  return res;
}

function logoutResponse(req: NextRequest): NextResponse {
  // 로그아웃 = 신청자 페이지로 redirect + logged-out marker cookie 박음.
  // 다음 요청에서 middleware 가 cookie 를 보고 매번 다른 realm 으로 자격
  // 다이얼로그 강제 → 브라우저의 admin 자격 자동 첨부 우회.
  const url = new URL("/admin/applicants", req.url);
  const res = NextResponse.redirect(url, 302);
  res.cookies.set(ADMIN_LOGGED_OUT_COOKIE, "1", {
    path: ADMIN_PREFIX,
    maxAge: 60,
    httpOnly: true,
    sameSite: "lax",
    secure: true,
  });
  res.cookies.set(ADMIN_SESSION_COOKIE, "", {
    path: ADMIN_PREFIX,
    maxAge: 0,
  });
  res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  res.headers.set("Cache-Control", "no-store");
  return res;
}

function freshChallenge(): NextResponse {
  // 매번 다른 realm 으로 자격 요구. 브라우저는 같은 realm 의 캐시된 자격만
  // 자동 첨부하므로 realm 이 바뀌면 새 자격 다이얼로그를 띄운다.
  const realm = `growthcareer-admin-${Date.now().toString(36)}`;
  const res = new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${realm}", charset="UTF-8"`,
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "Cache-Control": "no-store",
    },
  });
  res.cookies.set(ADMIN_LOGGED_OUT_COOKIE, "", {
    path: ADMIN_PREFIX,
    maxAge: 0,
  });
  return res;
}

function locked(): NextResponse {
  return new NextResponse("Admin disabled (credentials missing)", {
    status: 503,
    headers: {
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "Cache-Control": "no-store",
    },
  });
}

function forbidden(): NextResponse {
  return new NextResponse("Forbidden", {
    status: 403,
    headers: {
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "Cache-Control": "no-store",
    },
  });
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

type AuthResult =
  | { kind: "ok"; role: Role }
  | { kind: "challenge"; response: NextResponse }
  | { kind: "locked"; response: NextResponse };

function resolveRole(req: NextRequest): AuthResult {
  const adminUser = process.env.ADMIN_BASIC_AUTH_USER;
  const adminPass = process.env.ADMIN_BASIC_AUTH_PASS;
  if (!adminUser || !adminPass) {
    return { kind: "locked", response: locked() };
  }

  const header = req.headers.get("authorization") ?? "";
  if (!header.toLowerCase().startsWith("basic ")) {
    return { kind: "challenge", response: unauthorized() };
  }

  let decoded: string;
  try {
    decoded = atob(header.slice("basic ".length).trim());
  } catch {
    return { kind: "challenge", response: unauthorized() };
  }

  const sep = decoded.indexOf(":");
  if (sep === -1) return { kind: "challenge", response: unauthorized() };

  const suppliedUser = decoded.slice(0, sep);
  const suppliedPass = decoded.slice(sep + 1);

  if (
    timingSafeEqual(suppliedUser, adminUser) &&
    timingSafeEqual(suppliedPass, adminPass)
  ) {
    return { kind: "ok", role: "admin" };
  }

  const viewerUser = process.env.VIEWER_BASIC_AUTH_USER;
  const viewerPass = process.env.VIEWER_BASIC_AUTH_PASS;
  if (
    viewerUser &&
    viewerPass &&
    timingSafeEqual(suppliedUser, viewerUser) &&
    timingSafeEqual(suppliedPass, viewerPass)
  ) {
    // 종강 후 viewer 자격은 즉시 폐기.
    if (Date.now() > VIEWER_ACCESS_END_UTC) {
      return { kind: "challenge", response: unauthorized() };
    }
    return { kind: "ok", role: "viewer" };
  }

  return { kind: "challenge", response: unauthorized() };
}

function lmsNoIndex(res: NextResponse): NextResponse {
  res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return res;
}

function lmsLocked(): NextResponse {
  return new NextResponse("LMS disabled (Supabase env missing)", {
    status: 503,
    headers: {
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "Cache-Control": "no-store",
    },
  });
}

async function handleLms(req: NextRequest): Promise<NextResponse> {
  const { pathname, search } = req.nextUrl;

  // Supabase 환경 변수 점검. 없으면 503 — fallback 동작 금지.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return lmsLocked();
  }

  // session refresh 용 response. handleLms 가 최종 반환할 response 의 base.
  let res = NextResponse.next({ request: { headers: req.headers } });
  const supabase = getSupabaseAuthMiddleware(req, res);

  // session refresh (만료 직전이면 자동 갱신, cookie 도 sync).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublic = LMS_PUBLIC_PATHS.has(pathname);

  // 1) public path — 로그인 안 한 사용자는 그대로 통과. 로그인 한 사용자가
  //    /lms/login 으로 직접 진입한 경우 dashboard 로 redirect (UX).
  if (isPublic) {
    if (user && pathname === LMS_LOGIN_PATH) {
      // role 결정은 별도 RPC 없이 user_profiles 직접 조회.
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      const role = (profile?.role ?? null) as LmsRoleStr | null;
      if (role) {
        const target = new URL(LMS_ROLE_DASHBOARD[role], req.url);
        return lmsNoIndex(NextResponse.redirect(target, 302));
      }
    }
    return lmsNoIndex(res);
  }

  // 2) 로그인 필요. 세션 없으면 /lms/login 으로 redirect (원래 path 는 ?next= 로 보존).
  if (!user) {
    const loginUrl = new URL(LMS_LOGIN_PATH, req.url);
    const next = pathname + (search ?? "");
    if (next && next !== LMS_LOGIN_PATH) {
      loginUrl.searchParams.set("next", next);
    }
    return lmsNoIndex(NextResponse.redirect(loginUrl, 302));
  }

  // 3) role 결정 + path matcher.
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const role = (profile?.role ?? null) as LmsRoleStr | null;

  if (!role) {
    // 로그인은 했지만 user_profiles 가 없음 — invite 이전 상태. 로그아웃 후 login 으로.
    await supabase.auth.signOut();
    const loginUrl = new URL(LMS_LOGIN_PATH, req.url);
    loginUrl.searchParams.set("error", "no_profile");
    return lmsNoIndex(NextResponse.redirect(loginUrl, 302));
  }

  // /lms (정확히 일치) → role 의 dashboard 로.
  if (pathname === LMS_PREFIX) {
    const target = new URL(LMS_ROLE_DASHBOARD[role], req.url);
    return lmsNoIndex(NextResponse.redirect(target, 302));
  }

  // role 별 path 차단.
  if (pathname.startsWith("/lms/admin") && role !== "super_admin") {
    const target = new URL(LMS_ROLE_DASHBOARD[role], req.url);
    return lmsNoIndex(NextResponse.redirect(target, 302));
  }
  if (pathname.startsWith("/lms/instructor") && role !== "instructor") {
    const target = new URL(LMS_ROLE_DASHBOARD[role], req.url);
    return lmsNoIndex(NextResponse.redirect(target, 302));
  }
  if (pathname.startsWith("/lms/student") && role !== "student") {
    const target = new URL(LMS_ROLE_DASHBOARD[role], req.url);
    return lmsNoIndex(NextResponse.redirect(target, 302));
  }

  // 통과 — session cookie 가 res 에 sync 되어 있음.
  return lmsNoIndex(res);
}

export default async function middleware(
  req: NextRequest,
): Promise<NextResponse | Response> {
  const { pathname } = req.nextUrl;

  // /lms/* 는 Supabase Auth 분기.
  if (pathname === LMS_PREFIX || pathname.startsWith(`${LMS_PREFIX}/`)) {
    return handleLms(req);
  }

  if (pathname === ADMIN_PREFIX || pathname.startsWith(`${ADMIN_PREFIX}/`)) {
    // 명시적 로그아웃 — 신청자 페이지로 redirect + logged-out cookie 박음.
    if (pathname === ADMIN_LOGOUT_PATH) {
      return logoutResponse(req);
    }

    // 직전 요청이 로그아웃이었으면 자격을 무시하고 새 realm 으로 자격 강제.
    // 브라우저의 admin 자격 자동 첨부 우회.
    if (req.cookies.get(ADMIN_LOGGED_OUT_COOKIE)?.value === "1") {
      return freshChallenge();
    }

    const auth = resolveRole(req);
    if (auth.kind !== "ok") return auth.response;

    // 12 시간 세션 타임아웃. cookie 의 timestamp 와 비교.
    const sessionCookie = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    const now = Date.now();
    let sessionExpired = false;
    let sessionStartMs: number | null = null;
    if (sessionCookie) {
      const parsed = Number(sessionCookie);
      if (!Number.isFinite(parsed) || now - parsed > ADMIN_SESSION_TTL_MS) {
        sessionExpired = true;
      } else {
        sessionStartMs = parsed;
      }
    }
    if (sessionExpired) {
      // 자격은 통과했어도 세션 만료. 자격 재입력 강제.
      const res = unauthorized();
      res.cookies.set(ADMIN_SESSION_COOKIE, "", {
        path: ADMIN_PREFIX,
        maxAge: 0,
      });
      return res;
    }

    // viewer 는 admin-only 경로 진입 차단.
    if (
      auth.role === "viewer" &&
      ADMIN_ONLY_PREFIXES.some(
        (p) => pathname === p || pathname.startsWith(`${p}/`),
      )
    ) {
      return forbidden();
    }

    // role 을 server component 에 전달. NextResponse.next({ request }) 패턴.
    // Headers.set() 은 동일 key 의 기존 값을 제거 후 set — client 가 보낸
    // 위조 x-admin-role 헤더가 있어도 여기서 안전하게 덮어쓴다.
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set(ADMIN_ROLE_HEADER, auth.role);
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    res.headers.set("Cache-Control", "no-store");
    // 첫 진입이면 세션 timestamp 새로 박음. 기존 세션은 그대로 유지 (롤링
    // 갱신 안 함 — 12 시간 hard cap).
    if (sessionStartMs === null) {
      res.cookies.set(ADMIN_SESSION_COOKIE, String(now), {
        httpOnly: true,
        sameSite: "lax",
        secure: true,
        path: ADMIN_PREFIX,
        maxAge: ADMIN_SESSION_TTL_MS / 1000,
      });
    }
    return res;
  }

  return intlMiddleware(req);
}

export const config = {
  // Skip Next.js internals and static assets. /admin 은 명시적으로 포함시키기 위해
  // 기존 matcher 그대로 사용 (admin 도 이 matcher 에 포함됨).
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
