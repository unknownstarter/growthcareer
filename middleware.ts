/**
 * Edge middleware - 두 책임을 한 번에 처리한다.
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
 * 2) 그 외 경로 - 기존 next-intl middleware 그대로.
 *
 * 환경에 ADMIN_* 자격이 안 박혀 있으면 503 으로 잠근다. VIEWER_* 는
 * optional — 없으면 viewer 로그인만 거절.
 * 평문 비밀번호 fallback 절대 금지.
 */
import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/src/i18n/routing";

const intlMiddleware = createMiddleware(routing);

const ADMIN_PREFIX = "/admin";
const ADMIN_ROLE_HEADER = "x-admin-role";

// 코워크 공유 viewer 가 더 이상 PII 를 볼 수 없는 시점. 종강 = 7/19 24:00 KST.
const VIEWER_ACCESS_END_UTC = Date.parse("2026-07-19T15:00:00.000Z");

// viewer 가 절대 접근 못 하는 경로 prefix.
const ADMIN_ONLY_PREFIXES = ["/admin/instructors", "/admin/finance"];

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

export default function middleware(req: NextRequest): NextResponse | Response {
  const { pathname } = req.nextUrl;

  if (pathname === ADMIN_PREFIX || pathname.startsWith(`${ADMIN_PREFIX}/`)) {
    const auth = resolveRole(req);
    if (auth.kind !== "ok") return auth.response;

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
    return res;
  }

  return intlMiddleware(req);
}

export const config = {
  // Skip Next.js internals and static assets. /admin 은 명시적으로 포함시키기 위해
  // 기존 matcher 그대로 사용 (admin 도 이 matcher 에 포함됨).
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
