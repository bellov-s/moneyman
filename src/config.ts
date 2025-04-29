// import 'dotenv/config';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { subDays } from "date-fns";
import { AccountConfig, ScraperConfig } from "./types.js";
import { createLogger, logToPublicLog } from "./utils/logger.js";

export const systemName = "moneyman";

const client = new SecretManagerServiceClient();

async function getSecret(secretName: string): Promise<string> {
  const [version] = await client.accessSecretVersion({
    name: `projects/fam-budget-457819/secrets/${secretName}/versions/latest`,
  });

  if (!version.payload || !version.payload.data) {
    throw new Error(`Secret ${secretName} has no payload`);
  }

  return version.payload.data.toString();
}

async function loadSecrets() {
  const accountsJson = await getSecret('ACCOUNTS_JSON');
  //console.log('accountsJson:', accountsJson);
  const googleServiceAccountKey = await getSecret('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY');
  const firebaseServiceAccountJson = await getSecret('FIREBASE_SERVICE_ACCOUNT_JSON');

  return {
    ACCOUNTS_JSON: accountsJson,
    GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: googleServiceAccountKey,
    FIREBASE_SERVICE_ACCOUNT_JSON: firebaseServiceAccountJson,
  };
}

const logger = createLogger("config");

logger("Parsing config");
logToPublicLog("Parsing config");

async function getScraperConfig(): Promise<ScraperConfig> {
  const secrets = await loadSecrets();
  //console.log('secrets:', secrets);

  logger("Env", {
    systemName: "moneyman",
    systemTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  function getAccounts(): Array<AccountConfig> {
    function parseAccounts(accountsJson?: string): Array<AccountConfig> {
      try {
        const parsed = JSON.parse(accountsJson!);
        if (Array.isArray(parsed)) {
          return parsed as Array<AccountConfig>;
        }
      } catch {}

      throw new TypeError("ACCOUNTS_JSON must be a valid array");
    }

    //console.log('accountsJson:', secrets.ACCOUNTS_JSON);
    return parseAccounts(secrets.ACCOUNTS_JSON);
  }

  const scraperConfig: ScraperConfig = {
    accounts: getAccounts(),
    startDate: subDays(Date.now(), Number(process.env.DAYS_BACK || 10)),
    parallelScrapers: Number(process.env.MAX_PARALLEL_SCRAPERS) || 1,
    futureMonthsToScrape: parseInt(process.env.FUTURE_MONTHS || "0", 10),
  };
  //console.log('scraperConfig:', scraperConfig);
  return scraperConfig;
}

export { getScraperConfig };
