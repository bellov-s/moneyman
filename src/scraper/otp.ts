import { AccountConfig } from "../types.js";
import { requestOtpCode } from "../bot/notifier.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("otp");

const { OTP_ENABLED = "" } = process.env;

/**
 * Returns an otpCodeRetriever function for accounts that support 2FA via SMS.
 * Enabled by setting OTP_ENABLED=true in env vars.
 * The scraper will call this when it needs an OTP code — it sends a Telegram
 * message and waits for the user to reply with the code.
 */
export function getOtpCodeRetriever(
  account: AccountConfig,
): (() => Promise<string>) | undefined {
  if (!OTP_ENABLED || OTP_ENABLED === "false" || OTP_ENABLED === "0") {
    return undefined;
  }

  const phoneNumber = (account as any).phoneNumber ?? "";

  logger(`Setting up OTP retriever for ${account.companyId}`);

  return async () => {
    logger(`OTP requested for ${account.companyId}`);
    return requestOtpCode(account.companyId, phoneNumber);
  };
}
