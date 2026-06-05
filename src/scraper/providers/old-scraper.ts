import {
  createScraper,
  ScraperOptions,
  ScraperScrapingResult,
} from "israeli-bank-scrapers";
import { AccountConfig } from "../../types.js";
import { ScraperErrorTypes } from "israeli-bank-scrapers/lib/scrapers/errors.js";
import { createLogger } from "../../utils/logger.js";
import { getOtpCodeRetriever } from "../otp.js";

const logger = createLogger("old-scraper");

export async function scrapeWithOldEngine(
  account: AccountConfig,
  options: ScraperOptions,
  onProgress: (companyId: string, status: string) => void,
): Promise<ScraperScrapingResult> {
  logger(`started (${account.companyId})`);
  try {
    const scraper = createScraper(options);

    scraper.onProgress((companyId, { type }) => {
      logger(`[${companyId}] ${type}`);
      onProgress(companyId, type);
    });

    const otpCodeRetriever = getOtpCodeRetriever(account);
    const credentials = otpCodeRetriever
      ? { ...account, otpCodeRetriever }
      : account;

    const result = await scraper.scrape(credentials as any);

    if (!result.success) {
      logger(`error: ${result.errorType} ${result.errorMessage}`);
    }
    logger(`ended`);
    return result;
  } catch (e) {
    logger(e);
    return {
      success: false,
      errorType: ScraperErrorTypes.Generic,
      errorMessage: String(e),
    };
  }
}
