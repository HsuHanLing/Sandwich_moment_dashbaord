# Moment analytics v2: data integration and release checklist

Implemented from the Notion summary and the decisions confirmed on 2026-11-10.
This repository implements the dashboard, calculation engine, read APIs, validated
server feed, RevenueCat inbox, reconciliation utility and BigQuery DDL. It does
not contain the mobile App or its backend. Instrumentation and authoritative
historical exports must be supplied by those owners before production activation.

## Local preview and checks

Node 22.17+; `npm ci`, `npm test`, `npm run lint`, `npm run build`.
To preview with clearly marked synthetic data, set `MOMENT_DEMO=true` and
`MOMENT_REPORT_TIME_ZONE=UTC`, then run:

```
node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3020
```

Never enable demo mode in production. The preview is not a replay of user data.
Without configured sources the UI deliberately shows unavailable results.

## Read API

Existing KPI, daily-trend, health-dashboard, activation-funnel, session-quality,
behaviour, monetisation, economy and retention paths remain available.
`?schema=2` returns the common report envelope. `/api/moment/analytics` always
returns v2. Legacy shapes remain adapters; nullable numeric fields intentionally
replace fake zeroes. Array adapters expose data status/timezone in response headers.

Parameters: `start`, `end` (inclusive ISO calendar dates), or `days` (1–90),
`mode=today|7d|30d` for compatibility, `version`, `platform=IOS|ANDROID|WEB`,
`geo` (English country name), `compare=true`. Explicit `start/end` takes priority.
No future end date is allowed. Comparison is the preceding equal-length period.
All SQL filter values are bound parameters. Table identifiers come only from
validated server configuration. Daily source precedence is selected before filters.

Metadata contains dates, timezone, applied filters, source availability, update
time, demo flag, reasons and missing-ID counts. `null` means unavailable, not zero.
Sources are cached server-side for 30 seconds by complete context and history
lookback; the browser cancels stale requests and caches complete URLs for 30 seconds.

## Source setup

Review `sql/analytics-schema.sql` with the data owner. It creates a separate
`moment_analytics` dataset in us-east1; it never changes GA4's events tables.
The SQL file has NOT been executed by this implementation.

Copy `.env.example` and set the GA4 reporting timezone from the property's actual
configuration. Enable optional fact tables only after schema and reconciliation
checks. Set coverage dates only for completely loaded date ranges. Keep them
behind any unresolved missing export, failed batch, ambiguous refund or unknown
conversation creation history. Update the watermarks with each successful import;
do not mark an empty/new table complete to make the UI display numbers.

`MOMENT_VERIFIED_EVENTS` is an explicit comma-separated capability manifest for
QA-verified App versions. Its COMPLETE_FROM/THROUGH dates must cover the entire
query window; otherwise new result metrics remain unavailable. Never advertise
capabilities for versions or countries where an event is missing. If deployments
are mixed, leave the manifest unset until coverage is consistent.

## App / backend contract

GA4 events should carry globally unique `event_id`, canonical account identity
where known, `robot_id`, stable `conversation_id` and unique `message_id` for
successful user messages. No message body is needed. Emit:

| Action | Event / result |
|---|---|
| Actual chat page shown, from every entry path | `chat_page_view` |
| User message persisted successfully | `message_send`, `result=success` |
| Unlock actually granted | `image_unlock_result`, `result=success` |
| User presses send-gift button | `gift_send_click` |
| Gift debit and delivery committed | `gift_send_result`, `result=success` |
| Conversation deletion succeeds | `chat_session_dispose`, `result=success` |
| Enter recharge flow | `click_mcoin_topup_entry` |
| Recharge page actually displayed | `coin_recharge_page_view` |
| Recharge purchase button clicked | `recharge_option_click` |
| Currency ledger adjustment | `coin_balance_change`, before/after and change_type |

All recharge events carry the same canonical `user_key` (via identity mapping),
`flow_id` and `source_page`: **coin_store** for the full recharge page,
**coin_topup_modal** for the other recharge sheet. Confirm these enum assignments
against the two screenshots with the App owner when wiring the SDK. Other offers
must have their own explicit page ID. A flow ID starts when entering that flow;
do not use a mutable subscriber attribute to infer historical purchase provenance.

`image_unlock_confirm`, `gift_item_click` and old NPC confirmation clicks remain
intent events; they are not promoted to success. `user_message_send`,
`Send_text_fromKeyboard` and `message_send` must not be summed.

Use globally unique conversation IDs, including on delete/recreate. The backend
feeds `created`, `opened`, `user_message`, `deleted` facts; a new creation record
can declare `history_complete=true` only when every successful historical message
for that conversation is supplied. Keep deleted records. For partial historical
exports use false. Message facts need unique message IDs and original timestamps;
do not import a current cumulative count as though it were a past snapshot.

