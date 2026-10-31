/**
 * Smoke visual mínimo para CI (home + busca estadual PR se disponível).
 * Uso: DOCS_SHOT_BASE=http://127.0.0.1:3456 node scripts/smoke-screenshot.mjs
 */
import { chromium } from "playwright";
import path from "node:path";
import { mkdir } from "node:fs/promises";

const BASE = process.env.DOCS_SHOT_BASE ?? "http://localhost:3456";
const OUT = path.resolve("docs/screenshots");

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });

  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.screenshot({
    path: path.join(OUT, "smoke-home.png"),
    fullPage: false,
  });
  console.log("saved smoke-home.png");

  await page.goto(`${BASE}/?esfera=estadual_deputado&uf=PR`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.screenshot({
    path: path.join(OUT, "smoke-busca-pr.png"),
    fullPage: false,
  });
  console.log("saved smoke-busca-pr.png");

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
