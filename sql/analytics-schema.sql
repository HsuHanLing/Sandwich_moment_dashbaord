-- Run only after reviewing the target project/location with your data owner.
-- These are derived analytics tables. GA4 events_* is never modified.
CREATE SCHEMA IF NOT EXISTS `sandwich-original.moment_analytics` OPTIONS(location='us-east1');

CREATE TABLE IF NOT EXISTS `sandwich-original.moment_analytics.conversation_events` (
  event_id STRING NOT NULL, conversation_id STRING NOT NULL, user_key STRING NOT NULL,
  robot_id STRING NOT NULL, event_type STRING NOT NULL, message_id STRING,
  occurred_at TIMESTAMP NOT NULL, history_complete BOOL NOT NULL,
  environment STRING NOT NULL, platform STRING NOT NULL, version STRING, country STRING NOT NULL,
  ingested_at TIMESTAMP NOT NULL
) PARTITION BY DATE(occurred_at) CLUSTER BY conversation_id,user_key;

-- Append full state versions, not deltas. updated_at is the effective time of
-- the state change, NOT import/ingestion time. Initial state uses purchase time.
CREATE TABLE IF NOT EXISTS `sandwich-original.moment_analytics.transactions` (
  store STRING NOT NULL, transaction_id STRING NOT NULL, user_key STRING NOT NULL,
  product_id STRING NOT NULL, purchased_at TIMESTAMP NOT NULL, updated_at TIMESTAMP NOT NULL,
  amount FLOAT64 NOT NULL, currency STRING NOT NULL, amount_usd FLOAT64 NOT NULL,
  refund_usd FLOAT64 NOT NULL, usd_source STRING NOT NULL,
  verified BOOL NOT NULL, environment STRING NOT NULL, status STRING NOT NULL,
  purchase_type STRING NOT NULL, source_page STRING, flow_id STRING,
  platform STRING NOT NULL, version STRING, country STRING NOT NULL, ingested_at TIMESTAMP NOT NULL
) PARTITION BY DATE(purchased_at) CLUSTER BY store,transaction_id,user_key;

CREATE TABLE IF NOT EXISTS `sandwich-original.moment_analytics.products` (
  store STRING NOT NULL, product_id STRING NOT NULL, kind STRING NOT NULL,
  period STRING, ingested_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS `sandwich-original.moment_analytics.identities` (
  source STRING NOT NULL, source_id STRING NOT NULL, user_key STRING NOT NULL,
  valid_from TIMESTAMP NOT NULL, valid_to TIMESTAMP, ingested_at TIMESTAMP NOT NULL
) CLUSTER BY source,source_id;

CREATE TABLE IF NOT EXISTS `sandwich-original.moment_analytics.robot_aliases` (
  virtual_id STRING NOT NULL, robot_id STRING NOT NULL, ingested_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS `sandwich-original.moment_analytics.revenuecat_inbox` (
  event_id STRING NOT NULL, event_type STRING NOT NULL, payload STRING NOT NULL,
  received_at TIMESTAMP NOT NULL
) PARTITION BY DATE(received_at) CLUSTER BY event_id;
