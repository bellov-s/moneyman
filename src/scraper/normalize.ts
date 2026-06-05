import type { IScraperScrapingResult } from "@sergienko4/israeli-bank-scrapers";
import type { ScraperScrapingResult } from "israeli-bank-scrapers";

/**
 * Normalize @sergienko4 IScraperScrapingResult to the old israeli-bank-scrapers format.
 * The transaction shapes are almost identical — both have date, chargedAmount, description, etc.
 */
export function normalizeResult(
  result: IScraperScrapingResult,
): ScraperScrapingResult {
  if (!result.success) {
    return {
      success: false,
      errorType: result.errorType as any,
      errorMessage: result.errorMessage,
    };
  }

  return {
    success: true,
    accounts:
      result.accounts?.map((account) => ({
        accountNumber: account.accountNumber,
        balance: account.balance,
        txns: account.txns.map((tx) => ({
          type: tx.type as any,
          identifier: tx.identifier,
          date: tx.date,
          processedDate: tx.processedDate,
          originalAmount: tx.originalAmount,
          originalCurrency: tx.originalCurrency,
          chargedAmount: tx.chargedAmount,
          chargedCurrency: tx.chargedCurrency,
          description: tx.description,
          memo: tx.memo ?? "",
          status: tx.status as any,
          installments: tx.installments as any,
          category: tx.category,
        })),
      })) ?? [],
  };
}
