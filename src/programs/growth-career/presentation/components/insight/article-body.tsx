import type { ReactNode } from "react";

/**
 * ArticleBody — insight 상세 본문 markdown 렌더러 (경량, zero-dep).
 *
 * Slice C. Luna. Slice F 확장 (표 / 콜아웃 / 링크).
 *
 * next-mdx / remark 미설치 상황에서 insight 본문의 제한된 markdown 을 렌더.
 * dangerouslySetInnerHTML 미사용 — 텍스트 노드만 생성.
 *
 * 지원 문법 (아티클 작성 규약에 맞춤):
 *   - `## heading`  → h2
 *   - `### heading` → h3
 *   - `- item`      → 불릿 리스트 (연속 라인 그룹핑)
 *   - `> quote`     → 콜아웃 박스 (연회색 bg, 좌측 핑크 보더). 연속 라인 그룹핑.
 *   - `| a | b |`   → 표. 헤더 행 다음 `|---|---|` 구분선 필수. zebra 스트라이프.
 *   - 그 외 라인    → 문단 (연속 라인은 한 문단으로 join)
 *   - 인라인: `**bold**`, `[텍스트](http(s)://url)` (새 탭, http(s) 만 허용)
 *
 * 가독폭은 부모(article)에서 max-w 로 제어. 여기선 타이포/간격만.
 * §6.5 부호 규칙은 콘텐츠(mdx) 작성 시 준수. §6.8 그라데이션/글로우 없음.
 */
export function ArticleBody({ body }: { body: string }) {
  const blocks = parseBlocks(body);
  return (
    <div className="break-keep text-[17px] text-[#333D4B] leading-[1.85]">
      {blocks.map((block, i) => renderBlock(block, i))}
    </div>
  );
}

type Block =
  | { kind: "h2"; text: string }
  | { kind: "h3"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "callout"; lines: string[] }
  | { kind: "table"; header: string[]; rows: string[][] }
  | { kind: "p"; text: string };

/** `| a | b |` 형태 라인을 셀 배열로. 앞뒤 파이프는 제거. */
function parseTableRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map((c) => c.trim());
}

/** `|---|:--:|` 형태의 구분선인가 (셀이 대시/콜론/공백만). */
function isTableDivider(line: string): boolean {
  const t = line.trim();
  if (!t.startsWith("|")) return false;
  return parseTableRow(t).every((c) => /^:?-{1,}:?$/.test(c));
}

function isTableRow(line: string): boolean {
  return line.trim().startsWith("|") && line.includes("|", 1);
}

function parseBlocks(body: string): Block[] {
  const lines = body.split(/\r?\n/);
  const blocks: Block[] = [];

  let paraBuf: string[] = [];
  let listBuf: string[] = [];
  let quoteBuf: string[] = [];

  const flushPara = () => {
    if (paraBuf.length > 0) {
      blocks.push({ kind: "p", text: paraBuf.join(" ") });
      paraBuf = [];
    }
  };
  const flushList = () => {
    if (listBuf.length > 0) {
      blocks.push({ kind: "list", items: listBuf });
      listBuf = [];
    }
  };
  const flushQuote = () => {
    if (quoteBuf.length > 0) {
      blocks.push({ kind: "callout", lines: quoteBuf });
      quoteBuf = [];
    }
  };
  const flushAll = () => {
    flushPara();
    flushList();
    flushQuote();
  };

  let i = 0;
  while (i < lines.length) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (line.length === 0) {
      flushAll();
      i += 1;
      continue;
    }

    // 표: 헤더 행 + 다음 줄이 구분선일 때만 표로 처리
    if (isTableRow(line) && i + 1 < lines.length && isTableDivider(lines[i + 1])) {
      flushAll();
      const header = parseTableRow(line);
      const rows: string[][] = [];
      let j = i + 2;
      while (j < lines.length && isTableRow(lines[j].trim())) {
        rows.push(parseTableRow(lines[j].trim()));
        j += 1;
      }
      blocks.push({ kind: "table", header, rows });
      i = j;
      continue;
    }

    if (line.startsWith("### ")) {
      flushAll();
      blocks.push({ kind: "h3", text: line.slice(4).trim() });
      i += 1;
      continue;
    }
    if (line.startsWith("## ")) {
      flushAll();
      blocks.push({ kind: "h2", text: line.slice(3).trim() });
      i += 1;
      continue;
    }
    if (line.startsWith("> ")) {
      flushPara();
      flushList();
      quoteBuf.push(line.slice(2).trim());
      i += 1;
      continue;
    }
    if (line === ">") {
      flushPara();
      flushList();
      quoteBuf.push("");
      i += 1;
      continue;
    }
    if (line.startsWith("- ")) {
      flushPara();
      flushQuote();
      listBuf.push(line.slice(2).trim());
      i += 1;
      continue;
    }

    // 일반 문단 라인
    flushList();
    flushQuote();
    paraBuf.push(line);
    i += 1;
  }

  flushAll();
  return blocks;
}

