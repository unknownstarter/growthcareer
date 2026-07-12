#!/usr/bin/env node
/**
 * Strip all <p class="sub-lede">...</p> blocks from the workbook.
 * Preserves everything else.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const FILE = path.resolve("/Users/noah/growthcareer/tools/preshow-training-workbook.html");
const src = await readFile(FILE, "utf8");

// Multi-line match: <p class="sub-lede">...</p> including surrounding whitespace/indent.
const re = /^\s*<p class="sub-lede">[\s\S]*?<\/p>\s*\n/gm;
const before = src.match(re)?.length ?? 0;
const out = src.replace(re, "");
await writeFile(FILE, out);
console.log(`removed ${before} <p class="sub-lede"> blocks`);
