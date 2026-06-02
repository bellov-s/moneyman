# Development Guidelines - Moneyman

## Code Quality Standards

### Formatting
- **Prettier** enforced with 2-space indentation, no tabs (`.prettierrc`: `tabWidth: 2, useTabs: false`)
- Pre-commit hook via Husky runs `pretty-quick --staged`
- Run `npm run lint:fix` to auto-format

### TypeScript Conventions
- Strict null checks enabled — always handle `undefined`/`null` explicitly
- Use non-null assertion (`!`) only when map/set access is guaranteed by prior `.has()` check
- Prefer `interface` for object shapes, `type` for unions/aliases
- Export types from `types.ts` as the single source of truth for shared interfaces
- Use `satisfies` for type-safe object literals (e.g., `{} satisfies PuppeteerLaunchOptions`)

### Module System
- **ESM only** — all imports use `.js` extension even for TypeScript files:
  ```typescript
  import { createLogger } from "../utils/logger.js";
  ```
- No CommonJS (`require`) — project uses `"type": "module"`
- Compiled output preserves ESM structure in `dst/`
- Top-level `await` is used in `index.ts`

## Architectural Patterns

### Interface-Based Storage
All storage backends implement `TransactionStorage`:
```typescript
interface TransactionStorage {
  canSave(): boolean;
  saveTransactions(
    txns: Array<TransactionRow>,
    onProgress: (status: string) => Promise<void>,
  ): Promise<SaveStats>;
}
```
- `canSave()` checks if required env vars/secrets are configured
- Storage instances are registered in `bot/storage/index.ts` array and auto-filtered by `.filter(s => s.canSave())`
- Some storages have an `init()` method called inside `saveTransactions` (YNAB, Buxfer, ADE)

### Hook-Based Runner Pattern
The scraper runner uses a `RunnerHooks` interface to decouple execution from side effects:
```typescript
interface RunnerHooks {
  onBeforeStart(): Promise<void>;
  onStatusChanged(rows: string[], totalTime?: number): Promise<void>;
  onResultsReady(results: AccountScrapeResult[]): Promise<void>;
  onError(e: Error, caller?: string): Promise<void>;
  failureScreenshotsHandler: (photos: ImageWithCaption[]) => Promise<unknown>;
  reportRunMetadata(metadata: RunMetadata): Promise<void>;
}
```
- Implementation lives in `bot/index.ts` — maps hooks to Telegram + storage operations
- Runner function signature: `type Runner = (hooks: RunnerHooks) => Promise<void>`

### Debug-Based Logging
- Use `createLogger(namespace)` from `utils/logger.ts`
- Namespaces follow `moneyman:<module>` pattern (e.g., `moneyman:scraper`, `moneyman:bot`)
- Extend loggers for sub-contexts: `logger.extend("subcontext")`
- `logToPublicLog(message)` — writes to stdout (visible in CI logs)
- `logToMetadataFile(message)` — appends timestamped entry to `metadataLogEntries` array (sent via Telegram)
- Example:
  ```typescript
  const logger = createLogger("scraper");
  const accountLogger = logger.extend(`#${i} (${companyId})`);
  ```

### Parallel Execution
- Use `async.parallelLimit` for controlled concurrency (scraping)
- Use `async.parallel` for unlimited concurrency (storage saving)
- Scraping: limited by `MAX_PARALLEL_SCRAPERS` env var
- Storage saving: all storages save in parallel (no limit)

### Progress Reporting Pattern
Storage backends report progress via `onProgress` callback:
```typescript
const [response] = await Promise.all([
  fetch(url, options),
  onProgress("Sending"),
]);
```
This pattern allows Telegram message updates to happen concurrently with the actual operation.

### Transaction Deduplication
- `transactionHash()` — backwards-compatible with Caspion (date rounded to nearest minute + amount + description + memo + companyId + account)
- `transactionUniqueId()` — new format (date as ISO date + companyId + account + amount + identifier or description_memo)
- `TRANSACTION_HASH_TYPE=moneyman` switches to new uniqueId-based dedup

## Naming Conventions

### Files
- **camelCase** for multi-word files: `domainRules.ts`, `failureScreenshot.ts`, `saveStats.ts`
- **PascalCase** for class-focused files: `Timer.ts`
- **kebab-case** for compound names: `azure-data-explorer.ts`, `web-post.ts`
- Test files: `*.test.ts` co-located with source
- Snapshot dirs: `__snapshots__/` co-located with test files

### Variables & Functions
- **camelCase** for functions and variables
- **PascalCase** for classes and interfaces
- **UPPER_SNAKE_CASE** for environment variable references (destructured at module top)
- Prefix loggers with module name for traceability

### Types
- Suffix with purpose: `AccountConfig`, `TransactionRow`, `ScraperConfig`, `SaveStats`
- Use `CompanyTypes` enum from `israeli-bank-scrapers` for company identifiers
- `TableRow` type derived from `TableHeaders` const array

## Common Idioms

### Environment Variable Destructuring at Module Top
```typescript
const {
  YNAB_TOKEN = "",
  YNAB_BUDGET_ID = "",
  YNAB_ACCOUNTS = "",
  TRANSACTION_HASH_TYPE = "",
} = process.env;
```

### Generic Collection Utilities
```typescript
export function addToKeyedSet<K, V>(map: Map<K, Set<V>>, key: K, value: V) {
  if (!map.has(key)) {
    map.set(key, new Set());
  }
  map.get(key)!.add(value);
}

