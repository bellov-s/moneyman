# Project Structure - Moneyman

## Directory Layout

```
moneyman/
├── src/                        # TypeScript source code
│   ├── index.ts                # Entry point - orchestrates scraping and storage
│   ├── config.ts               # Configuration loader (GCP Secret Manager, async)
│   ├── config_backup.ts        # Backup config (env-based via dotenv, synchronous)
│   ├── types.ts                # Shared TypeScript type definitions
│   ├── runnerMetadata.ts       # Run metadata reporting (domains, IP, logs)
│   ├── test-scraper-access.ts  # Scraper connectivity integration test (Jest)
│   ├── test-secrets.ts         # Secret loading test utility
│   ├── bot/                    # Telegram bot & storage orchestration
│   │   ├── index.ts            # runWithStorage - main runner with hooks
│   │   ├── notifier.ts         # Telegram message sending (send, edit, photos, JSON)
│   │   ├── messages.ts         # Message formatting helpers (summary, saving status)
│   │   ├── messages.test.ts    # Snapshot tests for message formatting
│   │   ├── saveStats.ts        # Save statistics tracking & formatting
│   │   ├── transactionTableRow.ts # Transaction → table row conversion (extended format)
│   │   ├── __snapshots__/      # Jest snapshot files
│   │   └── storage/            # Storage backend implementations
│   │       ├── index.ts        # Storage registry & parallel save orchestration
│   │       ├── sheets.ts       # Google Sheets export (hash dedup)
│   │       ├── azure-data-explorer.ts # Azure Data Explorer ingest via Kusto
│   │       ├── ynab.ts         # YNAB export (import_id dedup)
│   │       ├── buxfer.ts       # Buxfer export with tagging
│   │       ├── firestore.ts    # Firebase Firestore export (hash dedup)
│   │       ├── json.ts         # Local JSON file export to output/
│   │       ├── web-post.ts     # HTTP POST export with auth header
│   │       ├── telegram.ts     # Telegram JSON document export
│   │       ├── utils.ts        # Transaction hashing (transactionHash, transactionUniqueId)
│   │       ├── utils.test.ts   # Hash utility tests
│   │       └── __snapshots__/  # Jest snapshot files
│   ├── scraper/                # Bank scraping logic
│   │   ├── index.ts            # Scraper orchestration (parallelLimit, browser lifecycle)
│   │   ├── scrape.ts           # Individual account scraping (createScraper wrapper)
│   │   ├── scrape.test.ts      # Scrape unit tests
│   │   ├── browser.ts          # Puppeteer browser/context management, CF skipping
│   │   └── cloudflareSolver.ts # Cloudflare Turnstile solver (mouse simulation)
│   ├── security/               # Network security
│   │   ├── domains.ts          # Domain monitoring (puppeteer + node interceptors)
│   │   ├── domains.test.ts     # Domain monitoring tests
│   │   ├── domainRules.ts      # Trie-based firewall rules (allow/block per scraper)
│   │   ├── domainRules.test.ts # Firewall rule tests
│   │   └── __snapshots__/      # Jest snapshot files
│   └── utils/                  # Shared utilities
│       ├── logger.ts           # Debug-based logging + metadata file logging
│       ├── collections.ts      # Map utility functions (addToKeyedSet, addToKeyedMap)
│       ├── currency.ts         # Currency symbol normalization
│       ├── currency.test.ts    # Currency tests
│       ├── Timer.ts            # Performance timer class with toString()
│       ├── failureScreenshot.ts # Screenshot capture/send on failure
│       └── utils.ts            # sleep() utility
├── dst/                        # Compiled JavaScript output (ES2022 modules + source maps)
├── output/                     # Local JSON transaction exports (timestamped files)
├── patches/                    # patch-package patches
│   └── israeli-bank-scrapers+5.4.6.patch
├── .github/workflows/          # GitHub Actions CI/CD
│   ├── scrape.yml              # Scheduled scraping (cron: twice daily)
│   ├── build.yml               # Docker image build & push to ghcr.io
│   ├── test-connections.yml    # Scraper connectivity tests
│   ├── pr-build.yml            # PR build validation
│   ├── autofix.yml             # Auto-fix workflow
│   └── cleanup-pr.yml          # PR cleanup
├── package.json                # Dependencies and scripts
├── tsconfig.json               # TypeScript configuration
├── jest.config.js              # Jest test configuration (ts-jest, ESM)
├── jest.scraper-access.config.js # Integration test config
├── Dockerfile                  # Container build (puppeteer base)
├── docker-compose.yml          # Local container orchestration
├── Deploy.md                   # GCP Cloud Run deployment commands
├── Commands.txt                # Misc command reference
├── .env                        # Local environment variables
└── .prettierrc                 # Prettier config (2-space, no tabs)
```

