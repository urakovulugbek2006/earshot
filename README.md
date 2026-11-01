# Earshot

**A music streaming service built around synchronized social listening.** Open a
room, share a link, and everyone hears the same track at the same millisecond —
with a shared queue and live chat.

> **Status: Week 0 of 8 — architecture and design.** No application code yet.
> What exists today is the design record: 8 ADRs, a capacity model, a full
> technical design for the hard feature, and the design token system.

---

## Why this exists

This is a deliberate learning project, built over 8 weeks to go deep on system
architecture, distributed systems, design systems, QA, security, networking and
operations — ending with a self-managed production deployment.

It is **not** a Spotify clone. The thesis is synchronized listening, because
that is where the genuinely hard problems live: clock synchronization across
clients on different networks, server-authoritative shared state, real-time
fanout across replicas, and reconnection semantics.

### Legal note

**Earshot streams no commercially licensed music.** Per-territory licensing for
a commercial catalog costs millions of dollars, so the catalog is Creative
Commons — seeded from [Jamendo](https://www.jamendo.com) and the
[Free Music Archive](https://freemusicarchive.org) — plus tracks uploaded by
their own creators. Every track carries its licence, attribution text and
source URL in the data model, and the UI displays them. See
[ADR-0003](docs/adr/0003-catalog-source.md).

---

## Architecture at a glance

```
Web (Next.js)
     ↓ HTTPS / WSS
Traefik — TLS, HTTP/3, rate limiting
     ↓
bff ──┬── identity-svc    (NestJS)  users, sessions, tokens
      ├── catalog-svc     (Go)      tracks, artists, search projection
      ├── playback-svc    (Go)      queue, now-playing, signed media URLs
      └── social-svc      (Go)      WebSocket hub, room clock, presence, chat

media-worker  (Go + ffmpeg)  transcode → HLS, waveform, artwork
analytics-svc (Go)           Kafka → ClickHouse

PostgreSQL · Redis · Meilisearch · MinIO · Redpanda · ClickHouse
OpenTelemetry → Prometheus · Grafana · Loki · Tempo
```

Five services, not twelve. The boundaries follow real differences in scaling
profile and language choice — `social-svc` is connection-bound, `catalog-svc`
is read-bound, `media-worker` is CPU-bound — and the reasoning is recorded in
[ADR-0005](docs/adr/0005-service-decomposition.md), including the compromise
we knowingly made.

## The design record

Start here. The documents are the project at this stage.

| Document | What it covers |
|---|---|
| [Project plan](docs/00-project-plan.md) | 8 weeks, one primary discipline each, exit criteria, working agreements |
| [Scope](docs/01-scope.md) | MoSCoW, explicit *won't-haves*, scope tripwires |
| [Architecture (C4)](docs/02-architecture-c4.md) | Context and container views, service boundaries, the five rules |
| [Capacity & cost](docs/03-capacity-and-cost.md) | Bandwidth, storage, CPU and RAM budgets → server spec → SLOs |
| [Listening rooms design](docs/04-listening-rooms-design.md) | Clock sync, drift correction, coordinated start, WebSocket scaling |
| [Patterns & algorithms](docs/05-patterns-and-algorithms.md) | Patterns and data structures mapped per week, plus what we deliberately avoid |
| [How to draw system design](docs/06-how-to-draw-system-design.md) | The method, written while learning it |
| [Layers & DDD](docs/07-layers-and-ddd.md) | Controller / application / domain / infrastructure, and where we deliberately don't use DDD |
| [ADRs](docs/adr/) | Eight decisions, each with the rejected options and why |
| [Design system](design/) | Token source of truth, light and dark |

## Three decisions worth skipping to

**[ADR-0006](docs/adr/0006-audio-delivery.md) — two-second HLS segments.** The
industry default is 6–10 seconds. But seek granularity is bounded by segment
duration, and synchronized room playback needs sub-250ms accuracy — so a
conventional ladder would make the entire thesis feature impossible. A week-3
media decision constrained by a week-6 product requirement.

**[ADR-0007](docs/adr/0007-transactional-outbox.md) — the transactional
outbox.** Commit to Postgres, then publish to Kafka as a second step, crash in
between, and the search index silently diverges from the truth with no error
anywhere. The outbox makes the two atomic. The operational consequence is the
interesting part: if the relay dies, the system keeps accepting writes and
*looks completely healthy* while every projection goes stale.

**[ADR-0008](docs/adr/0008-design-direction.md) — light as the primary theme.**
Music apps are dark by convention. Earshot is light, because the subject of the
design is the *people in the room*, not the album art. Dark is a first-class
theme, not a retrofit — and it is not an inversion: `border-strong` flips to a
*light* value so the 2px edge language stays visible.

---

## Repository layout

```
docs/          Architecture, scope, capacity, designs, ADRs
docs/notes/    One-paragraph decision notes per algorithm implemented by hand
design/        Design tokens — the source of truth for every colour and scale
```

Application code lands from week 2 as a monorepo: `apps/` for deployables,
`services/` for Go services, `packages/` for shared contracts and types.

## Licence

Code is MIT (see [LICENSE](LICENSE)). **This does not extend to catalog
content** — every track keeps its own Creative Commons licence and attribution,
recorded per-track in the data model.
