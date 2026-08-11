import type { InsightSource } from "@/src/programs/growth-career/domain/content/insight-frontmatter";

/**
 * ArticleFooter — insight 상세 하단의 출처 링크 블록 + 날짜 디스클레이머.
 *
 * Slice C. Luna.
 *
 * 두 요소 모두 아티클 룰상 필수:
 *   - 출처: 공식 1차 출처 링크 (새 탭). 신뢰의 근거.
 *   - 디스클레이머: "본 정보는 YYYY-MM 기준입니다. 최신 내용은 공식 출처에서 확인하세요."
 *     정책/일정 변경 잦은 도메인이라 시점 명시 필수.
 *
 * updatedAt 은 "2026-08" 형태. 화면 표기는 "2026년 8월" 로 변환.
 */
export function ArticleFooter({
  sources,
  updatedAt,
  locale = "ko",
}: {
  sources: InsightSource[];
  updatedAt: string;
  locale?: "ko" | "en";
}) {
  return (
    <footer className="mt-16 border-[#EDEFF2] border-t pt-10">
      {sources.length > 0 ? (
        <div>
          <p
            className="mb-4 font-bold text-[#8B95A1] text-[13px] uppercase"
            style={{ letterSpacing: "0.25em" }}
          >
            {locale === "en" ? "Sources" : "출처"}
          </p>
          <ul className="flex flex-col gap-2.5">
            {sources.map((s) => (
              <li key={s.url}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-baseline gap-2 text-[15px] text-[#4E5968] transition-colors duration-150 hover:text-brand-pink"
                >
                  <span className="underline decoration-[#DDE1E6] decoration-1 underline-offset-4 transition-colors duration-150 group-hover:decoration-brand-pink">
                    {s.label}
                  </span>
                  <span
                    aria-hidden
                    className="text-[#B0B8C1] transition-transform duration-150 group-hover:translate-x-0.5"
                  >
                    ↗
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mt-8 rounded-xl bg-[#F7F8FA] px-5 py-4 text-[#8B95A1] text-sm leading-relaxed">
        {locale === "en"
          ? `This information is current as of ${formatUpdatedAtEn(updatedAt)}. Always verify the latest details on the official sources.`
          : `본 정보는 ${formatUpdatedAt(updatedAt)} 기준입니다. 최신 내용은 공식 출처에서 확인하세요.`}
      </p>
    </footer>
  );
}

/** "2026-08" → "2026년 8월". 파싱 실패 시 원본 그대로. */
function formatUpdatedAt(raw: string): string {
  const match = raw.match(/^(\d{4})-(\d{1,2})$/);
  if (!match) return raw;
  const year = match[1];
  const month = Number.parseInt(match[2], 10);
  return `${year}년 ${month}월`;
}

/** "2026-08" → "August 2026". 파싱 실패 시 원본 그대로. */
function formatUpdatedAtEn(raw: string): string {
  const match = raw.match(/^(\d{4})-(\d{1,2})$/);
  if (!match) return raw;
  const year = match[1];
  const monthIdx = Number.parseInt(match[2], 10) - 1;
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const month = months[monthIdx] ?? raw;
  return `${month} ${year}`;
}
