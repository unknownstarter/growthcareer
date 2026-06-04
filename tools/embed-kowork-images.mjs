import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dirname, "..");
const svgDir = resolve(root, "docs/screenshots/kowork");
const stockDir = resolve(root, "public/images/stock");

const TARGETS = [
  { svg: "pc-ko.svg",     jpg: "boy-group-concert-stage-3.jpg",            displayW: 480 },
  { svg: "pc-en.svg",     jpg: "boy-group-concert-stage-3.jpg",            displayW: 480 },
  { svg: "mw-ko.svg",     jpg: "stage-lights-purple-pink-2.jpg",           displayW: 160 },
  { svg: "mw-en.svg",     jpg: "stage-lights-purple-pink-2.jpg",           displayW: 160 },
  { svg: "app-ko.svg",    jpg: "concert-stage-from-behind-performer-3.jpg", displayW: 328 },
  { svg: "app-en.svg",    jpg: "concert-stage-from-behind-performer-3.jpg", displayW: 328 },
  { svg: "mw-ko-v2.svg",  jpg: "boy-group-concert-stage-3.jpg",            displayW: 160 },
  { svg: "mw-en-v2.svg",  jpg: "boy-group-concert-stage-3.jpg",            displayW: 160 },
  { svg: "app-ko-v2.svg", jpg: "boy-group-concert-stage-3.jpg",            displayW: 160 },
  { svg: "app-en-v2.svg", jpg: "boy-group-concert-stage-3.jpg",            displayW: 160 },
];

const SCALE = 3;
const JPEG_QUALITY = 82;
const tmp = mkdtempSync(join(tmpdir(), "kowork-embed-"));

function resize(src, dst, width) {
  execFileSync("sips", [
    "-s", "format", "jpeg",
    "-s", "formatOptions", String(JPEG_QUALITY),
    "--resampleWidth", String(width),
    src,
    "--out", dst,
  ], { stdio: "ignore" });
}

function toDataUrl(file) {
  const b64 = readFileSync(file).toString("base64");
  return `data:image/jpeg;base64,${b64}`;
}

try {
  for (const { svg, jpg, displayW } of TARGETS) {
    const srcJpg = join(stockDir, jpg);
    const resizedJpg = join(tmp, `${svg}.jpg`);
    resize(srcJpg, resizedJpg, displayW * SCALE);
    const dataUrl = toDataUrl(resizedJpg);

    const svgPath = join(svgDir, svg);
    const original = readFileSync(svgPath, "utf8");

    if (original.includes('href="data:image')) {
      console.log(`skip    ${svg} (already embedded)`);
      continue;
    }

    const patched = original.replace(
      /href="\.\.\/\.\.\/public\/images\/stock\/[^"]+"/,
      `href="${dataUrl}"`,
    );

    if (original === patched) {
      throw new Error(`${svg}: no image href matched`);
    }

    writeFileSync(svgPath, patched);
    const kb = (patched.length / 1024).toFixed(0);
    console.log(`embedded ${svg} (${kb} KB)`);
  }
  console.log("done");
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
