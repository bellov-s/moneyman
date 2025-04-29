import { createLogger } from "../../utils/logger.js";
import type { TransactionRow, TransactionStorage } from "../../types.js";
import { TransactionStatuses } from "israeli-bank-scrapers/lib/transactions.js";
import { tableRow } from "../transactionTableRow.js";
import { createSaveStats } from "../saveStats.js";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const logger = createLogger("FirestoreStorage");

let appInitialized = false;

export class FirestoreStorage implements TransactionStorage {
  private db;

  constructor() {
    if (!appInitialized) {
      initializeApp({
        credential: applicationDefault(),
      });
      appInitialized = true;
    }
    this.db = getFirestore();
  }

  canSave() {
    return Boolean(this.db);
  }

  async saveTransactions(
    txns: Array<TransactionRow>,
    onProgress: (status: string) => Promise<void>,
  ) {
    logger("saveTransactions");

    const nonPendingTxns = txns.filter(
      (txn) => txn.status !== TransactionStatuses.Pending,
    );

    logger(`Saving ${nonPendingTxns.length} transactions to Firestore`);

    await onProgress("Sending");

    let added = 0;
    let skipped = 0;

    for (const tx of nonPendingTxns) {
      try {
        const txData = tableRow(tx);

        const existing = await this.db
          .collection("Transactions")
          .where("hash", "==", txData.hash)
          .get();

        if (!existing.empty) {
          logger("Duplicate transaction skipped", txData);
          skipped++;
          continue;
        }

        await this.db.collection("Transactions").add(txData);
        added++;
      } catch (err) {
        logger(`Failed to save transaction: ${err}`);
      }
    }

    const stats = createSaveStats("FirestoreStorage", "firestore", txns);
    stats.added = added;
    stats.skipped += skipped + stats.pending;

    return stats;
  }
}