Identity records map GA4 instance IDs to the same canonical keys used in
transactions, with non-overlapping valid_from/valid_to intervals. Close an old
mapping on logout/account switch. Do not merge all activity on a shared device
into one account. RevenueCat mapping additionally uses source=revenuecat.
Verified robot aliases are optional; without them only explicit robot_id is used.
151 robot names were mapped from the supplied ID/name export; no ID equivalence
between robot_id and virtual_id was guessed.

## Server feed and historical import

`POST /api/moment/ingest`, Authorization: `Bearer MOMENT_INGEST_SECRET`.
This endpoint is for a trusted backend, NEVER a secret shipped inside the App.
The optional dashboard cookie login is not used for feed authentication. Each
request has `{"feed":"transactions","rows":[...]}` with 1–250 validated rows.
Supported feeds: conversations, transactions, products, identities, robot_aliases.
DDL column names define row fields. `ingested_at` is assigned by this server.

```
npm run import:analytics -- normalized.json
npm run import:analytics -- normalized.json --send
```

First command validates only. The second explicitly sends to MOMENT_INGEST_URL;
remote destinations require HTTPS. Ingestion never creates tables or grants IAM.
BigQuery streaming deduplication is best-effort; read queries also deduplicate.
Conversation event IDs are immutable. Transaction state versions use the same
store/transaction_id, with original purchased_at and monotonically increasing
**effective** updated_at; identical retries must contain identical values.

### Transactions and catalog

All imported transactions must already be verified by RevenueCat/the store.
`amount` is original charge in ISO currency, `amount_usd` the verified original USD
amount, `refund_usd` cumulative refunded USD as of updated_at, `usd_source` a
traceable provenance string. Fully refunded status requires equal charge/refund;
partial refunds retain paid status. Reports use latest state effective by period
end, and charge-minus-refund revenue attributed to the original purchase date.
They are net-of-refund purchase revenue, not store settlement after commission/tax.

Product catalog keys are store + actual product_id. Kind is subscription or
non_subscription; subscriptions require weekly/monthly/annual period. Do not
infer type from a display name. Latest catalog row wins. Missing product mappings
hide subscription totals and remain unknown in revenue classification.

Subscriptions take precedence over page-based revenue. For non-subscription
products, the two recharge pages classify as recharge; another confirmed page
classifies as bundle; missing provenance stays unknown. All four categories sum
to total revenue without adding GA4 purchase telemetry.

### RevenueCat inbox and reconciliation

`POST /api/moment/revenuecat-webhook` durably records authenticated events. Configure
the exact App ID and a separate webhook secret. It stores an inbox, not an
unverified financial shortcut. Production purchase/refund exports and historical
events can be reconciled with:

```
npm run reconcile:revenuecat -- inbox-and-context.json normalized.json
npm run import:analytics -- normalized.json
```

Input shape: `{events:[{event:{...RevenueCat event...}}], identities:[{source_id,
user_key,valid_from,valid_to}], contexts:[{store,transaction_id,source_page,flow_id,
platform,version,country}]}`. Identity intervals refer to RevenueCat app_user_id;
aliases/transfers require backend confirmation, not automatic person merging.
Context is supplied per transaction by the purchasing backend.

RevenueCat `price` is already USD; price_in_purchased_currency is the original
currency amount. The reconciler handles INITIAL_PURCHASE, RENEWAL,
NON_RENEWING_PURCHASE and explicit negative-price refund adjustments. Free trials
and sandbox are excluded. Initial/renewal labels follow RC event types (a trial
conversion reported as RENEWAL remains a renewal). Ordinary cancellation is not
a refund. Ambiguous refunds, reversals without receipt reconciliation, conflicting
identities and missing original purchases are exceptions, never guessed. The CLI
exits 2 and the importer refuses exports with pending exceptions. A backend worker
must resolve them from receipts and provide full state versions before advancing
coverage. Historical purchases absent from the inbox require store/RC exports.

Official field reference:
https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields

## Acceptance / rollout

- `npm test`: exact calendar windows, activation cohorts, lifetime-as-of counts,
  delete/recreate, unknown histories, transaction retries, partial/full refunds,
  inactive renewals, user unions, unknown provenance and currency reconciliation.
- `npm run lint`; `npm run build`; inspect English/Chinese, narrow tables and
  independent date selectors in the local preview.
- Before production: BigQuery dry-run all configured queries with the actual
  service account and timezone; replay the 2026-10-29/30 event baseline and inspect
  original 361/243 reported events. Missing IDs prevent a unique-message claim.
- Reconcile original two $5.62 telemetry components with actual receipts. New
  verified revenue need not equal the previous geo-converted telemetry total.
- Verify all App entry paths, gift/unlock results, identity account switching,
  both recharge pages, missing-entry flows and zero-message conversations.
- Check each coverage watermark and product mapping; review preview with product
  and data owners, then deploy using the repository's normal release process.

Not performed locally: production dataset creation/import, App/backend deployment,
receipt acquisition, live-source reconciliation, and production release. Those
require the actual App/backend sources, credentials, timezone and validated exports.
