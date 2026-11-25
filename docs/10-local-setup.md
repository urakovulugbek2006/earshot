# Running Earshot locally

## Prerequisites

| Tool | Version | Why |
|---|---|---|
| Node | 22+ | the web app, BFF and identity service |
| pnpm | 10+ | workspaces across the monorepo |
| Go | 1.24+ | catalog, playback, social, media-worker, analytics |
| Docker + Compose | recent | the six data stores |

```bash
corepack enable          # gives you the pnpm version this repo pins
pnpm install
cp .env.example .env
```

## Docker Hub rate limits — read this before the first `up`

**Unauthenticated Docker Hub pulls are rate-limited.** You will hit it, and the
error does not look like a quota problem:

```
toomanyrequests: You have reached your unauthenticated pull rate limit.
```

Run `docker login` once with any free Docker Hub account and it goes away.

It matters for more than convenience:

- **CI will hit the same limit**, from a shared runner IP, far sooner than you
  will. When CI starts pulling images (week 2 integration tests with
  testcontainers, week 8 deploys), it needs either a registry login in secrets
  or images mirrored somewhere without a limit.
- Mirrors that do not rate-limit — AWS ECR Public
  (`public.ecr.aws/docker/library/...`), `quay.io`, GitHub Container Registry —
  are the usual answer. Worth deciding before week 8 rather than during it.

One tag is deliberately **not** pinned: MinIO. Its tags are timestamps
(`RELEASE.2025-…`), and a guessed one is worse than `latest`. Pin it from a
real `docker pull` output before week 8.

## Start the data layer

```bash
pnpm up            # docker compose up -d
docker compose ps  # all six should report healthy or running
pnpm down
```

### Without Docker

Docker is not always available — the cloud container this was partly built in
has the CLI but no daemon. Postgres and Redis install directly:

```bash
sudo apt-get install -y postgresql-16 redis-server
sudo pg_ctlcluster 16 main start
redis-server --daemonize yes

sudo -u postgres psql -c "create role earshot login password 'earshot_dev_only' superuser;"
sudo -u postgres createdb -O earshot earshot
```

That covers everything needed up to week 5.

MinIO, Redpanda and ClickHouse **do** install without Docker on a normal
machine — MinIO is a single binary, and the other two publish apt repositories.
Docker is still the better choice for them locally: six services with pinned
versions, one `up`, one `down`, and nothing left installed on the host when
you are finished.

A note for anyone running this in a restricted environment: their download
hosts (`dl.min.io`, `packages.clickhouse.com`, `dl.redpanda.com`) may be
blocked by an egress proxy even when apt and npm are not, and Ubuntu's own
`clickhouse-server` package is from 2018 and not worth using. In that case
those three cannot be verified locally at all, and the compose file is the
only path.

| Service | Port | What it is for |
|---|---|---|
| PostgreSQL | 5432 | Source of truth. One schema per service, no cross-schema reads (ADR-0005) |
| Redis | 6379 | Sessions, token denylist, playback queue, room state, presence, rate limits |
| Meilisearch | 7700 | Search projection, built from the event log (ADR-0007) |
| MinIO | 9000 / 9001 | HLS segments and artwork · S3 API / web console |
| Redpanda | 9092 / 9644 | Kafka API · the outbox relay publishes here |
| ClickHouse | 8123 / 9009 | Play events and artist analytics |

ClickHouse's native port is remapped to **9009** because MinIO already holds
9000. Easy to lose an hour to.

## Migrations

```bash
export DATABASE_URL=postgres://earshot:earshot_dev_only@127.0.0.1:5432/earshot
pnpm --filter @earshot/identity migrate
```

Each service owns its own migrations and its own schema (ADR-0005). The runner
applies `.sql` files in lexical order, records a checksum of each, wraps each
in a transaction, and **refuses to run if an already-applied file has
changed** — editing an applied migration works on the machine where the change
is also in the database and silently does nothing on the server where it is
not.

## Tests and the two database engines

```bash
pnpm --filter @earshot/identity test     # PGlite — PostgreSQL in WASM, ~2s
DATABASE_URL=postgres://earshot:earshot_dev_only@127.0.0.1:5432/earshot \
  pnpm --filter @earshot/identity test   # the same suite, real server
```

The default needs no database at all, so the tests are cheap enough to run on
every save. But PGlite is a different major version from the one production
pins, so CI runs the identical suite against a real Postgres service too. That
second job is what makes the fast one trustworthy.

It has already paid for itself: `query()` in PGlite goes over the extended
protocol and rejects multi-statement SQL, while `pg` happens to allow it for
parameterless queries. The migration runner now uses `exec` where the driver
has one. A single-engine suite would not have found that until deployment.

## Design tokens

`design/tokens.json` is the source of truth. The CSS is generated:

```bash
pnpm tokens        # design/tokens.json -> packages/tokens/dist/theme.css
```

The generated file is **not committed** — CI regenerates it and fails if the
output differs from what the repo contains, so a hand-edit cannot survive
review.

The build is also the test. It fails on:

- a `{primitive.*}` reference that does not resolve
- a semantic token present in one theme but missing from the other — which
  would otherwise mean a component that works in night and silently breaks in
  light
- any token holding pure white, which [ADR-0015](adr/0015-violet-grounds.md)
  forbids

It is about a hundred dependency-free lines rather than Style Dictionary.
Style Dictionary earns its keep across several output platforms (CSS, Swift,
Kotlin); Earshot emits one. If a native client ever appears, swap the script
and keep `tokens.json` untouched — that is what the DTCG format is for.

## Everything at once

```bash
pnpm up            # data layer
pnpm dev           # every app and service in watch mode (turbo)
```

## Repository layout

```
apps/web/          Next.js 15 — the client
services/          Go services
packages/
  tokens/          design/tokens.json -> CSS custom properties
  ui/              component library + Storybook
  contracts/       OpenAPI + protobuf, generated types
docs/              architecture, scope, ADRs
design/            tokens.json (source of truth) + the design system's README
```
