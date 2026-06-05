/**
 * Edge middleware - 두 책임을 한 번에 처리한다.
 *
 * 1) `/admin/*` - HTTP Basic Auth 게이트.
 *    - 자격: ADMIN_BASIC_AUTH_USER / ADMIN_BASIC_AUTH_PASS (Vercel env).
 *    - 실패 시 401 + WWW-Authenticate.
 *    - 응답에 noindex 헤더 박음. robots.ts 의 disallow 와 이중 방어.
 *    - next-intl middleware 는 거치지 않는다 (locale prefix 없는 단일 경로).
 *
 * 2) 그 외 경로 - 기존 next-intl middleware 그대로.
 *
 * 환경에 자격이 안 박혀 있으면 (`ADMIN_BASIC_AUTH_PASS` 없음) 503 으로 잠근다.
 * 평문 비밀번호 fallback 절대 금지.
 */
import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/src/i18n/routing";

const intlMiddleware = createMiddleware(routing);

const ADMIN_PREFIX = "/admin";

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

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function checkBasicAuth(req: NextRequest): NextResponse | null {
  const user = process.env.ADMIN_BASIC_AUTH_USER;
  const pass = process.env.ADMIN_BASIC_AUTH_PASS;

  // 자격이 환경에 없으면 즉시 차단. 빈 문자열 fallback 도 금지.
  if (!user || !pass) {
    return locked();
  }

  const header = req.headers.get("authorization") ?? "";
  if (!header.toLowerCase().startsWith("basic ")) {
    return unauthorized();
  }

  let decoded: string;
  try {
    decoded = atob(header.slice("basic ".length).trim());
  } catch {
    return unauthorized();
  }

  const sep = decoded.indexOf(":");
  if (sep === -1) return unauthorized();

  const suppliedUser = decoded.slice(0, sep);
  const suppliedPass = decoded.slice(sep + 1);

  if (
    !timingSafeEqual(suppliedUser, user) ||
    !timingSafeEqual(suppliedPass, pass)
  ) {
    return unauthorized();
  }

  return null;
}

export default function middleware(req: NextRequest): NextResponse | Response {
  const { pathname } = req.nextUrl;

  if (pathname === ADMIN_PREFIX || pathname.startsWith(`${ADMIN_PREFIX}/`)) {
    const blocked = checkBasicAuth(req);
    if (blocked) return blocked;
    const res = NextResponse.next();
    // 인증 통과한 경우에도 색인 차단 + 캐시 금지.
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
