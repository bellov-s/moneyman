import { ScraperOptions, ScraperScrapingResult } from "israeli-bank-scrapers";
import { AccountConfig } from "../types.js";
import { createLogger } from "../utils/logger.js";
import { scrapeWithOldEngine } from "./providers/old-scraper.js";
import { scrapeWithSergienko } from "./providers/sergienko-scraper.js";

const logger = createLogger("scrape");

// Companies that should use the sergienko engine (supports 2FA/OTP)
const SERGIENKO_COMPANIES = new Set(
  (process.env.SERGIENKO_COMPANIES || "amex,isracard")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);

function shouldUseSergienko(companyId: string): boolean {
  return SERGIENKO_COMPANIES.has(companyId);
}

export async function getAccountTransactions(
  account: AccountConfig,
  options: ScraperOptions,
  onProgress: (companyId: string, status: string) => void,
): Promise<ScraperScrapingResult> {
  const useSergienko = shouldUseSergienko(account.companyId);
  logger(`Routing ${account.companyId}: engine=${useSergienko ? "sergienko" : "old"} (SERGIENKO_COMPANIES=${process.env.SERGIENKO_COMPANIES || "amex,isracard"})`);

  if (useSergienko) {
    return scrapeWithSergienko(
      account,
      options.startDate,
      options.futureMonthsToScrape,
      onProgress,
    );
  }

  return scrapeWithOldEngine(account, options, onProgress);
}