export function addToKeyedMap<K, KItem, VItem>(
  map: Map<K, Map<KItem, VItem>>, key: K, kv: [KItem, VItem]
) {
  if (!map.has(key)) {
    map.set(key, new Map());
  }
  map.get(key)!.set(...kv);
}
```

### Simple Promise Wrappers
```typescript
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

### Timer Class for Step Tracking
```typescript
const steps: Array<Timer> = [];
steps.at(-1)?.end();
steps.push(new Timer(stepName));
// Timer.toString() returns "name, took X.XXs"
```

### Trie-Based Domain Matching
- Domains stored reversed in trie (`com.example.api`) for efficient parent-domain matching
- Caching layer (`cachedRules` Map) on top of trie lookups for performance
- Rules parsed from multiline string or pipe-separated one-liner

### Configuration Pattern
- Secrets loaded asynchronously from GCP Secret Manager via `getScraperConfig()`
- Config functions return typed objects (`ScraperConfig`)
- Environment variables used for non-secret configuration with sensible defaults
- Backup config (`config_backup.ts`) uses synchronous `dotenv` loading

### Storage Save Stats Pattern
```typescript
const stats = createSaveStats("StorageName", "tableName", txns, {
  highlightedTransactions: { Added: [] as Array<TransactionRow> },
});
// Mutate stats during processing
stats.added = rows.length;
stats.skipped++;
return stats;
```

### Concurrent Operation with Progress
```typescript
const [result] = await Promise.all([
  expensiveOperation(),
  onProgress("Step description"),
]);
```

## Testing Patterns
- Jest with `ts-jest` preset
- Module name mapper handles `.js` → `.ts` resolution for ESM imports
- Snapshot tests for message formatting (`__snapshots__/`)
- Separate test config for integration/access tests (`jest.scraper-access.config.js`)
- Test environment: `node`
- Mock pattern: `jest.mock("../utils/logger.js", () => ({ createLogger: jest.fn(() => jest.fn()) }))`
- Test helper functions exported for reuse: `export function transaction(t: Partial<Transaction>): Transaction`
- Integration tests use real browser with `test.each` for parameterized testing

## Security Practices
- Domain whitelisting via trie-based firewall rules per scraper
- Network connection monitoring via `@mswjs/interceptors` (Node.js level) and Puppeteer request interception (browser level)
- Secrets never stored in code — loaded from GCP Secret Manager at runtime
- `BLOCK_BY_DEFAULT` env var for strict network control
- Failure screenshots stored in OS temp dir and cleaned after sending
- Browser args: `--disable-dev-shm-usage`, `--no-sandbox`
- User-agent spoofing to bypass headless detection (`HeadlessChrome/` → `Chrome/`)

## Custom Modifications (Fork-Specific)
- `transactionTableRow.ts` extended with: `processedDate`, `originalCurrency`, `type`, `installments num/total`, `status`, `companyId`, `UUID`
- `scraped by` hardcoded to `"bellov"` instead of `systemName`
- `config.ts` uses GCP Secret Manager instead of env vars for sensitive data
- `TelegramStorage` added as additional storage backend
- `uuid` package used for generating unique transaction identifiers
