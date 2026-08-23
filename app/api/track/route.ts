/**
 * 분석 이벤트 수신 → analytics_events insert.
 *
 * 클라이언트(track.ts) 가 sendBeacon 으로 POST. 응답은 항상 204 (빠르게 종료,
 * 클라 non-blocking). service_role 로 insert (RLS 우회).
 *
 * 보안 (공개·비인증 엔드포인트):
 *  - event_name 은 허용 패턴만 통과 (임의 문자열 적재 차단).
 *  - 필드 길이 상한 + payload 크기 상한 → 악용/스토리지 폭주 방어.
 *  - PII 저장 안 함 (익명 session_id + UTM + path + UA 만).
 *  - 실패해도 4xx/5xx 로 클라 UX 를 막지 않게 항상 204 반환(로그만 남김).
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/src/shared/supabase/server";
import { APP_ERROR, logAppError } from "@/src/shared/errors/codes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY = 4 * 1024; // 4KB
const NAME_RE =
  /^(view_[a-z0-9_]+|scroll_[a-z0-9_]+|click_[a-z0-9_]+_in_[a-z0-9_]+|start_apply|completed_apply)$/;

// 허용 Origin — 우리 도메인/프리뷰/로컬만. 스크립트성 스팸(브라우저 밖) 1차 차단.
// (Vercel WAF rate-limit 은 후속 백로그. 지금 규모에선 Origin+meta cap 이 최소 방어선.)
const ORIGIN_SUFFIX = ["growthcareer.xyz", "vercel.app", "localhost"];

const s = (v: unknown, max: number): string | null =>
  typeof v === "string" && v.length > 0 ? v.slice(0, max) : null;

/**
 * Origin 검증. sendBeacon/fetch 는 POST 에 Origin 헤더를 붙인다.
 * - Origin 이 있고 허용목록 밖 → 차단(true 아님).
 * - Origin 이 아예 없으면 통과(일부 인앱웹뷰 누락 대비, fail-open).
 */
function originAllowed(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    const host = new URL(origin).hostname;
    return ORIGIN_SUFFIX.some((suf) => host === suf || host.endsWith(`.${suf}`) || host === suf);
  } catch {
    return false;
  }
}

/**
 * meta jsonb 정규화 — 서버는 클라를 신뢰 안 함(공개 엔드포인트).
 * top-level 키 최대 20개, 값은 string(≤200)/number/boolean 만. 중첩 객체/배열 drop.
 */
function normalizeMeta(raw: unknown): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  let n = 0;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (n >= 20) break;
    if (typeof k !== "string" || k.length > 60) continue;
    if (typeof v === "string") out[k] = v.slice(0, 200);
    else if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
    else if (typeof v === "boolean") out[k] = v;
    else continue; // 중첩 객체/배열/null 등 drop
    n++;
  }
  return out;
}

export async function POST(req: NextRequest) {
  const noContent = () => new NextResponse(null, { status: 204 });
  try {
    if (!originAllowed(req)) return noContent(); // 외부 Origin 스팸 drop

    const raw = await req.text();
    if (!raw || raw.length > MAX_BODY) return noContent();

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(raw);
    } catch {
      return noContent();
    }

    const eventName = s(body.event_name, 80);
    if (!eventName || !NAME_RE.test(eventName)) return noContent();

    const depthRaw = body.scroll_depth;
    const scroll_depth =
      typeof depthRaw === "number" && depthRaw >= 0 && depthRaw <= 100
        ? Math.round(depthRaw)
        : null;

    const meta = normalizeMeta(body.meta);

    // referrer 는 origin 만 저장 — 외부 사이트의 민감 전체 URL(검색어·게시글 경로) 유입 차단.
    let referrer: string | null = null;
    if (typeof body.referrer === "string" && body.referrer) {
      try {
        referrer = new URL(body.referrer).origin.slice(0, 300);
      } catch {
        referrer = null;
      }
    }

    const row = {
      event_name: eventName,
      screen: s(body.screen, 60),
      object: s(body.object, 80),
      session_id: s(body.session_id, 64),
      path: s(body.path, 200),
      referrer,
      utm_source: s(body.utm_source, 120),
      utm_medium: s(body.utm_medium, 120),
      utm_campaign: s(body.utm_campaign, 120),
      utm_content: s(body.utm_content, 120),
      scroll_depth,
      user_agent: s(req.headers.get("user-agent"), 400),
      meta,
    };

    const supabase = getSupabaseServer();
    if (!supabase) return noContent(); // 로컬 모의 모드 — 조용히 넘어감

    const { error } = await supabase.from("analytics_events").insert(row);
    if (error) logAppError(APP_ERROR.UNKNOWN, `track insert: ${error.message}`);

    return noContent();
  } catch (e) {
    logAppError(APP_ERROR.UNKNOWN, `track route: ${e instanceof Error ? e.message : e}`);
    return noContent();
  }
}
