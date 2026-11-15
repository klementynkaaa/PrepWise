// Renders the app icon set from the committed SVG sources in design/icons/
// into public/icons/. Run by hand (`npm run icons`) and commit the output;
// it is not part of `npm run build`. Uses Playwright's Chromium, so there is
// no extra dependency.
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const SRC = "design/icons";
const OUT = "public/icons";

const icon = `${SRC}/icon.svg`;
const maskable = `${SRC}/icon-maskable.svg`;
const favicon = `${SRC}/favicon.svg`;

for (const file of [icon, maskable, favicon]) {
  if (!existsSync(file)) {
    console.error(`build-icons: missing source ${file}`);
    process.exit(1);
  }
}

// The Apple touch icon must be full-bleed with no transparency: iOS rounds it
// itself. It is the regular icon with the rounded corners removed.
const fullBleed = readFileSync(icon, "utf8").replace(/ rx="[\d.]+"/, "");
if (fullBleed === readFileSync(icon, "utf8")) {
  console.error(`build-icons: ${icon} has no rounded background rect to square off`);
  process.exit(1);
}

const targets = [
  { name: "icon-192.png", size: 192, svg: readFileSync(icon, "utf8"), transparent: true },
  { name: "icon-512.png", size: 512, svg: readFileSync(icon, "utf8"), transparent: true },
  {
    name: "icon-maskable-512.png",
    size: 512,
    svg: readFileSync(maskable, "utf8"),
    transparent: false,
  },
  { name: "apple-touch-icon.png", size: 180, svg: fullBleed, transparent: false },
  { name: "favicon-32.png", size: 32, svg: readFileSync(favicon, "utf8"), transparent: true },
];

// A PNG starts with an 8-byte signature, then the IHDR chunk: width and height
// are the two big-endian uint32 values at bytes 16 and 20.
function pngSize(buffer) {
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
try {
  for (const { name, size, svg, transparent } of targets) {
    const sized = svg.replace(/ width="\d+" height="\d+"/, ` width="${size}" height="${size}"`);
    const page = await browser.newPage({
      viewport: { width: size, height: size },
      deviceScaleFactor: 1,
    });
    await page.setContent(
      `<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block}</style>${sized}`,
    );
    const png = await page.screenshot({ omitBackground: transparent, type: "png" });
    await page.close();

    const { width, height } = pngSize(png);
    if (width !== size || height !== size) {
      throw new Error(`${name}: expected ${size}x${size}, got ${width}x${height}`);
    }
    writeFileSync(`${OUT}/${name}`, png);
    console.log(`wrote ${OUT}/${name} (${width}x${height})`);
  }
} finally {
  await browser.close();
}

copyFileSync(favicon, `${OUT}/icon.svg`);
console.log(`wrote ${OUT}/icon.svg`);
