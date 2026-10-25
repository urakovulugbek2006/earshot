# ADR-0005: Five services, shared Postgres with schema-per-service

**Status:** Accepted · **Date:** 2026-10-25

## Context

Learning microservices is an explicit goal. Building twelve services solo in
eight weeks is a known failure mode — the time goes into configuration and
plumbing rather than into the problems distribution actually poses.

## Options considered

1. **Modular monolith**, extract one or two services later
2. **Five services + one worker + one consumer**, shared Postgres instance with
   a schema per service
3. **Fully independent services**, one database instance each
4. **Ten-plus fine-grained services**

## Decision

Option 2.

Services: `bff`, `identity-svc`, `catalog-svc`, `playback-svc`, `social-svc`,
plus `media-worker` and `analytics-svc`. One Postgres instance, one schema per
owning service, no cross-schema reads.

## Rationale

- Five services is enough to encounter every genuine distributed-systems
  problem: service discovery, inter-service authentication, distributed tracing,
  contract testing, eventual consistency between a write store and its
  projections, partial failure, and idempotency.
- The boundaries follow real differences in scaling profile and language choice,
  not arbitrary subdivision: `social-svc` is connection-bound, `catalog-svc` is
  read-bound, `media-worker` is CPU-bound.
- Option 1 teaches good modularity but never forces a network boundary, which is
  where the interesting failures live.
- Option 3 is architecturally correct but wastes 8–12 GB of RAM on a single
  server for no learning gain beyond what schema separation already provides.
- Option 4 is the failure mode described above.

## Consequences

- **Known compromise:** a shared Postgres instance is a shared failure domain and
  a shared resource-contention point. Real microservices would not do this.
  Mitigated by strict schema ownership, separate database users with grants
  limited to their own schema (so the rule is *enforced*, not just agreed), and
  separate connection pools.
- Migrating to separate instances later is straightforward precisely because no
  cross-schema query exists. The grant structure guarantees this.
- Projections (Meilisearch, ClickHouse) are built from the Kafka event log, never
  by dual-write. This is the main eventual-consistency lesson and must not be
  shortcut under schedule pressure.
- No service mesh. mTLS comes from k3s, tracing from OpenTelemetry directly.
  Istio on one node would be pure overhead.
