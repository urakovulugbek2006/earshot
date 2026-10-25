# ADR-0001: Synchronized social listening as the product thesis

**Status:** Accepted · **Date:** 2026-10-25

## Context

A generic music streaming app is a well-trodden portfolio project with low
signalling value. The project needs a differentiator that (a) is genuinely
useful, (b) forces engagement with hard distributed-systems problems, and
(c) is memorable to a reviewer.

## Options considered

1. **Synchronized social listening rooms** — shared playback, queue, chat
2. **Creator-first analytics** — artist dashboards over an event pipeline
3. **Local scene discovery** — geo + genre-graph recommendations
4. **Mood/context engine** — ML-driven contextual playlists

## Decision

Option 1. Social listening rooms.

## Rationale

- It is the only option whose core difficulty is *distributed systems* rather
  than data modelling or ML. Clock synchronization, server-authoritative state,
  real-time fanout, optimistic concurrency, and reconnection semantics are all
  unavoidable.
- Its correctness is *demonstrable* — four browsers in a video, all in sync, is
  a better demo than any dashboard.
- Options 2 and 3 are partially achievable as Should-have scope anyway (we get
  an event pipeline and an artist dashboard regardless).
- Option 4 requires a large catalog and labelled data we won't have.

## Consequences

- Week 6 is the highest-risk week. `04-listening-rooms-design.md` must be fully
  designed before week 6 begins, not during it.
- The audio ladder must use 2-second HLS segments (see ADR-0006) to make seek
  granularity fine enough for sync. A week-3 decision constrained by a week-6
  feature.
- `social-svc` needs a language with cheap concurrency — this partly drives
  ADR-0002.
- Discovery and recommendation features are deliberately thinner than they would
  otherwise be. Accepted.