function renderBlock(block: Block, key: number): ReactNode {
  switch (block.kind) {
    case "h2":
      return (
        <h2
          key={key}
          className="mt-14 mb-4 font-black text-[#191F28] text-[24px] leading-snug tracking-[-0.01em] sm:text-[27px]"
        >
          {inline(block.text)}
        </h2>
      );
    case "h3":
      return (
        <h3
          key={key}
          className="mt-10 mb-3 font-bold text-[#191F28] text-[19px] leading-snug sm:text-[20px]"
        >
          {inline(block.text)}
        </h3>
      );
    case "list":
      return (
        <ul key={key} className="my-5 flex flex-col gap-2.5 pl-1">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-3">
              <span
                aria-hidden
                className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-pink"
              />
              <span>{inline(item)}</span>
            </li>
          ))}
        </ul>
      );
    case "callout":
      return (
        <aside
          key={key}
          className="my-7 rounded-r-xl border-brand-pink border-l-[3px] bg-[#F7F8FA] px-5 py-4 text-[16px] text-[#4E5968] leading-[1.75]"
        >
          {block.lines.map((l, i) =>
            l.length === 0 ? (
              <span key={i} className="block h-2.5" aria-hidden />
            ) : (
              <p key={i} className={i > 0 ? "mt-2" : undefined}>
                {inline(l)}
              </p>
            ),
          )}
        </aside>
      );
    case "table":
      return (
        <div key={key} className="my-7 overflow-x-auto">
          <table className="w-full border-collapse text-[15px] sm:text-[16px]">
            <thead>
              <tr className="border-[#EDEFF2] border-b-2">
                {block.header.map((cell, i) => (
                  <th
                    key={i}
                    scope="col"
                    className="px-3.5 py-3 text-left font-bold text-[#191F28]"
                  >
                    {inline(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr
                  key={r}
                  className={`border-[#F2F4F6] border-b ${
                    r % 2 === 1 ? "bg-[#FAFBFC]" : ""
                  }`}
                >
                  {row.map((cell, c) => (
                    <td
                      key={c}
                      className="px-3.5 py-2.5 align-top text-[#4E5968]"
                    >
                      {inline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "p":
      return (
        <p key={key} className="my-5">
          {inline(block.text)}
        </p>
      );
  }
}

/**
 * 인라인 처리: `**bold**` 와 `[텍스트](url)` 링크.
 * 링크 url 은 http:// 또는 https:// 만 허용 (그 외는 원문 그대로 노출).
 * dangerouslySetInnerHTML 미사용 — 순수 텍스트 노드만.
 */
function inline(text: string): ReactNode {
  // bold 와 link 를 한 번에 토큰화. 순서 보존.
  const parts = text
    .split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g)
    .filter((p) => p.length > 0);

  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-bold text-[#191F28]">
          {part.slice(2, -2)}
        </strong>
      );
    }

    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const label = linkMatch[1];
      const url = linkMatch[2].trim();
      if (/^https?:\/\//.test(url)) {
        return (
          <a
            key={i}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-brand-pink underline decoration-brand-pink/40 decoration-1 underline-offset-2 transition-colors duration-150 hover:decoration-brand-pink"
          >
            {label}
          </a>
        );
      }
      // http(s) 아니면 링크로 취급 안 하고 원문 노출
      return <span key={i}>{part}</span>;
    }

    return <span key={i}>{part}</span>;
  });
}
