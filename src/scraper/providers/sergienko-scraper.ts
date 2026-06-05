import {
  createScraper,
  CompanyTypes as SCompanyTypes,
  type ScraperOptions as SScraperOptions,
  type IScraperScrapingResult,
  type ScraperCredentials,
} from "@sergienko4/israeli-bank-scrapers";
import { AccountConfig } from "../../types.js";
import { createLogger } from "../../utils/logger.js";
import { requestOtpCode } from "../../bot/notifier.js";
import { normalizeResult } from "../normalize.js";
import type { ScraperScrapingResult } from "israeli-bank-scrapers";

const logger = createLogger("sergienko-scraper");

// Map old companyId strings to new PascalCase enum
const companyMap: Record<string, SCompanyTypes> = {
  amex: SCompanyTypes.Amex,
  isracard: SCompanyTypes.Isracard,
  visaCal: SCompanyTypes.VisaCal,
  max: SCompanyTypes.Max,
  hapoalim: SCompanyTypes.Hapoalim,
  leumi: SCompanyTypes.Leumi,
  beinleumi: SCompanyTypes.Beinleumi,
  discount: SCompanyTypes.Discount,
  mizrahi: SCompanyTypes.Mizrahi,
  otsarHahayal: SCompanyTypes.OtsarHahayal,
  massad: SCompanyTypes.Massad,
  yahav: SCompanyTypes.Yahav,
  oneZero: SCompanyTypes.OneZero,
};

function mapCompanyId(companyId: string): SCompanyTypes {
  return companyMap[companyId] ?? (companyId as SCompanyTypes);
}

export async function scrapeWithSergienko(
  account: AccountConfig,
  startDate: Date,
  futureMonthsToScrape?: number,
  onProgress?: (companyId: string, status: string) => void,
): Promise<ScraperScrapingResult> {
  const companyId = mapCompanyId(account.companyId);
  logger(`started (${companyId})`);

  try {
    const phoneNumber = (account as any).phoneNumber ?? "";

    const otpCodeRetriever = phoneNumber
      ? async () => {
          logger(`OTP requested for ${companyId}`);
          return requestOtpCode(account.companyId, phoneNumber);
        }
      : undefined;

    const credentials: ScraperCredentials = {
      ...account,
      ...(otpCodeRetriever ? { otpCodeRetriever, phoneNumber } : {}),
    } as any;

    const options: SScraperOptions = {
      companyId,
      startDate,
      futureMonthsToScrape,
      viewportSize: { width: 1920, height: 1080 },
    };

    const scraper = createScraper(options);

    scraper.onProgress((cid, payload) => {
      logger(`[${cid}] ${payload.type}`);
      onProgress?.(cid, payload.type);
    });

    const result: IScraperScrapingResult = await scraper.scrape(credentials);

    if (!result.success) {
      logger(`error: ${result.errorType} ${result.errorMessage}`);
    }
    logger(`ended`);

    return normalizeResult(result);
  } catch (e) {
    logger(e);
    return {
      success: false,
      errorType: "GENERIC" as any,
      errorMessage: String(e),
    };
  }
}
