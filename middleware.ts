/**
 * Edge middleware - 네 책임을 한 번에 처리한다 (ADR 0008).
 *
 * 1) `/admin/*` - HTTP Basic Auth 게이트 (변경 X). 두 단계 role:
 *    - admin: ADMIN_BASIC_AUTH_USER / ADMIN_BASIC_AUTH_PASS. 전체 권한.
 *    - viewer: VIEWER_BASIC_AUTH_USER / VIEWER_BASIC_AUTH_PASS. 신청자
 *      명단 read-only. /admin/instructors + /admin/finance 차단. 종강
 *      (2026-07-19 24:00 KST = 2026-07-19 15:00 UTC) 이후 자동 차단.
 *    role 결과는 `x-admin-role` 헤더로 server component / server action 에 전달.
 *    응답에 noindex 헤더 박음.
 *
 * 2) `/[locale]/auth/*` - Supabase Auth 통합 로그인 (ADR 0008 §1).
 *    - login / forgot-password / reset-password / callback = public
 *    - change-password = session 필수 + must_change_password 분기
 *    이미 로그인 한 사용자가 login 직접 진입하면 role 의 dashboard 로 redirect.
 *
 * 3) `/[locale]/fan-to-pro/*` - 마케팅 + LMS 공존 (ADR 0008).
 *    - / (랜딩) / apply = public 마케팅 (변경 X)
 *    - /admin/* = super_admin 또는 program admin (program_memberships)
 *    - /<cohortSlug>/instructor/* = cohort_memberships role=instructor
 *    - /<cohortSlug>/student/* = cohort_memberships role=student
 *    위 인증 영역에서 must_change_password=true 이면 /auth/change-password 강제.
 *
 * 4) 그 외 경로 - 기존 next-intl middleware 그대로.
 *
 * 환경에 ADMIN_* 자격이 안 박혀 있으면 503 으로 잠근다.
 * Supabase 환경 변수가 없으면 인증 영역만 503 (마케팅은 정상 동작).
 */
import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/src/i18n/routing";
import { getSupabaseAuthMiddleware } from "@/src/programs/fan-to-pro/infrastructure/auth/supabase-server-auth";

const intlMiddleware = createMiddleware(routing);

const ADMIN_PREFIX = "/admin";
const ADMIN_LOGOUT_PATH = "/admin/logout";
const ADMIN_ROLE_HEADER = "x-admin-role";

// viewer(코워크) 접근 마감 시각. 이 시각 이후 viewer 자격은 401 로 차단.
// 기본값 = 2기 운영 + 정산 여유 (2026-11-01 00:00 KST = 2026-10-31 15:00 UTC).
// Vercel env `VIEWER_ACCESS_END` (ISO8601) 로 override 가능 → 코드 배포 없이
// 노아가 재개통/연장/조기마감 조절. (1기 종강 7/19 로 한 번 닫혔다가 2기 재개통.)
const VIEWER_ACCESS_END_DEFAULT = "2026-10-31T15:00:00.000Z";
const VIEWER_ACCESS_END_PARSED = Date.parse(
  process.env.VIEWER_ACCESS_END ?? VIEWER_ACCESS_END_DEFAULT,
);
// env 가 잘못된 형식이면 NaN → 비교가 항상 false 라 viewer 무제한 개방(fail-open)
// 위험. NaN 이면 안전하게 기본값으로 회귀 (fail-safe).
const VIEWER_ACCESS_END_UTC = Number.isNaN(VIEWER_ACCESS_END_PARSED)
  ? Date.parse(VIEWER_ACCESS_END_DEFAULT)
  : VIEWER_ACCESS_END_PARSED;

const ADMIN_ONLY_PREFIXES = ["/admin/instructors", "/admin/finance"];

const ADMIN_SESSION_COOKIE = "gc_admin_session";
const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const ADMIN_LOGGED_OUT_COOKIE = "gc_admin_logged_out";

type Role = "admin" | "viewer";

// -------------------------------------------------------------------------
// Basic Auth utilities (기존 /admin/* 로직 — 변경 X).
// -------------------------------------------------------------------------

function unauthorized(): NextResponse {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="growthcareer-admin", charset="UTF-8"',
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "Cache-Control": "no-store",
    },
  });
}

function logoutResponse(req: NextRequest): NextResponse {
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
    if (Date.now() > VIEWER_ACCESS_END_UTC) {
      return { kind: "challenge", response: unauthorized() };
    }
    return { kind: "ok", role: "viewer" };
  }

  return { kind: "challenge", response: unauthorized() };
}

