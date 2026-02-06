# Marketing Dashboard

A Next.js dashboard for your marketing team, powered by Google BigQuery.

## Features

- **Overview metrics**: Total spend, impressions, clicks, conversions, revenue
- **Spend trends**: Time-series chart of ad spend
- **Channel performance**: Spend by channel (Google Ads, Meta, LinkedIn, etc.)
- **Top campaigns**: Table of campaigns by spend
- **Date range filter**: 7, 14, 30, or 90 days

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Run with mock data (no BigQuery)

```bash
# .env.local already has USE_MOCK_DATA=true
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 3. Connect to BigQuery

1. Copy `.env.local.example` to `.env.local` (or edit `.env.local`)
2. Remove or set `USE_MOCK_DATA=false`
3. Add your BigQuery credentials:

```
GOOGLE_CLOUD_PROJECT=your-project-id
BIGQUERY_DATASET=your_dataset
BIGQUERY_TABLE=your_table
GOOGLE_APPLICATION_CREDENTIALS=./path/to/service-account.json
```

4. **Column mapping**: If your table uses different column names, add:

```
DATE_COLUMN=event_date
CHANNEL_COLUMN=source
CAMPAIGN_COLUMN=campaign_name
```

5. Update `src/lib/queries.ts` so the SQL matches your schema (spend/cost, revenue/value, etc.)

## What I need from you

To fully connect your BigQuery data:

1. **Project ID** – Your GCP project ID
2. **Dataset name** – e.g. `marketing_data`
3. **Table name** – e.g. `campaign_performance`
4. **Schema** – Column names for:
   - Date (e.g. `date`, `event_date`, `created_at`)
   - Spend/cost (e.g. `spend`, `cost`, `ad_spend`)
   - Impressions, clicks, conversions, revenue
   - Channel (e.g. `channel`, `source`, `medium`)
   - Campaign (e.g. `campaign`, `campaign_name`)

Share these and we can tailor the queries to your schema.

## Tech stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- Recharts
- @google-cloud/bigquery
