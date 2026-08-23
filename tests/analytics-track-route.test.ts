/**
 * /api/track 라우트 핸들러 단위 테스트.
 * - 허용된 event_name 만 insert, 나머지는 차단
 * - 필드 길이/페이로드 크기 상한
 * - 잘못된 입력에도 항상 204 (클라 UX 안 막음) + throw 안 함
 * - insert 되는 row 매핑 정확성 (PII 없음)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// getSupabaseServer 모킹 — insert 호출 캡처
const inserted: unknown[] = [];
const insertMock = vi.fn((row: unknown) => {
  inserted.push(row);
  return Promise.resolve({ error: null });
});
vi.mock("@/src/shared/supabase/server", () => ({
  getSupabaseServer: () => ({ from: () => ({ insert: insertMock }) }),
}));

import { POST } from "@/app/api/track/route";

function req(body: unknown, opts: { ua?: string; origin?: string } = {}) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "user-agent": opts.ua ?? "test-agent",
  };
  if (opts.origin) headers.origin = opts.origin;
  return new NextRequest("http://localhost/api/track", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("/api/track", () => {
  beforeEach(() => {
    inserted.length = 0;
    insertMock.mockClear();
  });

  it("허용된 view/scroll/click/start/completed 이벤트를 insert 한다", async () => {
    for (const name of [
      "view_recruit_2gi",
      "scroll_recruit_2gi",
      "click_apply_cta_hero_in_recruit_2gi",
      "start_apply",
      "completed_apply",
    ]) {
      const res = await POST(req({ event_name: name, screen: "recruit_2gi" }));
      expect(res.status).toBe(204);
    }
    expect(insertMock).toHaveBeenCalledTimes(5);
  });

  it("허용 목록에 없는 event_name 은 차단(insert 안 함)", async () => {
    for (const name of [
      "drop_table",
      "evil",
      "view_",
      "click_x", // _in_ 없음
      "'; DELETE FROM applicants; --",
      "",
    ]) {
      const res = await POST(req({ event_name: name }));
      expect(res.status).toBe(204);
    }
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("scroll_depth 는 0-100 범위만, 벗어나면 null", async () => {
    await POST(req({ event_name: "scroll_recruit_2gi", scroll_depth: 50 }));
    await POST(req({ event_name: "scroll_recruit_2gi", scroll_depth: 999 }));
    expect((inserted[0] as { scroll_depth: number }).scroll_depth).toBe(50);
    expect((inserted[1] as { scroll_depth: number | null }).scroll_depth).toBeNull();
  });

  it("긴 필드는 상한 길이로 잘린다", async () => {
    await POST(
      req({ event_name: "view_recruit_2gi", screen: "x".repeat(500) }),
    );
    expect((inserted[0] as { screen: string }).screen.length).toBeLessThanOrEqual(60);
  });

  it("4KB 초과 페이로드는 무시(insert 안 함), 204", async () => {
    const big = JSON.stringify({ event_name: "view_recruit_2gi", meta: { blob: "z".repeat(5000) } });
    const res = await POST(req(big));
    expect(res.status).toBe(204);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("깨진 JSON 도 throw 안 하고 204", async () => {
    const res = await POST(req("{not json"));
    expect(res.status).toBe(204);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("허용 Origin(growthcareer.xyz/vercel.app/localhost) 은 통과, 외부 Origin 은 drop", async () => {
    await POST(req({ event_name: "view_recruit_2gi" }, { origin: "https://growthcareer.xyz" }));
    await POST(req({ event_name: "view_recruit_2gi" }, { origin: "https://www.growthcareer.xyz" }));
    await POST(req({ event_name: "view_recruit_2gi" }, { origin: "https://foo.vercel.app" }));
    expect(insertMock).toHaveBeenCalledTimes(3);
    insertMock.mockClear();
    inserted.length = 0;
    // 외부/위조 Origin → drop
    await POST(req({ event_name: "view_recruit_2gi" }, { origin: "https://evil.com" }));
    await POST(req({ event_name: "view_recruit_2gi" }, { origin: "https://growthcareer.xyz.evil.com" }));
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("meta 는 정규화 — 중첩/과다 키 drop, 원시값만, 문자열 길이 상한", async () => {
    const meta: Record<string, unknown> = {
      ok_str: "x".repeat(500),
      ok_num: 42,
      ok_bool: true,
      nested: { a: 1 },
      arr: [1, 2, 3],
      nul: null,
    };
    for (let i = 0; i < 30; i++) meta[`k${i}`] = i;
    await POST(req({ event_name: "completed_apply", meta }));
    const stored = (inserted[0] as { meta: Record<string, unknown> }).meta;
    expect(Object.keys(stored).length).toBeLessThanOrEqual(20);
    expect(stored.nested).toBeUndefined();
    expect(stored.arr).toBeUndefined();
    expect(stored.nul).toBeUndefined();
    expect((stored.ok_str as string | undefined)?.length ?? 0).toBeLessThanOrEqual(200);
  });

  it("referrer 는 origin 만 저장(민감 전체 URL 차단)", async () => {
    await POST(
      req({ event_name: "view_recruit_2gi", referrer: "https://search.example.com/results?q=secret-term&user=me" }),
    );
    expect((inserted[0] as { referrer: string }).referrer).toBe("https://search.example.com");
  });

  it("insert row 에 이름/이메일 등 PII 컬럼이 없다", async () => {
    await POST(req({ event_name: "completed_apply", screen: "recruit_2gi", name: "홍길동", email: "a@b.com" }));
    const row = inserted[0] as Record<string, unknown>;
    expect(row).not.toHaveProperty("name");
    expect(row).not.toHaveProperty("email");
    // 자유 필드는 meta 로만 (화이트리스트 컬럼 외). name/email 은 meta 에 안 담김(라우트가 명시 컬럼만 매핑)
    expect(Object.keys(row).sort()).toEqual(
      [
        "event_name", "meta", "object", "path", "referrer", "screen",
        "scroll_depth", "session_id", "user_agent",
        "utm_campaign", "utm_content", "utm_medium", "utm_source",
      ].sort(),
    );
  });
});
