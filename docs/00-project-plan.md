# Earshot — Project Plan

> **Name:** `earshot` — github.com/urakovulugbek2006/earshot
> **Duration:** 8 weeks core + 2 weeks buffer/stretch
> **Team:** 1 architect (you) + 1 implementer (Claude)
> **Status:** Week 0 — planning

---

## 1. Product thesis

A music streaming service built around **synchronized social listening**. Users don't
just listen alone — they open a *room*, invite others, and everyone hears the same
track at the same millisecond, with a shared queue and live chat.

**Why this thesis:**
- It is the hardest distributed-systems problem in a consumer music app (clock sync,
  shared mutable state, real-time fanout, reconnection semantics).
- It is a genuine differentiator — Spotify Jam exists but is thin and mobile-only.
- It forces you to learn things a CRUD app never would.

**Non-goals.** This is not a Spotify clone. We will deliberately ship *fewer*
discovery features in order to ship rooms properly.

---

## 2. Locked decisions

| Area | Decision | ADR |
|---|---|---|
| Product thesis | Synchronized social listening rooms | [0001](adr/0001-product-thesis.md) |
| Backend languages | Go (core services) + TypeScript (BFF, identity) + Python (reco) | [0002](adr/0002-backend-stack.md) |
| Catalog source | Jamendo/FMA Creative Commons seed + user uploads | [0003](adr/0003-catalog-source.md) |
| Infrastructure | Docker Compose (dev) → k3s (prod, week 7–8) | [0004](adr/0004-infrastructure.md) |
| Service decomposition | 5 services + 1 worker, no more | [0005](adr/0005-service-decomposition.md) |
| Audio delivery | HLS/AAC, 3 renditions, signed playlists | [0006](adr/0006-audio-delivery.md) |

---

## 3. Learning objectives mapped to weeks

Each week has one **primary** discipline. Nothing is learned "in passing" — if a
discipline doesn't have a week and a deliverable, it doesn't get learned.

| Week | Primary discipline | Secondary |
|---|---|---|
| 0 | System architecture, requirements engineering | Capacity planning, ADR practice |
| — | **Design patterns + algorithms/data structures run through every week** — see `05-patterns-and-algorithms.md` | |
| 1 | UI/UX design, design systems | Data modelling, API contract design |
| 2 | Platform engineering, CI/CD, observability | Auth & session security |
| 3 | Media engineering, async processing | Object storage, queue semantics |
| 4 | Frontend engineering (hard: audio state machine) | Caching, CDN, adaptive bitrate |
| 5 | Search engineering, event-driven architecture | Eventual consistency |
| 6 | Distributed real-time systems | WebSocket scaling, clock sync |
| 7 | Security, QA, performance engineering | Load testing, accessibility |
| 8 | Networking, ops, SRE | Backup/restore, incident response |

---

## 4. Week-by-week plan

### Week 0 — Discovery & architecture (3–4 days) ← *you are here*
**Deliverables**
- [x] Product thesis + non-goals
- [x] Scope (MoSCoW) — `01-scope.md`
- [x] C4 Level 1 + Level 2 — `02-architecture-c4.md`
- [x] Capacity & cost estimate — `03-capacity-and-cost.md`
- [x] Listening-rooms technical design — `04-listening-rooms-design.md`
- [x] 6 ADRs
- [ ] Competitive audit (you: Spotify Jam, SoundCloud, Tidal, Bandcamp — 2h)
- [x] Pick a project name — **Earshot**
- [ ] Repo scaffold + GitHub Project board
- [ ] You redraw the C4 diagrams yourself in Excalidraw/draw.io — **do not skip this**

**Exit criteria:** you can explain the whole system to a stranger in 10 minutes
without looking at notes.

---

### Week 1 — Design & contracts
**Deliverables**
- User flows for 6 core journeys (signup, browse, play, create playlist, host room, join room)
- Low-fi wireframes → hi-fi Figma for 8 screens
- Design tokens (color, type, space, radius, motion) as JSON → Tailwind theme
- Component inventory (~25 components) in Storybook skeleton
- ERD: `users`, `artists`, `albums`, `tracks`, `playlists`, `rooms`, `play_events`
- `openapi.yaml` for the public API; `.proto` files for internal gRPC
- `asyncapi.yaml` for the event schema

**Exit criteria:** every API endpoint the frontend will call is specified before
any of it is built. The prototype is clickable.

---

### Week 2 — Walking skeleton
The most important week. One thin slice, end to end, production-shaped.

