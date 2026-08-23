/**
 * 통합 이벤트 트래킹 — GA4(gtag) + 자체 DB(/api/track) 동시 전송.
 *
 * 설계 원칙 (노아 룰: "이걸 심어서 기존 클릭/스크롤이 안되면 안돼"):
 *  - 절대 throw 하지 않는다. 모든 전송은 try/catch 로 감싼다.
 *  - 자체 DB 전송은 navigator.sendBeacon (fire-and-forget, non-blocking).
 *    beacon 실패/미지원이면 조용히 keepalive fetch 로 폴백, 그것도 실패하면 무시.
 *  - SSR 안전: window 없으면 no-op.
 *  - 이벤트 네이밍: view_<screen> / scroll_<screen> / click_<object>_in_<screen>
 *    / start_apply / completed_apply.
 */
import { trackEvent as gtagEvent, type GtagEventParams } from "./gtag";

const SID_KEY = "gc_sid";
const TRACK_ENDPOINT = "/api/track";

/** 익명 세션 ID — localStorage 에 1회 생성. PII 아님. */
function sessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let sid = window.localStorage.getItem(SID_KEY);
    if (!sid) {
      sid =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `s_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e9).toString(36)}`;
      window.localStorage.setItem(SID_KEY, sid);
    }
    return sid;
  } catch {
    return ""; // 프라이빗 모드 등 localStorage 차단 시
  }
}

function utmFromLocation(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const p = new URLSearchParams(window.location.search);
    const out: Record<string, string> = {};
    for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content"]) {
      const v = p.get(k);
      if (v) out[k] = v.slice(0, 120);
    }
    return out;
  } catch {
    return {};
  }
}

export type TrackParams = {
  screen?: string;
  object?: string;
  scroll_depth?: number;
  [k: string]: string | number | boolean | undefined;
};

/**
 * 이벤트 1건 전송. GA4 와 자체 DB 양쪽으로. 절대 throw 안 함.
 */
export function track(eventName: string, params: TrackParams = {}): void {
  if (typeof window === "undefined") return;

  // 1) GA4 (gtag) — 이미 SSR/미로드 가드됨. 숫자/문자/불리언만.
  try {
    const gp: GtagEventParams = {};
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) gp[k] = v as string | number | boolean;
    }
    gtagEvent({ event_name: eventName, parameters: gp });
  } catch {
    /* GA 실패는 무시 */
  }

  // 2) 자체 DB — sendBeacon (non-blocking). 실패해도 페이지에 영향 0.
  try {
    const payload = JSON.stringify({
      event_name: eventName,
      screen: params.screen,
      object: params.object,
      scroll_depth: params.scroll_depth,
      session_id: sessionId(),
      path: window.location?.pathname,
      referrer: document.referrer || undefined,
      ...utmFromLocation(),
      meta: sanitizeMeta(params),
    });

    let sent = false;
    if ("sendBeacon" in navigator) {
      const blob = new Blob([payload], { type: "application/json" });
      sent = navigator.sendBeacon(TRACK_ENDPOINT, blob);
    }
    if (!sent && typeof fetch === "function") {
      // 폴백 — keepalive 로 언로드 중에도 전송 시도. 결과는 신경쓰지 않음.
      void fetch(TRACK_ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    /* 자체 DB 전송 실패는 무시 — 페이지 동작 최우선 */
  }
}

/** 예약 키(스키마 컬럼)를 제외한 나머지만 meta jsonb 로. */
function sanitizeMeta(params: TrackParams): Record<string, unknown> {
  const reserved = new Set([
    "screen",
    "object",
    "scroll_depth",
    "session_id",
    "path",
    "referrer",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
  ]);
  const meta: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params)) {
    if (!reserved.has(k) && v !== undefined) meta[k] = v;
  }
  return meta;
}
