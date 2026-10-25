# ADR-0002: Go for core services, TypeScript for BFF and identity

**Status:** Accepted · **Date:** 2026-10-25

## Context

The project is a learning vehicle as much as a product. The stack choice trades
development velocity against depth of systems learning. A single developer has
8 weeks.

## Options considered

1. **Go + TypeScript** — Go for catalog/playback/social/worker, TS for BFF/identity
2. **All TypeScript** — NestJS everywhere, shared types front-to-back
3. **Java/Spring or C#/.NET** — maximum enterprise realism
4. **Python + TypeScript** — FastAPI backend

## Decision

Option 1.

- **Go:** `catalog-svc`, `playback-svc`, `social-svc`, `media-worker`, `analytics-svc`
- **TypeScript:** `bff` (NestJS), `identity-svc` (NestJS), `web` (Next.js)
- **Python:** `reco-svc` only, and only if stretch scope is reached

## Rationale

- `social-svc` must hold thousands of mostly-idle WebSocket connections. Go's
  goroutine-per-connection model with ~4 KB stacks is the right tool; Node's
  single-threaded event loop with per-connection closures is workable but worse,
  and the learning value of understanding why is high.
- `media-worker` orchestrates ffmpeg subprocesses with bounded concurrency —
  Go's `errgroup` and context cancellation are a clean fit.
- Keeping `bff` in TypeScript lets it share generated types with Next.js, which
  removes a whole class of integration bug and saves real time.
- `identity-svc` in NestJS leverages a mature auth ecosystem (Passport, argon2,
  guards) rather than reimplementing session handling in Go.
- Two languages is the maximum a solo developer should carry. Three (Go, TS,
  Python) is already a stretch and Python is confined to stretch scope.

## Consequences

- Two toolchains in CI, two dependency ecosystems to patch, two sets of lint rules.
- Needs a shared contract layer: Protobuf for internal gRPC, OpenAPI for the
  public API. This is a benefit — it forces contract-first design.
- Slower week 2–3 than all-TypeScript would be. Accepted; the payoff is depth.
- Code sharing between Go services needs an internal module (`pkg/`) with real
  versioning discipline.