**Deliverables**
- Monorepo (Turborepo + Go workspaces), `docker-compose.yml` with all 8 datastores
- `identity-svc`: register, login, refresh rotation, logout, argon2id
- `bff`: gateway, auth middleware, request ID propagation
- Postgres migrations (golang-migrate), seed script
- Next.js app: login page, authenticated shell, design tokens wired
- GitHub Actions: lint → unit → integration (testcontainers) → build → push to GHCR
- OpenTelemetry → Grafana + Tempo + Loki + Prometheus, all running locally
- One Playwright E2E test: "a user can sign up, log in, and see their empty library"

**Exit criteria:** you log in through a browser and watch the distributed trace of
your own request cross three services in Tempo.

---

### Week 3 — Ingest pipeline
**Deliverables**
- `catalog-svc` (Go): artists/albums/tracks CRUD, gRPC + REST
- `media-worker` (Go): consumes `track.uploaded`, runs ffmpeg → HLS (3 renditions),
  extracts ID3/metadata, generates waveform peaks JSON, resizes cover art
- MinIO buckets with lifecycle policy; masters → archive tier, HLS → hot
- Multipart/resumable upload with presigned URLs (client uploads direct to MinIO)
- Jamendo importer: pull ~2,000 CC tracks with attribution metadata
- Admin UI: upload, review queue, publish/unpublish
- Idempotent job handling + dead-letter queue + retry with backoff

**Exit criteria:** you drop an MP3 in, and 30 seconds later it's a playable
multi-bitrate HLS stream with artwork and a waveform.

---

### Week 4 — Playback
**Deliverables**
- Player: `hls.js`, ABR, gapless-ish transitions, scrubbing with waveform, volume curve
- Audio state machine (XState or hand-rolled) — this is where naive players fall apart
- `playback-svc` (Go): queue, now-playing, shuffle/repeat, cross-device resume (Redis)
- Signed HLS playlist URLs, 60s expiry, per-session key rotation
- Media Session API (OS-level media keys, lock screen art)
- `play.started` / `play.progress` / `play.completed` events → Kafka
- Caddy caching of HLS segments; `Cache-Control` strategy per file type

**Exit criteria:** pause on your laptop mid-track, open your phone, hit play, it
resumes at the same second.

---

### Week 5 — Library, search, discovery
**Deliverables**
- Playlists (CRUD, reorder, collaborative flag), likes, follows
- Meilisearch indexed via Kafka consumer (not dual-write) — typo tolerance, facets, synonyms
- Search UI: debounced, keyboard-navigable, grouped results, recent searches
- Home page: recently played, made-for-you (tag-based v1), new releases, top charts
- `analytics-svc`: Kafka → ClickHouse; materialized views for play counts
- Artist page with real listen stats

**Exit criteria:** search returns in <100ms p99 and tolerates two typos; play
counts are correct and derived from the event stream, not an incremented column.

---

### Week 6 — Listening rooms (the thesis)
See `04-listening-rooms-design.md` for the full design.

**Deliverables**
- `social-svc` (Go): WebSocket hub, room lifecycle, server-authoritative playback clock
- NTP-style clock sync handshake; drift correction via `playbackRate` nudging
- Coordinated start barrier (buffer-then-start-at-T)
- Shared queue with permission modes (host-only / open / DJ rotation)
- Presence via Redis heartbeats + reaper; join/leave events
- Live chat with reactions, rate limited
- Redis pub/sub fanout so rooms work across `social-svc` replicas
- Reconnect with version-based delta resync
- Multi-client Playwright test asserting drift < 250ms across 4 browser contexts

**Exit criteria:** four browser windows, two of them throttled to 3G, all playing
the same track within a quarter second of each other.

---

### Week 7 — Hardening: security, QA, performance
**Deliverables**
- STRIDE threat model → prioritised findings → fixes (track in an issue per finding)
- `security-review` pass: authz on every endpoint (IDOR hunt), CSP, CSRF, headers
- Secrets out of env files → SOPS+age, k3s sealed secrets
- Rate limiting + abuse controls (per-IP, per-user, per-room)
- Trivy container scanning + Semgrep SAST in CI, Dependabot
- k6 load tests: 500 concurrent streams, 50 rooms × 10 users, search burst
- Performance: N+1 hunt, index review, `EXPLAIN ANALYZE` the 10 slowest queries
- Frontend budget: LCP < 2.0s, TTI < 3.0s, bundle < 250KB gzip initial
- Accessibility audit (axe + manual keyboard/screen-reader pass) → WCAG 2.1 AA
- QA: written test plan, regression suite, 1 full manual round, bug bash

