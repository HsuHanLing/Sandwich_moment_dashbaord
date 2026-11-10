# Moment Analytics Dashboard

Next.js dashboard for Moment's GA4 activity, conversation quality and verified in-app purchases.

## Run locally

Use Node 22.17 or newer, then `npm ci`.
Copy `.env.example` to `.env.local` and configure the GA4 property timezone and data sources.
For an explicitly labeled synthetic preview, set `MOMENT_DEMO=true`.

```
npm run dev
npm test
npm run lint
npm run build
```

The KPI, trend and health sections have independent date controls. Analytics v2
uses exact date windows, new-install activation, lifetime conversation counts as
of period end, verified transaction deduplication, and separate initial/renewal
subscription users. Missing authoritative data is shown as unavailable, never zero.

## Connect real data

Read [the integration and rollout guide](docs/analytics-integration.md) for source
schemas, App instrumentation, identity mappings, server feed authentication,
RevenueCat reconciliation, coverage watermarks and acceptance checks.

[Derived BigQuery schemas](sql/analytics-schema.sql) are provided for review and
have not been executed against production. The mobile App/backend code and
production receipt exports are not included in this repository.

New clients use the existing `/api/moment/*` paths with `schema=2`, or the unified
`/api/moment/analytics` endpoint. v1 adapters retain existing route paths with
nullable values and data-quality metadata. RevenueCat chart totals are no longer
mixed with GA4 telemetry to derive verified purchase revenue.
