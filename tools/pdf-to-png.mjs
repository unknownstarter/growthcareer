#!/usr/bin/env node
/**
 * Render each page of the generated PDF as PNG using pdf.js in Chromium.
 */
import { chromium } from "playwright";
import { mkdir, rm, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const ROOT = "/Users/noah/growthcareer";
const PDF = path.resolve(ROOT, "docs/screenshots/onepager/preshow-training-workbook-cohort-1.pdf");
const OUT_DIR = path.resolve(ROOT, "docs/screenshots/preshow-workbook");

try {
  await rm(OUT_DIR, { recursive: true, force: true });
} catch {}
await mkdir(OUT_DIR, { recursive: true });

// Read PDF as base64 and inline it into a data URL loaded by an HTML wrapper.
const pdfBytes = await readFile(PDF);
const b64 = pdfBytes.toString("base64");

const wrapperHTML = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>PDF Preview</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs" type="module"></script>
<style>
  body { margin: 0; padding: 0; background: #333; }
  #container { display: flex; flex-direction: column; gap: 12px; padding: 12px; }
  canvas { display: block; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.3); }
</style>
</head>
<body>
<div id="container"></div>
<script type="module">
import * as pdfjsLib from "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs";
pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs";

const b64 = "${b64}";
const bin = atob(b64);
const bytes = new Uint8Array(bin.length);
for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
window.__PDF_NUM_PAGES__ = pdf.numPages;
const container = document.getElementById("container");
for (let i = 1; i <= pdf.numPages; i++) {
  const page = await pdf.getPage(i);
  const viewport = page.getViewport({ scale: 1.5 });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  canvas.id = "page-" + i;
  container.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  await page.render({ canvasContext: ctx, viewport }).promise;
}
window.__PDF_RENDERED__ = true;
</script>
</body>
</html>`;

const tmpHTML = path.join(os.tmpdir(), "pdf-preview.html");
await writeFile(tmpHTML, wrapperHTML);

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1024, height: 1400 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();
await page.goto(`file://${tmpHTML}`, { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__PDF_RENDERED__ === true, { timeout: 30000 });

const numPages = await page.evaluate(() => window.__PDF_NUM_PAGES__);
console.log(`PDF pages: ${numPages}`);

for (let i = 1; i <= numPages; i++) {
  const canvas = await page.$(`#page-${i}`);
  if (!canvas) continue;
  const file = path.join(OUT_DIR, `p${String(i).padStart(2, "0")}.png`);
  await canvas.screenshot({ path: file });
  console.log(`saved ${file}`);
}
await browser.close();
