# ADR-0007: Transactional outbox for all event publishing

**Status:** Accepted · **Date:** 2026-10-25

## Context

ADR-0005 forbids cross-schema reads and requires that projections (Meilisearch,
ClickHouse) be built from the event log rather than written directly. That rule
only holds if events are published *reliably*. A service that commits a database
transaction and then publishes to Kafka as a second step can crash between the
two, and the projection silently diverges from the source of truth — with no
error anywhere to tell you.

This is the "dual-write problem", and it is the most common way an
event-driven system quietly becomes wrong.

## Options considered

1. **Transactional outbox** — write the event to an `outbox` table inside the
   same transaction as the business data; a separate relay publishes it
2. **Dual write** — commit, then publish, and hope
3. **Change Data Capture** (Debezium on the Postgres WAL)
4. **Event sourcing** — the event log *is* the write model

## Decision

Option 1. Every service that produces events writes them to its own schema's
`outbox` table in the same transaction as the state change. A relay (a goroutine
in the owning service, polling with `FOR UPDATE SKIP LOCKED`) publishes rows to
Kafka and marks them sent.

Consumers are **idempotent receivers**, keyed on `event_id`, because the outbox
guarantees at-least-once delivery, not exactly-once.

## Rationale

- It makes the atomicity real: either the track row and its `track.published`
  event both exist, or neither does. One transaction, one fate.
- `FOR UPDATE SKIP LOCKED` lets the relay scale to multiple instances without a
  distributed lock — a genuinely elegant Postgres feature worth learning.
- Option 2 is the bug this ADR exists to prevent.
- Option 3 is operationally excellent and is how large systems do it, but
  Debezium needs Kafka Connect, a schema registry and WAL slot management —
  several GB of RAM and days of setup for one server (see
  `03-capacity-and-cost.md`). Noted as the scaling path.
- Option 4 is a 3-week detour. We use an event log for projections without
  making it the write model.

## Consequences

- Each service schema gains an `outbox` table: `id`, `aggregate_type`,
  `aggregate_id`, `event_type`, `payload` (jsonb), `created_at`, `published_at`.
- Events arrive **at least once and out of order**. Every consumer must be
  idempotent and must not assume ordering across aggregates. Ordering *within*
  an aggregate comes from partitioning Kafka by `aggregate_id`.
- Publishing is asynchronous, so projections are eventually consistent. The
  search index may lag a newly published track by a second or two. This is
  correct behaviour, not a bug — but the UI must not imply otherwise, so an
  upload confirmation says "publishing" rather than "live".
- Needs a monitored metric: `outbox_unpublished_age_seconds`. If the relay dies,
  the system keeps accepting writes and looks healthy while every projection
  goes stale. **Alert on this in week 8** — it is exactly the kind of silent
  failure the observability stack exists to catch.
- A dedicated test: kill the process between commit and publish, restart, assert
  the event still arrives.
