import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, extname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const desktopDir = join(scriptDir, "..");
const buildDir = join(desktopDir, "build");
const screenshotsDir = join(buildDir, "screenshots");

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const APP_ID = "com.tigawanna.agentic-geojson-builder";
const METAINFO_FILE = join(buildDir, `${APP_ID}.metainfo.xml`);

function readPackageJson() {
  return JSON.parse(readFileSync(join(desktopDir, "package.json"), "utf8"));
}

function readElectronBuilderProductName() {
  const yml = readFileSync(join(desktopDir, "electron-builder.yml"), "utf8");
  const match = /productName:\s*"(.+?)"/.exec(yml);
  return match?.[1] ?? "Agentic GeoJSON Builder";
}

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function parseArgs(argv) {
  let baseUrl = process.env.SCREENSHOT_BASE_URL?.replace(/\/$/, "") ?? "";
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--base-url" && argv[index + 1]) {
      baseUrl = argv[index + 1].replace(/\/$/, "");
      index += 1;
    }
  }
  return { baseUrl };
}

function screenshotSortKey(fileName) {
  const match = /^(\d+)/.exec(fileName);
  return match ? Number.parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
}

function listScreenshotFiles() {
  if (!existsSync(screenshotsDir)) {
    return [];
  }

  return readdirSync(screenshotsDir)
    .filter((fileName) => IMAGE_EXTENSIONS.has(extname(fileName).toLowerCase()))
    .sort((left, right) => {
      const order = screenshotSortKey(left) - screenshotSortKey(right);
      return order !== 0 ? order : left.localeCompare(right);
    });
}

function readCaption(fileName) {
  const captionPath = join(screenshotsDir, `${basename(fileName, extname(fileName))}.caption.txt`);
  if (!existsSync(captionPath)) {
    return null;
  }
  const caption = readFileSync(captionPath, "utf8").trim();
  return caption.length > 0 ? caption : null;
}

function imageUrl(fileName, baseUrl) {
  if (baseUrl) {
    return `${baseUrl}/screenshots/${fileName}`;
  }
  return `screenshots/${fileName}`;
}

function buildScreenshotsXml(files, baseUrl) {
  if (files.length === 0) {
    return "";
  }

  const entries = files.map((fileName, index) => {
    const caption = readCaption(fileName) ?? `Screenshot ${index + 1}`;
    const typeAttr = index === 0 ? ' type="default"' : "";
    return `    <screenshot${typeAttr}>
      <image>${escapeXml(imageUrl(fileName, baseUrl))}</image>
      <caption>${escapeXml(caption)}</caption>
    </screenshot>`;
  });

  return `  <screenshots>
${entries.join("\n")}
  </screenshots>`;
}

function buildMetainfoXml({ pkg, productName, screenshotsXml }) {
  const releaseDate = new Date().toISOString().slice(0, 10);
  const summary = pkg.description.split(".")[0]?.trim() ?? pkg.description;

  return `<?xml version="1.0" encoding="UTF-8"?>
<component type="desktop-application">
  <id>${APP_ID}</id>
  <name>${escapeXml(productName)}</name>
  <summary>${escapeXml(summary)}</summary>
  <description>
    <p>${escapeXml(pkg.description)}</p>
  </description>
  <launchable type="desktop-id">${escapeXml(pkg.name)}.desktop</launchable>
  <url type="homepage">${escapeXml(pkg.homepage ?? "")}</url>
  <developer_name>${escapeXml(pkg.author ?? "tigawanna")}</developer_name>
${screenshotsXml}
  <releases>
    <release version="${escapeXml(pkg.version)}" date="${releaseDate}"/>
  </releases>
  <content_rating type="oars-1.1"/>
</component>
`;
}

function printUsage() {
  console.log(`Generate AppStream metainfo from numbered screenshots in build/screenshots/.

Usage:
  node scripts/generate-appstream-metainfo.mjs [--base-url <url>]

Screenshot files:
  build/screenshots/1.png
  build/screenshots/2.png
  build/screenshots/01-map-workspace.png

Optional captions (same stem as the image):
  build/screenshots/1.caption.txt

Options:
  --base-url <url>   Public URL prefix for screenshot images (HTTPS).
                     Example: https://raw.githubusercontent.com/org/repo/main/apps/desktop/build
                     Default: relative paths (screenshots/1.png) for bundled .deb installs.

Environment:
  SCREENSHOT_BASE_URL   Same as --base-url

Output:
  build/${APP_ID}.metainfo.xml
`);
}

function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    printUsage();
    return;
  }

  const { baseUrl } = parseArgs(process.argv.slice(2));
  const pkg = readPackageJson();
  const productName = readElectronBuilderProductName();
  const screenshotFiles = listScreenshotFiles();
  const screenshotsXml = buildScreenshotsXml(screenshotFiles, baseUrl);
  const xml = buildMetainfoXml({ pkg, productName, screenshotsXml });

  writeFileSync(METAINFO_FILE, xml, "utf8");

  console.log(`Wrote ${METAINFO_FILE}`);
  console.log(`Screenshots: ${screenshotFiles.length}`);
  if (screenshotFiles.length > 0) {
    for (const fileName of screenshotFiles) {
      console.log(`  - ${fileName}`);
    }
  } else {
    console.log("  (none — add numbered PNG/WebP files to build/screenshots/)");
  }
}

main();
