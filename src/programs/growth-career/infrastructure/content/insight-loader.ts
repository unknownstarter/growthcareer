/**
 * InsightLoader — content/insights/*.mdx frontmatter + body 로더.
 *
 * Slice C. Luna.
 *
 * story-loader.ts 를 미러링하되 두 가지 차이:
 *   1) frontmatter 에 `sources` 객체 배열 (label + url) 이 있어 YAML block-list 파싱 지원.
 *   2) 리스트 카드는 frontmatter 만 쓰지만 상세는 markdown body 도 필요 → body 분리 반환.
 *
 * 설계 원칙 (story-loader 와 동일):
 *   - Zero-dep. gray-matter 미설치 → 인라인 frontmatter parser.
 *   - build/request time 양쪽 동작 (Server Component 안 fs.readdirSync).
 *   - 스키마 통과 못한 파일은 조용히 skip (frontmatter 오타로 전체 500 방지).
 *   - locale 필터: parse 후 locale 필드 매칭. 파일명 prefix 신뢰 X.
 *   - fs 접근은 이 파일에서만. slug 는 slug 필드 매칭만 허용 (path traversal 회피).
 *
 * 파일 규약:
 *   - content/insights/{slug}.mdx
 *   - frontmatter 는 첫 `---` block. 이후 본문은 markdown.
 */
import fs from "node:fs";
import path from "node:path";

import {
  InsightFrontmatterSchema,
  type InsightFrontmatter,
} from "@/src/programs/growth-career/domain/content/insight-frontmatter";

const CONTENT_DIR = path.join(process.cwd(), "content", "insights");

export type LoadedInsight = {
  frontmatter: InsightFrontmatter;
  /** frontmatter block 을 제거한 markdown 본문 (trim 됨). */
  body: string;
};

/**
 * frontmatter block 과 body 분리.
 * 첫 `---\n ... \n---` 를 frontmatter 로, 나머지를 body 로.
 */
function splitFrontmatter(content: string): {
  yaml: string;
  body: string;
} {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { yaml: "", body: content.trim() };
  return { yaml: match[1], body: (match[2] ?? "").trim() };
}

/**
 * frontmatter YAML parser.
 *
 * 지원:
 *   - key: value             문자열
 *   - key: "value"           따옴표 제거
 *   - key: true/false/null   boolean/null
 *   - key:                   그 아래 들여쓴 `- label: ..` block-list (sources 전용)
 *     - label: "..."
 *       url: "..."
 *
 * 미지원: 깊은 중첩, multi-line scalar. (필요 시 gray-matter 로 교체.)
 */
function parseFrontmatter(yaml: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = yaml.split(/\r?\n/);

  let i = 0;
  while (i < lines.length) {
    const rawLine = lines[i];
    const line = rawLine.replace(/^\s+/, "");

    // 빈 줄 / 주석 skip
    if (line.length === 0 || line.startsWith("#")) {
      i += 1;
      continue;
    }

    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) {
      i += 1;
      continue;
    }

    const key = line.slice(0, colonIdx).trim();
    const rawValue = line.slice(colonIdx + 1).trim();

    // block-list (값 없고 다음 줄들이 `-` 로 시작) — sources 용
    if (rawValue.length === 0 && startsBlockList(lines, i + 1)) {
      const { items, next } = parseObjectList(lines, i + 1);
      result[key] = items;
      i = next;
      continue;
    }

    result[key] = parseScalar(rawValue);
    i += 1;
  }

  return result;
}

/** 다음 non-empty 줄이 들여쓴 `-` 인가. */
function startsBlockList(lines: string[], start: number): boolean {
  for (let i = start; i < lines.length; i += 1) {
    const l = lines[i];
    if (l.trim().length === 0) continue;
    return /^\s+-\s/.test(l);
  }
  return false;
}

/**
 * `- label: ..` / `  url: ..` 형태의 객체 리스트 파싱.
 * 새 항목은 `-` 로 시작. `-` 없는 들여쓴 줄은 직전 항목의 추가 필드.
 * 들여쓰기가 사라지는(= 다음 top-level key) 줄에서 종료.
 */
function parseObjectList(
  lines: string[],
  start: number,
): { items: Record<string, unknown>[]; next: number } {
  const items: Record<string, unknown>[] = [];
  let current: Record<string, unknown> | null = null;
  let i = start;

  for (; i < lines.length; i += 1) {
    const raw = lines[i];
    if (raw.trim().length === 0) continue;

    // 들여쓰기 없는 줄 = 다음 top-level key → block-list 종료
    if (!/^\s/.test(raw)) break;

    const trimmed = raw.trim();

    if (trimmed.startsWith("-")) {
      current = {};
      items.push(current);
      const rest = trimmed.slice(1).trim();
      if (rest.length > 0) assignKv(current, rest);
    } else if (current) {
      assignKv(current, trimmed);
    }
  }

  return { items, next: i };
}

function assignKv(target: Record<string, unknown>, kv: string): void {
  const colonIdx = kv.indexOf(":");
  if (colonIdx === -1) return;
  const key = kv.slice(0, colonIdx).trim();
  const value = kv.slice(colonIdx + 1).trim();
  if (key.length === 0) return;
  target[key] = stripQuotes(value);
}

function parseScalar(raw: string): unknown {
  if (raw.length === 0) return "";
  if (raw === "null" || raw === "~") return null;
  if (raw === "true") return true;
  if (raw === "false") return false;
  return stripQuotes(raw);
}

function stripQuotes(s: string): string {
  if (s.length < 2) return s;
  const first = s[0];
  const last = s[s.length - 1];
  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    return s.slice(1, -1);
  }
  return s;
}

/** 전체 insight 목록 — locale 필터 + updatedAt DESC 정렬. body 미포함. */
export function getAllInsights({
  locale,
}: {
  locale: "ko" | "en";
}): InsightFrontmatter[] {
  return loadAll(locale)
    .map((x) => x.frontmatter)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** slug 로 단일 insight (frontmatter + body) 조회 — 없으면 null. */
export function getInsightBySlug({
  locale,
  slug,
}: {
  locale: "ko" | "en";
  slug: string;
}): LoadedInsight | null {
  return loadAll(locale).find((x) => x.frontmatter.slug === slug) ?? null;
}

/** generateStaticParams 용 — 전체 locale 의 slug 목록. */
export function getAllInsightSlugs(): { locale: "ko" | "en"; slug: string }[] {
  const out: { locale: "ko" | "en"; slug: string }[] = [];
  for (const locale of ["ko", "en"] as const) {
    for (const x of loadAll(locale)) {
      out.push({ locale, slug: x.frontmatter.slug });
    }
  }
  return out;
}

function loadAll(locale: "ko" | "en"): LoadedInsight[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];

  let files: string[];
  try {
    files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".mdx"));
  } catch {
    return [];
  }

  const out: LoadedInsight[] = [];
  for (const file of files) {
    const filePath = path.join(CONTENT_DIR, file);
    let content: string;
    try {
      content = fs.readFileSync(filePath, "utf-8");
    } catch {
      continue;
    }

    const { yaml, body } = splitFrontmatter(content);
    const raw = parseFrontmatter(yaml);
    const parsed = InsightFrontmatterSchema.safeParse(raw);
    if (!parsed.success) continue;
    if (parsed.data.locale !== locale) continue;
    out.push({ frontmatter: parsed.data, body });
  }

  return out;
}
