# Product Overview - Moneyman

## Purpose
Moneyman is an automated financial transaction scraper that fetches transactions from Israeli banks and credit card companies and exports them to various storage backends. This is a customized fork deployed on Google Cloud Platform (GCP) using Cloud Run Jobs.

## Value Proposition
- Consolidates all financial data from multiple Israeli financial institutions into a single location
- Enables automated, scheduled scraping via GitHub Actions or GCP Cloud Run Jobs
- Supports multiple export targets for flexible data visualization and budgeting workflows
- Handles Cloudflare challenges automatically during scraping

## Key Features
- **Multi-account scraping**: Scrapes multiple bank/credit card accounts in parallel using `israeli-bank-scrapers`
- **8 storage backends**: Google Sheets, Azure Data Explorer, YNAB, Buxfer, Firestore, local JSON, web POST, Telegram
- **Telegram notifications**: Real-time progress updates, error reporting, failure screenshots, and run metadata
- **Domain security**: Trie-based firewall rules and domain whitelisting per scraper to control network access
- **Cloudflare bypass**: Automated Turnstile challenge solver with human-like mouse movements
- **Configurable scheduling**: GitHub Actions workflow (every 12 hours) or GCP Cloud Run Jobs
- **Docker support**: Container built on `ghcr.io/puppeteer/puppeteer` base image
- **Google Cloud Secret Manager integration**: Secrets loaded from GCP project `fam-budget-457819`
- **Transaction deduplication**: Hash-based and uniqueId-based duplicate detection across storage backends
- **Extended table row format**: Includes processedDate, installments, type, status, companyId, UUID fields

## Target Users
- Israeli bank account holders who want automated expense tracking
- Users of budgeting tools (YNAB, Google Sheets dashboards, Power BI)
- Technically proficient users comfortable with GCP and secret management

## Use Cases
1. Periodic automated scraping of all Israeli bank/credit card accounts (twice daily)
2. Exporting transactions to Google Sheets for dashboard visualization
3. Syncing transactions to YNAB for budgeting
4. Storing transaction history in Firestore for analysis
5. Domain security monitoring during scraping sessions
6. Sending full transaction data as JSON via Telegram for backup/audit

## Deployment
- **Primary**: GCP Cloud Run Jobs (`fam-budget-job`) in `europe-west1`
- **Registry**: `europe-west1-docker.pkg.dev/fam-budget-457819/cloud-run-source-deploy/fam-budget:latest`
- **Alternative**: GitHub Actions with `ghcr.io` container registry