function handleAdmin(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;

  if (pathname === ADMIN_LOGOUT_PATH) {
    return logoutResponse(req);
  }
  if (req.cookies.get(ADMIN_LOGGED_OUT_COOKIE)?.value === "1") {
    return freshChallenge();
  }

  const auth = resolveRole(req);
  if (auth.kind !== "ok") return auth.response;

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
    const res = unauthorized();
    res.cookies.set(ADMIN_SESSION_COOKIE, "", {
      path: ADMIN_PREFIX,
      maxAge: 0,
    });
    return res;
  }

  if (
    auth.role === "viewer" &&
    ADMIN_ONLY_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`),
    )
  ) {
    return forbidden();
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set(ADMIN_ROLE_HEADER, auth.role);
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  res.headers.set("Cache-Control", "no-store");
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

// -------------------------------------------------------------------------
// Supabase Auth (ADR 0008) - /[locale]/auth/* + /[locale]/fan-to-pro/(lms)/*
// -------------------------------------------------------------------------

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

type ParsedPath =
  | { kind: "marketing" }
  | { kind: "auth"; subpath: string }
  | { kind: "fan-to-pro-marketing" }
  | { kind: "fan-to-pro-admin" }
  | { kind: "fan-to-pro-cohort"; cohortSlug: string; role: "instructor" | "student" };

function parsePath(pathname: string, locale: string): ParsedPath | null {
  const localePrefix = `/${locale}`;
  if (!pathname.startsWith(localePrefix)) return null;
  const rest = pathname.slice(localePrefix.length) || "/";
  const segs = rest.split("/").filter(Boolean);

  // /[locale]/auth/*
  if (segs[0] === "auth") {
    return { kind: "auth", subpath: segs.slice(1).join("/") };
  }
  // /[locale]/fan-to-pro/*
  if (segs[0] === "fan-to-pro") {
    if (segs.length === 1) return { kind: "fan-to-pro-marketing" };
    if (segs[1] === "apply") return { kind: "fan-to-pro-marketing" };
    if (segs[1] === "admin") return { kind: "fan-to-pro-admin" };
    // /[locale]/fan-to-pro/<cohortSlug>/{instructor|student}/...
    if (segs.length >= 3) {
      const cohortSlug = segs[1];
      const surface = segs[2];
      if (surface === "instructor" || surface === "student") {
        return { kind: "fan-to-pro-cohort", cohortSlug, role: surface };
      }
    }
    return { kind: "fan-to-pro-marketing" };
  }
  return null;
}

const AUTH_PUBLIC_SUBPATHS = new Set([
  "login",
  "forgot-password",
  "reset-password",
  "callback",
]);

async function handleLms(
  req: NextRequest,
  locale: string,
  parsed: ParsedPath,
): Promise<NextResponse> {
  const { search } = req.nextUrl;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return lmsLocked();

  let res = NextResponse.next({ request: { headers: req.headers } });
  const supabase = getSupabaseAuthMiddleware(req, res);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ---- auth subpath ----
  if (parsed.kind === "auth") {
    const isPublic = AUTH_PUBLIC_SUBPATHS.has(parsed.subpath);
    // login 직접 진입 + 이미 세션 있음 → 본인 surface 로 redirect.
    if (parsed.subpath === "login" && user) {
      const next = await resolveLoggedInDestination(supabase, user.id, locale);
      return lmsNoIndex(NextResponse.redirect(new URL(next, req.url), 302));
    }
    if (isPublic) return lmsNoIndex(res);
    // change-password 는 session 필수.
    if (parsed.subpath === "change-password") {
      if (!user) {
        return lmsNoIndex(
          NextResponse.redirect(
            new URL(`/${locale}/auth/login`, req.url),
            302,
          ),
        );
      }
      return lmsNoIndex(res);
    }
    // 알 수 없는 subpath — public 처럼 통과 (404 는 page level).
    return lmsNoIndex(res);
  }

  // ---- fan-to-pro 마케팅 ----
  if (parsed.kind === "fan-to-pro-marketing") {
    // 마케팅은 변경 X — 인증 검사 안 함.
    return res;
  }

  // ---- LMS 인증 영역 (admin / cohort) ----
  if (!user) {
    const loginUrl = new URL(`/${locale}/auth/login`, req.url);
    const next = req.nextUrl.pathname + (search ?? "");
    loginUrl.searchParams.set("next", next);
    return lmsNoIndex(NextResponse.redirect(loginUrl, 302));
  }

  // must_change_password 검사 — change-password 페이지 자체 외엔 모두 redirect.
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("is_super_admin, must_change_password")
    .eq("id", user.id)
    .single();

  if (!profile) {
    // session 있는데 profile 없음 — invite 이전 상태. 로그아웃 후 login 으로.
    await supabase.auth.signOut();
    const loginUrl = new URL(`/${locale}/auth/login`, req.url);
    loginUrl.searchParams.set("error", "no_profile");
    return lmsNoIndex(NextResponse.redirect(loginUrl, 302));
  }

  if (profile.must_change_password) {
    return lmsNoIndex(
      NextResponse.redirect(
        new URL(`/${locale}/auth/change-password`, req.url),
        302,
      ),
    );
  }

  const isSuperAdmin = Boolean(profile.is_super_admin);

  // ---- fan-to-pro/admin/* ----
  if (parsed.kind === "fan-to-pro-admin") {
    if (isSuperAdmin) return lmsNoIndex(res);
    // program admin 검사.
    const { data: program } = await supabase
      .from("programs")
      .select("id")
      .eq("slug", "fan-to-pro")
      .single();
    if (!program) {
      return lmsNoIndex(
        NextResponse.redirect(
          new URL(`/${locale}/auth/login?error=no_program`, req.url),
          302,
        ),
      );
    }
    const { data: pm } = await supabase
      .from("program_memberships")
      .select("user_id")
      .eq("user_id", user.id)
      .eq("program_id", program.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!pm) {
      const fallback = await resolveLoggedInDestination(
        supabase,
        user.id,
        locale,
      );
      return lmsNoIndex(NextResponse.redirect(new URL(fallback, req.url), 302));
    }
    return lmsNoIndex(res);
  }

  // ---- fan-to-pro/<slug>/{instructor|student}/* ----
  if (parsed.kind === "fan-to-pro-cohort") {
    if (isSuperAdmin) return lmsNoIndex(res);
    // cohort 조회 + 본인 membership 검사.
    const { data: cohort } = await supabase
      .from("cohorts")
      .select("id")
      .eq("slug", parsed.cohortSlug)
      .single();
    if (!cohort) {
      return lmsNoIndex(
        NextResponse.redirect(
          new URL(`/${locale}/auth/login?error=no_cohort`, req.url),
          302,
        ),
      );
    }
    const { data: cm } = await supabase
      .from("cohort_memberships")
      .select("user_id")
      .eq("user_id", user.id)
      .eq("cohort_id", cohort.id)
      .eq("role", parsed.role)
      .maybeSingle();
    if (!cm) {
      const fallback = await resolveLoggedInDestination(
        supabase,
        user.id,
        locale,
      );
      return lmsNoIndex(NextResponse.redirect(new URL(fallback, req.url), 302));
    }
    return lmsNoIndex(res);
  }

  return lmsNoIndex(res);
}

/**
 * 로그인한 사용자의 본인 surface path 계산. middleware 안에서만 사용 (server
 * side post-login-redirect.ts 와 동일 로직 단순화 버전 — middleware 는 Edge
 * runtime 일 가능성 있어 가벼운 select 만).
 */
async function resolveLoggedInDestination(
  supabase: ReturnType<typeof getSupabaseAuthMiddleware>,
  userId: string,
  locale: string,
): Promise<string> {
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("is_super_admin")
    .eq("id", userId)
    .single();

  if (profile?.is_super_admin) {
    return `/${locale}/fan-to-pro/admin/dashboard`;
  }

  // program admin (현 fan-to-pro 만).
  const { data: program } = await supabase
    .from("programs")
    .select("id, slug")
    .eq("slug", "fan-to-pro")
    .single();
  if (program) {
    const { data: pm } = await supabase
      .from("program_memberships")
      .select("user_id")
      .eq("user_id", userId)
      .eq("program_id", program.id)
      .eq("role", "admin")
      .maybeSingle();
    if (pm) return `/${locale}/fan-to-pro/admin/dashboard`;
  }

  // cohort membership.
  const { data: memberships } = await supabase
    .from("cohort_memberships")
    .select("cohort_id, role")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (memberships && memberships.length > 0) {
    const instructor = memberships.find((m) => m.role === "instructor");
    const target = instructor ?? memberships[0];
    const { data: cohort } = await supabase
      .from("cohorts")
      .select("slug, programs(slug)")
      .eq("id", target.cohort_id)
      .single();
    if (cohort?.slug) {
      const programsObj = Array.isArray(cohort.programs)
        ? cohort.programs[0]
        : (cohort.programs as { slug?: string } | null);
      const progSlug = programsObj?.slug ?? "fan-to-pro";
      return `/${locale}/${progSlug}/${cohort.slug}/${target.role}/dashboard`;
    }
  }

  return `/${locale}/auth/login?error=no_membership`;
}

// -------------------------------------------------------------------------
// entry
// -------------------------------------------------------------------------

function detectLocale(pathname: string): string | null {
  for (const l of routing.locales) {
    if (pathname === `/${l}` || pathname.startsWith(`/${l}/`)) return l;
  }
  return null;
}

export default async function middleware(
  req: NextRequest,
): Promise<NextResponse | Response> {
  const { pathname } = req.nextUrl;

  // 1) /admin/* — Basic Auth (변경 X).
  if (pathname === ADMIN_PREFIX || pathname.startsWith(`${ADMIN_PREFIX}/`)) {
    return handleAdmin(req);
  }

  // 2) /[locale]/auth/* + /[locale]/fan-to-pro/* — Supabase Auth 분기.
  const locale = detectLocale(pathname);
  if (locale) {
    const parsed = parsePath(pathname, locale);
    if (
      parsed &&
      (parsed.kind === "auth" ||
        parsed.kind === "fan-to-pro-admin" ||
        parsed.kind === "fan-to-pro-cohort")
    ) {
      return handleLms(req, locale, parsed);
    }
    // fan-to-pro-marketing 은 next-intl 통해 자연 처리.
  }

  // 3) 그 외 — next-intl.
  return intlMiddleware(req);
}

export const config = {
  // Skip Next.js internals and static assets. /admin 도 이 matcher 안에 들어옴.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