## Core Architecture

### Data Flow
1. `index.ts` → loads config from GCP Secret Manager (`config.ts` → `getScraperConfig()`)
2. `security/domains.ts` → `monitorNodeConnections()` starts intercepting outgoing requests
3. `scraper/index.ts` → creates Puppeteer browser, scrapes accounts in parallel via `parallelLimit`
4. `scraper/browser.ts` → creates secure browser contexts with domain tracking + Cloudflare handling
5. `bot/index.ts` → provides `RunnerHooks` implementation (status, results, errors)
6. `bot/storage/index.ts` → transforms results to `TransactionRow[]`, dispatches to all enabled storages in parallel
7. `bot/notifier.ts` → sends Telegram updates throughout the process
8. `runnerMetadata.ts` → reports domains accessed, external IP, and metadata log entries

### Key Interfaces

```typescript
// Central type for processed transactions
interface TransactionRow extends Transaction {
  account: string;
  companyId: CompanyTypes;
  hash: string;      // backwards-compatible caspion hash
  uniqueId: string;  // new moneyman unique identifier
}

// Storage backend contract
interface TransactionStorage {
  canSave(): boolean;
  saveTransactions(txns: TransactionRow[], onProgress: (status: string) => Promise<void>): Promise<SaveStats>;
}

// Runner lifecycle hooks
interface RunnerHooks {
  onBeforeStart(): Promise<void>;
  onStatusChanged(rows: string[], totalTime?: number): Promise<void>;
  onResultsReady(results: AccountScrapeResult[]): Promise<void>;
  onError(e: Error, caller?: string): Promise<void>;
  failureScreenshotsHandler: (photos: ImageWithCaption[]) => Promise<unknown>;
  reportRunMetadata(metadata: RunMetadata): Promise<void>;
}
```

### Component Relationships
- `config.ts` provides `ScraperConfig` to `scraper/index.ts` (async, GCP secrets)
- `config_backup.ts` provides same as synchronous export (env-based fallback)
- `scraper/index.ts` returns `AccountScrapeResult[]` to `bot/storage/index.ts`
- `bot/storage/utils.ts` generates `hash` and `uniqueId` for each transaction
- `bot/transactionTableRow.ts` converts `TransactionRow` → `TableRow` for storage (adds UUID, processedDate, installments)
- `security/domains.ts` monitors both Puppeteer page requests and Node.js outgoing requests
- `security/domainRules.ts` provides trie-based ALLOW/BLOCK rules per company
- `bot/notifier.ts` is used across all modules for Telegram communication

### Storage Registry (bot/storage/index.ts)
Storages are instantiated and filtered by `canSave()`:
1. `LocalJsonStorage` — requires `LOCAL_JSON_STORAGE` env var
2. `GoogleSheetsStorage` — requires sheet ID + service account credentials
3. `AzureDataExplorerStorage` — requires Azure app + Kusto config
4. `YNABStorage` — requires YNAB token + budget ID
5. `BuxferStorage` — requires Buxfer credentials + account mapping
6. `WebPostStorage` — requires `WEB_POST_URL`
7. `FirestoreStorage` — requires Firebase `applicationDefault()` credentials
8. `TelegramStorage` — requires `TELEGRAM_CHAT_ID` (sends JSON document)
