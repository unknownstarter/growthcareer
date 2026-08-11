/**
 * InsightJsonLd — 인사이트 상세용 JSON-LD (schema.org Article).
 *
 * Slice H-seo. Luna.
 *
 * GEO(생성형 엔진 최적화) 핵심 신호. 답변 엔진(Perplexity/ChatGPT/Gemini 등)이
 * 아티클을 구조화된 사실로 인용할 수 있도록 Article 스키마를 제공한다.
 * Fan to Pro 랜딩의 structured-data.tsx <Script> 패턴을 미러링.
 *
 * 데이터 소스: insight frontmatter (title/summary/thumbnail/updatedAt/sources/category).
 * 사용자 입력이 아닌 우리가 관리하는 MDX frontmatter 라 JSON.stringify + dangerouslySetInnerHTML
 * 은 JSON-LD 표준 패턴으로 안전.
 *
 * author/publisher = Growth Career(운영 법인 Dropdown). citation = 공식 1차 출처.
 */
import type { InsightFrontmatter } from "@/src/programs/growth-career/domain/content/insight-frontmatter";

const SITE_URL = "https://growthcareer.xyz";
const LOGO_URL = `${SITE_URL}/icon.png`;

/**
 * frontmatter.updatedAt("2026-08" 형태 YYYY-MM) 를 ISO date 로 정규화.
 * 일(day) 정보가 없으므로 해당 월 1일로 고정. 이미 YYYY-MM-DD 면 그대로 사용.
 */
function toIsoDate(updatedAt: string): string {
  if (/^\d{4}-\d{2}$/.test(updatedAt)) return `${updatedAt}-01`;
  return updatedAt;
}

function absolute(pathOrUrl: string): string {
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  return `${SITE_URL}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

export function InsightJsonLd({
  frontmatter,
  articleUrl,
}: {
  /** 해당 아티클 frontmatter. */
  frontmatter: InsightFrontmatter;
  /** 정규화된 아티클 절대 URL (canonical 과 동일). */
  articleUrl: string;
}) {
  const isoDate = toIsoDate(frontmatter.updatedAt);
  const inLanguage = frontmatter.locale === "ko" ? "ko-KR" : "en-US";

  const publisher = {
    "@type": "Organization",
    name: "Growth Career",
    alternateName: "Dropdown Co., Ltd.",
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: LOGO_URL,
    },
  };

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: frontmatter.title,
    description: frontmatter.summary,
    inLanguage,
    datePublished: isoDate,
    dateModified: isoDate,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": articleUrl,
    },
    url: articleUrl,
    author: publisher,
    publisher,
    about: frontmatter.category,
    isAccessibleForFree: true,
  };

  if (frontmatter.thumbnail) {
    data.image = absolute(frontmatter.thumbnail);
  }

  // citation: 공식 1차 출처 인용. GEO 신뢰 신호의 핵심.
  if (frontmatter.sources.length > 0) {
    data.citation = frontmatter.sources.map((s) => ({
      "@type": "CreativeWork",
      name: s.label,
      url: s.url,
    }));
  }

  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD requires raw script body
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
