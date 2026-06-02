# Technology Stack - Moneyman

## Languages & Runtime
- **TypeScript** 5.8.3 (source in `src/`)
- **JavaScript** ES2022 (compiled output in `dst/`)
- **Node.js** >= 20 (required by `engines` field)
- **ESM modules** (`"type": "module"`, `"module": "ESNext"` in tsconfig)

## TypeScript Configuration
- Target: `es2022`
- Module: `ESNext`
- Module resolution: `Node`
- `strictNullChecks`: enabled
- `esModuleInterop`: enabled
- `skipLibCheck`: enabled
- Source maps: enabled
- Output directory: `dst/`

## Core Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| `israeli-bank-scrapers` | ^5.4.6 | Bank/credit card scraping engine (patched) |
| `@google-cloud/secret-manager` | ^6.0.1 | GCP secret loading (project: fam-budget-457819) |
| `firebase-admin` | ^13.3.0 | Firestore storage backend |
| `google-spreadsheet` | ^4.1.4 | Google Sheets export |
| `google-auth-library` | ^9.15.1 | Google authentication for Sheets |
| `azure-kusto-data` / `azure-kusto-ingest` | ^6.0.3 | Azure Data Explorer export |
| `ynab` | ^2.9.0 | YNAB budget sync |
| `buxfer-ts-client` | ^1.1.2 | Buxfer export |
| `telegraf` | ^4.16.3 | Telegram bot notifications |
| `date-fns` | ^4.1.0 | Date manipulation (format, parseISO, subDays) |
| `async` | ^3.2.6 | Parallel execution control (parallelLimit) |
| `debug` | ^4.4.0 | Namespaced debug logging |
| `dotenv` | ^16.5.0 | Environment variable loading (backup config) |
| `hash-it` | ^6.0.0 | Transaction hashing for YNAB import_id |
| `@mswjs/interceptors` | ^0.38.4 | Network request interception (domain monitoring) |
| `glob` | ^11.0.1 | File pattern matching (failure screenshots) |
| `uuid` | (used) | UUID v4 generation for transaction rows |

## Dev Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| `jest` | ^29.7.0 | Testing framework |
| `ts-jest` | ^29.3.2 | TypeScript Jest transformer |
| `jest-mock-extended` | ^4.0.0-beta1 | Mock utilities |
| `prettier` | ^3.5.3 | Code formatting |
| `husky` | ^9.1.7 | Git hooks |
| `pretty-quick` | ^4.1.1 | Pre-commit formatting |
| `patch-package` | ^8.0.0 | Dependency patching |
| `typescript` | ^5.8.3 | TypeScript compiler |
| `@types/async` | ^3.2.24 | Type definitions |
| `@types/debug` | ^4.1.12 | Type definitions |
| `@types/jest` | ^29.5.14 | Type definitions |
| `@types/node` | ^22.14.1 | Type definitions |

## Build & Development Commands
| Command | Description |
|---------|-------------|
| `npm run build` | Compile TypeScript (`tsc`) |
| `npm run start` | Run compiled app (`node dst/index.js`) |
| `npm run test` | Run Jest tests |
| `npm run test:scraper-access` | Run scraper connectivity integration tests |
| `npm run lint` | Check formatting with Prettier |
| `npm run lint:fix` | Auto-fix formatting |
| `npm run start:container` | Run via docker-compose |
| `npm run act` | Run GitHub Actions locally (requires Go) |

## GCP Deployment Commands (Deploy.md)
```bash
# Build and push
docker build -t fam-budget .
gcloud auth configure-docker europe-west1-docker.pkg.dev
docker tag fam-budget europe-west1-docker.pkg.dev/fam-budget-457819/cloud-run-source-deploy/fam-budget:latest
docker push europe-west1-docker.pkg.dev/fam-budget-457819/cloud-run-source-deploy/fam-budget:latest

# Update Cloud Run Job
gcloud run jobs update fam-budget-job --region=europe-west1 --image=europe-west1-docker.pkg.dev/fam-budget-457819/cloud-run-source-deploy/fam-budget:latest

# Execute
gcloud run jobs execute fam-budget-job --region=europe-west1

# View logs
gcloud logging read "resource.type=cloud_run_job AND resource.labels.job_name=fam-budget-job" --limit=50 --region=europe-west1 --format="value(textPayload)"
```

## Code Formatting
- Prettier with 2-space indentation (`tabWidth: 2`), no tabs (`useTabs: false`)
- Husky pre-commit hook runs `pretty-quick --staged`

## Testing
- Jest with `ts-jest` preset, test environment: `node`
- Module name mapper: `"^(\\.\\.?\\/.+)\\.jsx?$": "$1"` (handles `.js` → `.ts` for ESM)
- Reporters: `github-actions` (silent: false) + `summary`
- Root directory: `./src`
- Snapshot testing for message formatting (`__snapshots__/`)
- Separate config for integration tests (`jest.scraper-access.config.js`)

## Containerization
- Base image: `ghcr.io/puppeteer/puppeteer` (includes Chrome)
- Dockerfile: copies patches, runs `npm ci`, builds TypeScript, runs `npm start`
- docker-compose.yml: simple service with `.env` file
- GitHub Actions builds and pushes to `ghcr.io`
- GCP Artifact Registry: `europe-west1-docker.pkg.dev/fam-budget-457819/cloud-run-source-deploy/`

## Patches
- `israeli-bank-scrapers+5.4.6.patch` applied via `patch-package` on `postinstall`

## Secret Management
- **Primary**: Google Cloud Secret Manager (project: `fam-budget-457819`)
  - `ACCOUNTS_JSON` — bank account credentials
  - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` — Google Sheets auth
  - `FIREBASE_SERVICE_ACCOUNT_JSON` — Firestore auth
- **Fallback**: `.env` file with `dotenv` (used in `config_backup.ts`)
- **Firebase**: Uses `applicationDefault()` credential (relies on `GOOGLE_APPLICATION_CREDENTIALS` env var)

## Environment Variables
| Variable | Default | Purpose |
|----------|---------|---------|
| `DAYS_BACK` | `10` | Days to scrape back |
| `FUTURE_MONTHS` | `0` | Future months to scrape |
| `MAX_PARALLEL_SCRAPERS` | `1` | Parallel scraper limit |
| `ACCOUNTS_TO_SCRAPE` | `""` | Comma-separated filter |
| `TZ` | `Asia/Jerusalem` | Process timezone |
| `TRANSACTION_HASH_TYPE` | `""` | `moneyman` for new hash |
| `DOMAIN_TRACKING_ENABLED` | `""` | Enable domain monitoring |
| `BLOCK_BY_DEFAULT` | `""` | Block unruled domains |
| `FIREWALL_SETTINGS` | `""` | Domain rules (multiline) |
| `PUPPETEER_EXECUTABLE_PATH` | `undefined` | Custom Chrome path |
| `LOCAL_JSON_STORAGE` | `""` | Enable JSON file export |
| `WORKSHEET_NAME` | `_moneyman` | Google Sheets tab name |
| `HIDDEN_DEPRECATIONS` | `""` | Suppress deprecation warnings |
