import "dotenv/config";
import { subDays } from "date-fns";
import { AccountConfig, ScraperConfig } from "./types.js";
import { createLogger, logToPublicLog } from "./utils/logger.js";

export const systemName = "moneyman";
const logger = createLogger("config");

logger("Parsing config");
logToPublicLog("Parsing config");

const {
  DAYS_BACK,
  ACCOUNTS_TO_SCRAPE = "",
  FUTURE_MONTHS = "",
  MAX_PARALLEL_SCRAPERS = "",
} = process.env;

logger("Env", {
  systemName,
  systemTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
});

function getAccounts(): Array<AccountConfig> {
  function parseAccounts(accountsJson?: string): Array<AccountConfig> {
    if (!accountsJson) {
      throw new TypeError("ACCOUNTS_JSON is not set");
    }
    try {
      const parsed = JSON.parse(accountsJson);
      if (Array.isArray(parsed)) {
        return parsed as Array<AccountConfig>;
      }
      throw new TypeError(
        `ACCOUNTS_JSON must be a valid array, got ${typeof parsed}`,
      );
    } catch (e) {
      // Log first 50 chars to debug without exposing full credentials
      const preview = accountsJson.slice(0, 50);
      throw new TypeError(
        `ACCOUNTS_JSON parse error: ${e.message}. Starts with: ${preview}`,
      );
    }
  }

  const allAccounts = parseAccounts(process.env.ACCOUNTS_JSON);
  const accountsToScrape = ACCOUNTS_TO_SCRAPE.split(",")
    .filter(Boolean)
    .map((a) => a.trim());

  return accountsToScrape.length == 0
    ? allAccounts
    : allAccounts.filter((account) =>
        accountsToScrape.includes(account.companyId),
      );
}

export function getScraperConfig(): ScraperConfig {
  return {
    accounts: getAccounts(),
    startDate: subDays(Date.now(), Number(DAYS_BACK || 10)),
    parallelScrapers: Number(MAX_PARALLEL_SCRAPERS) || 1,
    futureMonthsToScrape: parseInt(FUTURE_MONTHS || "0", 10),
  };
}
