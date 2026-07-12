#!/usr/bin/env node
/**
 * PDF/HTML 카피 부호 스캐너 (CLAUDE.md §6.5 자동화).
 *
 * 사용법:
 *   node tools/check-pdf-copy.mjs <file.html> [<file2.html> ...]
 *
 * 검사 부호:
 *   —  em dash (U+2014)
 *   –  en dash (U+2013)  ← 숫자 범위 문맥은 예외 처리
 *   ·  interpunct (U+00B7)
 *   …  ellipsis (U+2026)
 *   “”  곡선 큰따옴표 (U+201C U+201D)
 *   ‘’  곡선 작은따옴표 (U+2018 U+2019)
 *
 * 발견 시 exit 1 + 위치·문맥. PDF export 스크립트 상단에서 호출해 실패 시 export 중단.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

const BANNED = [
  { name: "em dash (—)", char: "—", regex: /—/g },
  { name: "interpunct (·)", char: "·", regex: /·/g },
  { name: "ellipsis (…)", char: "…", regex: /…/g },
  { name: "curly double open (“)", char: "“", regex: /“/g },
  { name: "curly double close (”)", char: "”", regex: /”/g },
  { name: "curly single open (‘)", char: "‘", regex: /‘/g },
  { name: "curly single close (’)", char: "’", regex: /’/g },
];

// en dash 는 숫자 범위 문맥 (예: 2시간–3시간) 만 예외 허용
const EN_DASH = { name: "en dash (–)", char: "–", regex: /–/g };

function findLine(src, index) {
  let line = 1;
  let col = 1;
  for (let i = 0; i < index; i++) {
    if (src[i] === "\n") {
      line += 1;
      col = 1;
    } else {
      col += 1;
    }
  }
  return { line, col };
}

function excerpt(src, index, radius = 30) {
  const start = Math.max(0, index - radius);
  const end = Math.min(src.length, index + radius);
  return src.slice(start, end).replace(/\s+/g, " ").trim();
}

async function scanFile(file) {
  const abs = path.resolve(file);
  const src = await readFile(abs, "utf8");
  const findings = [];

  for (const b of BANNED) {
    for (const m of src.matchAll(b.regex)) {
      const idx = m.index ?? 0;
      const { line, col } = findLine(src, idx);
      findings.push({
        file: abs,
        symbol: b.name,
        line,
        col,
        excerpt: excerpt(src, idx),
      });
    }
  }

  // en dash: 숫자 사이 예외
  for (const m of src.matchAll(EN_DASH.regex)) {
    const idx = m.index ?? 0;
    const before = src[idx - 1] ?? "";
    const after = src[idx + 1] ?? "";
    const isNumericRange = /\d/.test(before) && /\d/.test(after);
    if (isNumericRange) continue;
    const { line, col } = findLine(src, idx);
    findings.push({
      file: abs,
      symbol: EN_DASH.name,
      line,
      col,
      excerpt: excerpt(src, idx),
    });
  }

  return findings;
}

async function main() {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error("Usage: node tools/check-pdf-copy.mjs <file.html> ...");
    process.exit(2);
  }

  let total = 0;
  for (const f of files) {
    const findings = await scanFile(f);
    if (findings.length === 0) {
      console.log(`  OK  ${f} — no banned punctuation.`);
      continue;
    }
    total += findings.length;
    console.error(`\nFAIL  ${f} — ${findings.length} banned symbol(s):`);
    for (const x of findings) {
      console.error(`  L${x.line}:${x.col}  ${x.symbol}`);
      console.error(`    ...${x.excerpt}...`);
    }
  }

  if (total > 0) {
    console.error(
      `\nTotal ${total} banned symbol(s). See CLAUDE.md §6.5 for replacements.`,
    );
    process.exit(1);
  }
  console.log("\nAll files clean.");
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
