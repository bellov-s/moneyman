import { format, parseISO } from "date-fns";
import { systemName } from "../config.js";
import type { TransactionRow } from "../types.js";
import { normalizeCurrency } from "../utils/currency.js";
import { v4 as uuidv4 } from 'uuid';

const currentDate = format(Date.now(), "yyyy-MM-dd HH:mm:ss");
const { TRANSACTION_HASH_TYPE } = process.env;

export const TableHeaders = [
  "date",
  "processedDate",
  "amount",
  "originalCurrency",
  "chargedCurrency",
  "description",
  "memo",
  "category",
  "account",
  "hash",
  "type",
  "installments num",
  "installments total",
  "comment",
  "scraped at",
  "scraped by",
  "identifier",
  "status",
  "companyId",
  "UUID"
] as const;

export type TableRow = Omit<
  Record<(typeof TableHeaders)[number], string>,
  "amount"
> & {
  amount: number;
};

/* export function tableRow(tx: TransactionRow): TableRow {
  return {
    date: format(parseISO(tx.date), "dd/MM/yyyy", {}),
    amount: tx.chargedAmount,
    description: tx.description,
    memo: tx.memo ?? "",
    category: tx.category ?? "",
    account: tx.account,
    hash: TRANSACTION_HASH_TYPE === "moneyman" ? tx.uniqueId : tx.hash,
    comment: "",
    "scraped at": currentDate,
    "scraped by": systemName,
    identifier: `${tx.identifier ?? ""}`,
    // Assuming the transaction is not pending, so we can use the original currency as the charged currency
    chargedCurrency:
      normalizeCurrency(tx.chargedCurrency) ||
      normalizeCurrency(tx.originalCurrency),
  };
}
 */
export function tableRow(tx: TransactionRow): TableRow {
  var _a, _b, _c, _d;
  return {
    date: format(parseISO(tx.date), "dd/MM/yyyy", {}),
    processedDate: format(parseISO(tx.processedDate), "dd/MM/yyyy", {}),
    amount: tx.chargedAmount,
    originalCurrency: tx.originalCurrency,
    chargedCurrency:
      normalizeCurrency(tx.chargedCurrency) ||
      normalizeCurrency(tx.originalCurrency),
    description: tx.description,
    memo: (_a = tx.memo) !== null && _a !== void 0 ? _a : "",
    category: (_b = tx.category) !== null && _b !== void 0 ? _b : "",
    account: String(tx.account),
    hash: tx.hash,
    type: tx.type,
    'installments num': (_d = tx.installments) !== null && _d !== void 0 ? _d.number : 0,
    'installments total': (_d = tx.installments) !== null && _d !== void 0 ? _d.total : 0,
    comment: "",
    "scraped at": format(parseISO(currentDate), "dd/MM/yyyy HH:mm:ss", {}),
    "scraped by": "bellov",
    identifier: (_c = tx.identifier) !== null && _c !== void 0 ? _c : "",
    status: tx.status,
    companyId: tx.companyId,
    UUID: uuidv4(),
  };
}