**Exit criteria:** load test report + closed security findings + green a11y audit,
all committed to the repo.

---

### Week 8 — Production
**Deliverables**
- Buy the server (see `03-capacity-and-cost.md` for specs)
- Terraform: provision server, DNS, firewall, storage box
- Ansible: SSH hardening (keys only, no root, non-standard port), nftables,
  fail2ban, unattended-upgrades, WireGuard for admin plane
- k3s single-node: migrate all Compose services, Traefik ingress, cert-manager TLS
- Postgres WAL-G continuous backup → Storage Box; ClickHouse + MinIO backup
- **Restore drill:** wipe the DB, restore from backup, time it, document it
- Grafana dashboards + Alertmanager → your phone; define 4 SLOs with error budgets
- Argo CD or deploy-on-tag via Actions; rolling update with health gates
- Runbooks: deploy, rollback, DB restore, certificate renewal, disk full
- **Incident simulation:** break prod on purpose, follow the runbook, write a
  blameless postmortem
- Portfolio: architecture doc, demo video, README, 1 blog post

**Exit criteria:** it's live on your domain over HTTP/3, you've restored from
backup once, and you've survived one self-inflicted incident.

---

### Weeks 9–10 — Buffer / stretch (pick at most two)
- Expo mobile app with offline downloads
- Collaborative-filtering recommendations (Python, implicit ALS)
- Stripe subscriptions in test mode (webhooks, idempotency, dunning)
- Time-synced lyrics
- Feature flags (Unleash) + an A/B test with real event data

---

## 5. Working agreements

### Division of labour

| Area | Owner | Model |
|---|---|---|
| Architecture, scope, all ADRs | **You** | You decide; Claude drafts options and consequences |
| Diagrams | **You** | You redraw every diagram by hand. Non-negotiable. |
| Visual design | **Claude proposes, you direct** | Claude produces design options; you pick a direction and name the sections to change. Art-director model, not designer model. |
| Design tokens | **Claude**, reviewed by you | JSON source of truth → Tailwind theme + CSS vars |
| Player UI (audio state machine, hls.js, drift correction) | **You write the core**, Claude scaffolds | Guided authorship — see below |
| `social-svc` (WS hub, clock sync, room state) | **You write the core**, Claude scaffolds | Guided authorship — see below |
| Everything else | **Claude** | You review every PR |

### Guided authorship — how the two components you own actually get written

You said you don't want to write *much* code, but you do want to understand HLS
and real-time systems. So the volume stays low and the density stays high:

1. **Claude writes an explainer first** (~1 page) on the specific mechanism, with
   the relevant spec/API references. You read it before any code exists.
2. **Claude scaffolds the plumbing** — types, interfaces, wiring, tests, error
   handling, the boring 80%.
3. **You write the 50–200 lines that contain the actual idea**, against failing
   tests that already describe the correct behaviour. For the player that's the
   state machine transitions and the drift corrector. For `social-svc` it's the
   clock-offset estimator and the state-mutation path.
4. **Claude reviews your code** the way a senior would — correctness first, then
   idiom.
5. **You explain it back** in two or three sentences. If you can't, step 1 was
   not good enough and we redo it.

Target: you personally write **roughly 900 lines across the whole project** —
raised from 600 to cover the 14 starred algorithm exercises in
`05-patterns-and-algorithms.md`, which are exactly the code worth writing by
hand. Still a small volume; the highest possible density.

### Cadence
- Monday: 30 min — pick the week's scope, update the board
- Daily: short async check-in on what's blocked
- Friday: record a 5-minute demo video of what moved. No demo = the week didn't count.

### Standards
**Git discipline:** trunk-based, short-lived branches, conventional commits,
squash merge, PR template with a "what did I learn" field.

**Definition of done:** merged + tested + traced + documented + demoable. A PR
introducing a starred algorithm additionally links its explainer note in
`docs/notes/` and its benchmark numbers.

**The scope rule:** when a week overruns, cut features, never cut weeks 7-8.
A small app that is secured, tested, observed and properly deployed teaches
far more than a feature-rich localhost demo.

### Known tooling constraint
The Figma MCP connector failed to connect (proxy 403) as of 2026-10-25. Until it
is reauthorized, design work is delivered as rendered HTML pages plus a JSON
token file. The token pipeline is unaffected; only the Figma canvas is missing.
Revisit before week 1 hi-fi work.
