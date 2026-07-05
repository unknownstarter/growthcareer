/**
 * StoryLoader — content/stories/*.mdx frontmatter 로더.
 *
 * B0083 Phase 1 Slice 2b. Iris.
 *
 * 설계 원칙:
 *   - Zero-dep. gray-matter 미설치 → 인라인 YAML frontmatter parser.
 *   - build/request time 양쪽 동작 (Next.js Server Component 안 fs.readdirSync).
 *   - 도메인 스키마 (`StoryFrontmatterSchema`) 를 통과하지 못한 파일은 조용히 skip.
 *     (frontmatter 오타로 인한 전체 페이지 500 방지.)
 *   - locale 필터: parse 후 locale 필드 매칭. 파일명 prefix 를 신뢰하지 않는다.
 *
 * 경계 (Iris):
 *   - fs 접근은 이 파일에서만. use case 는 이 함수만 호출.
 *   - 파일 경로 정규화는 path.join 으로. 사용자 입력 slug 는 slug 필드 매칭만
 *     허용 (path traversal 회피).
 *
 * 파일 규약:
 *   - content/stories/{locale}-{slug}.mdx (권장) 또는 {slug}.mdx
 *   - frontmatter 는 반드시 `---` 로 감싸고 첫 블록에 배치.
 */
import fs from "node:fs";
import path from "node:path";

import {
  StoryFrontmatterSchema,
  type StoryFrontmatter,
} from "@/src/programs/growth-career/domain/content/story-frontmatter";

const CONTENT_DIR = path.join(process.cwd(), "content", "stories");

/**
 * 간단한 YAML frontmatter parser (`---` block).
 *
 * 지원 문법:
 *   - key: value             → 문자열
 *   - key: "value"           → 문자열 (따옴표 제거)
 *   - key: [a, b, c]         → 배열 (요소별 따옴표 제거)
 *   - key: true / false      → boolean
 *   - key: null              → null
 *   - key:                   → 빈 문자열 (empty value)
 *
 * 미지원: 중첩 객체, multi-line 문자열, YAML anchor.
 * (필요 시 gray-matter 로 교체.)
 */
function parseFrontmatter(content: string): Record<string, unknown> {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const yaml = match[1];
  const result: Record<string, unknown> = {};

  for (const rawLine of yaml.split(/\r?\n/)) {
    // 주석 skip
    const line = rawLine.replace(/^\s+/, "");
    if (line.length === 0 || line.startsWith("#")) continue;

    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;

    const key = line.slice(0, colonIdx).trim();
    if (key.length === 0) continue;

    const rawValue = line.slice(colonIdx + 1).trim();
    result[key] = parseValue(rawValue);
  }

  return result;
}

function parseValue(raw: string): unknown {
  if (raw.length === 0) return "";
  if (raw === "null" || raw === "~") return null;
  if (raw === "true") return true;
  if (raw === "false") return false;

  // 배열 [a, b, c]
  if (raw.startsWith("[") && raw.endsWith("]")) {
    const inner = raw.slice(1, -1).trim();
    if (inner.length === 0) return [];
    return inner
      .split(",")
      .map((s) => stripQuotes(s.trim()))
      .filter((s) => s.length > 0);
  }

  // 문자열 따옴표 제거
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

/**
 * 전체 story 목록 — locale 필터 + published_at DESC 정렬.
 *
 * 반환은 memoize 없음. Server Component 안에서 render 마다 fs 읽음 —
 * 파일 수가 적어 (예상 10개 미만) 부담 없음. 필요 시 `use cache` 로 감쌀 수 있음.
 */
export function getAllStories({
  locale,
}: {
  locale: "ko" | "en";
}): StoryFrontmatter[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];

  let files: string[];
  try {
    files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".mdx"));
  } catch {
    return [];
  }

  const stories: StoryFrontmatter[] = [];
  for (const file of files) {
    const filePath = path.join(CONTENT_DIR, file);
    let content: string;
    try {
      content = fs.readFileSync(filePath, "utf-8");
    } catch {
      continue;
    }

    const raw = parseFrontmatter(content);
    const parsed = StoryFrontmatterSchema.safeParse(raw);
    if (!parsed.success) continue;
    if (parsed.data.locale !== locale) continue;
    stories.push(parsed.data);
  }

  return stories.sort((a, b) =>
    b.published_at.localeCompare(a.published_at),
  );
}

/** slug 로 단일 story 조회 — 없으면 null. */
export function getStoryBySlug({
  locale,
  slug,
}: {
  locale: "ko" | "en";
  slug: string;
}): StoryFrontmatter | null {
  const stories = getAllStories({ locale });
  return stories.find((s) => s.slug === slug) ?? null;
}

/** featured=true 인 story 만. 우산 랜딩 프리뷰용. */
export function getFeaturedStories({
  locale,
  limit,
}: {
  locale: "ko" | "en";
  limit: number;
}): StoryFrontmatter[] {
  return getAllStories({ locale })
    .filter((s) => s.featured)
    .slice(0, limit);
}

/** 특정 cohort_showcase_slug 에 매핑된 story 목록. */
export function getStoriesByCohortShowcaseSlug({
  locale,
  cohortSlug,
}: {
  locale: "ko" | "en";
  cohortSlug: string;
}): StoryFrontmatter[] {
  return getAllStories({ locale }).filter(
    (s) => s.cohort_showcase_slug === cohortSlug,
  );
}
