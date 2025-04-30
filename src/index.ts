import { scrapeAccounts } from "./scraper/index.js";
import { getScraperConfig } from "./config.js";
import { sendError } from "./bot/notifier.js";
import { createLogger } from "./utils/logger.js";
import { RunnerHooks } from "./types.js";
import { runWithStorage } from "./bot/index.js";
import { sendFailureScreenShots } from "./utils/failureScreenshot.js";
import { monitorNodeConnections } from "./security/domains.js";
import { reportRunMetadata } from "./runnerMetadata.js";

(async () => {
  const scraperConfig = await getScraperConfig(); // Получаем конфигурацию асинхронно
  //console.log('scraperConfig:', scraperConfig);

  await scrapeAccounts(scraperConfig);
})();

const logger = createLogger("main");

process.on("uncaughtException", (err, origin) => {
  console.error("uncaughtException, sending error");
  sendError(`
Caught exception: ${err}
err.stack: ${err.stack}
Exception origin: ${origin}`).catch((e) => {});
});

monitorNodeConnections();
await run();

// kill internal browsers if stuck
process.exit(0);

async function runScraper(hooks: RunnerHooks) {
  try {
    logger("About to start");
    await hooks.onBeforeStart();

    logger("Starting to scrape");

    const scraperConfig = await getScraperConfig(); // <-- Тут получаем конфиг

    const results = await scrapeAccounts(
      scraperConfig,
      async (status, totalTime) => {
        logger("Status changed", { status, totalTime });
        return hooks.onStatusChanged(status, totalTime);
      },
      async (e, caller) => {
        logger("Error while scraping", e);
        return hooks.onError(e, caller);
      },
    );

    logger("Scraping ended");
    await Promise.all([
      hooks.onResultsReady(results),
      sendFailureScreenShots(hooks.failureScreenshotsHandler),
    ]);

    await reportRunMetadata((metadata) => {
      logger("Reporting run metadata", metadata);
      return hooks.reportRunMetadata(metadata);
    });
  } catch (e) {
    logger("Error", e);
    await hooks.onError(e);
  }
}

async function run() {
  try {
    logger("Running with storage");
    await runWithStorage(runScraper);
  } catch (error) {
    logger(error);
  }
}
