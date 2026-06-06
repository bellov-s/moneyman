import fs from "node:fs";
import type { Page } from "puppeteer";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("debug-scraper");
const DEBUG_DIR = "/app/debug";
const DEBUG_ENABLED = process.env.DEBUG_SCRAPER === "true";

let seq = 0;

function ensureDir() {
  try {
    fs.mkdirSync(DEBUG_DIR, { recursive: true });
  } catch {}
}

export async function debugDump(
  page: Page | null | undefined,
  company: string,
  label: string,
) {
  if (!DEBUG_ENABLED || !page) return;
  ensureDir();
  seq++;
  const prefix = `${DEBUG_DIR}/${company}-${String(seq).padStart(2, "0")}-${label}`;
  try {
    const url = page.url();
    logger(`DUMP #${seq} [${company}] ${label} url=${url}`);
    await page.screenshot({ path: `${prefix}.png`, fullPage: true }).catch(() => {});
    const html = await page.content().catch(() => "");
    if (html) fs.writeFileSync(`${prefix}.html`, html, "utf8");
  } catch (e) {
    try {
      fs.writeFileSync(`${prefix}.error.txt`, String(e), "utf8");
    } catch {}
  }
}

export function isDebugEnabled() {
  return DEBUG_ENABLED;
}
