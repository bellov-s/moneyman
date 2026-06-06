import fs from "node:fs";
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

const DEBUG_DIR = "/app/debug";
try {
  fs.mkdirSync(DEBUG_DIR, { recursive: true });
} catch {}

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

const LOGIN_REDIRECTS: Record<string, string> = {
  isracard: "https://digital.isracard.co.il/personalarea/Login",
  amex: "https://he.americanexpress.co.il/personalarea/Login",
};

const HOME_URLS: Record<string, string> = {
  isracard: "https://www.isracard.co.il",
  amex: "https://americanexpress.co.il",
};

let dumpSeq = 0;

async function dump(page: any, companyId: string, label: string) {
  dumpSeq++;
  const prefix = `${DEBUG_DIR}/${companyId}-${String(dumpSeq).padStart(2, "0")}-${label}`;
  try {
    const url = page.url?.() ?? "unknown";
    logger(`[${companyId}] DUMP #${dumpSeq} ${label} url=${url}`);
    await page.screenshot({ path: `${prefix}.png`, fullPage: true }).catch(() => {});
    const html = await page.content().catch(() => "");
    if (html) fs.writeFileSync(`${prefix}.html`, html, "utf8");
  } catch (e) {
    logger(`[${companyId}] DUMP #${dumpSeq} ${label} FAILED: ${e}`);
    fs.writeFileSync(`${prefix}.error.txt`, String(e), "utf8");
  }
}

export async function scrapeWithSergienko(
  account: AccountConfig,
  startDate: Date,
  futureMonthsToScrape?: number,
  onProgress?: (companyId: string, status: string) => void,
): Promise<ScraperScrapingResult> {
  const companyId = mapCompanyId(account.companyId);
  const timeoutMs =
    Number(process.env.SCRAPER_TIMEOUT_SECONDS || 120) * 1000;

  logger(`started (${companyId}), timeout=${timeoutMs}ms`);

  // Hard timeout wrapper
  const scrapePromise = doScrape(account, companyId, startDate, futureMonthsToScrape, onProgress);
  const timeoutPromise = new Promise<ScraperScrapingResult>((_, reject) =>
    setTimeout(() => reject(new Error(`Hard timeout ${timeoutMs}ms for ${account.companyId}`)), timeoutMs),
  );

  try {
    return await Promise.race([scrapePromise, timeoutPromise]);
  } catch (e) {
    logger(`[${account.companyId}] timeout/error: ${e}`);
    return {
      success: false,
      errorType: "GENERIC" as any,
      errorMessage: String(e),
    };
  }
}

async function doScrape(
  account: AccountConfig,
  companyId: SCompanyTypes,
  startDate: Date,
  futureMonthsToScrape?: number,
  onProgress?: (companyId: string, status: string) => void,
): Promise<ScraperScrapingResult> {
  try {
    const credentials: ScraperCredentials = {
      id: (account as any).id,
      password: (account as any).password,
      card6Digits: (account as any).card6Digits,
    } as any;

    const options: SScraperOptions = {
      companyId,
      startDate,
      futureMonthsToScrape,
      viewportSize: { width: 1920, height: 1080 },
      otpCodeRetriever: async (phoneHint: string) => {
        logger(`OTP screen detected for ${account.companyId}, phone hint: ${phoneHint}`);
        await dump((globalPage as any), account.companyId, "otp-screen");
        return requestOtpCode(account.companyId, phoneHint || "unknown");
      },
      otpTimeoutMs: Number(process.env.OTP_TIMEOUT_SECONDS || 300) * 1000,
      preparePage: async (page: any) => {
        // Store page reference for OTP dump
        globalPage = page;

        logger(`[${account.companyId}] preparePage called, url=${page.url()}`);
        await dump(page, account.companyId, "preparePage-start");

        // Set up route intercepts for home -> login redirect
        const homeUrl = HOME_URLS[account.companyId];
        const loginUrl = LOGIN_REDIRECTS[account.companyId];
        if (homeUrl && loginUrl) {
          logger(`[${account.companyId}] route intercept: ${homeUrl} -> ${loginUrl}`);
          await page.route("**/*", async (route: any) => {
            const reqUrl = route.request().url();
            if (
              reqUrl === homeUrl ||
              reqUrl === homeUrl + "/" ||
              reqUrl === `https://www.${homeUrl.replace("https://", "")}` ||
              reqUrl === `https://www.${homeUrl.replace("https://", "")}/`
            ) {
              logger(`[${account.companyId}] REDIRECT: ${reqUrl} -> ${loginUrl}`);
              await dump(page, account.companyId, "before-redirect");
              await route.fulfill({
                status: 302,
                headers: { location: loginUrl },
              });
            } else {
              await route.continue();
            }
          });
        }

        // Dump on every frame navigation
        page.on("framenavigated", async (frame: any) => {
          const url = frame.url?.() ?? "";
          if (url && url !== "about:blank") {
            logger(`[${account.companyId}] frame navigated: ${url}`);
            await dump(page, account.companyId, "nav");
          }
        });
      },
    };

    let globalPage: any = null;
    const scraper = createScraper(options);

    scraper.onProgress((cid, payload) => {
      logger(`[${cid}] ${payload.type}`);
      onProgress?.(cid, payload.type);
    });

    const result: IScraperScrapingResult = await scraper.scrape(credentials);

    if (!result.success) {
      logger(`error: ${result.errorType} ${result.errorMessage}`);
      if (globalPage) {
        await dump(globalPage, account.companyId, "final-error");
      }
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
