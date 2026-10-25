# ADR-0004: Docker Compose for development, k3s for production

**Status:** Accepted · **Date:** 2026-10-25

## Context

The project will run on a single self-managed server. Orchestration learning is
an explicit goal, but Kubernetes imposes a real velocity cost during feature
development.

## Options considered

1. **Compose (dev) → k3s (prod), migrating in weeks 7–8**
2. **k3s everywhere from day one** (k3d locally)
3. **Compose everywhere**, Caddy for TLS
4. **Nomad**, or a managed PaaS (Fly.io / Railway)

## Decision

Option 1. Docker Compose for local development throughout. Deliberate migration
to single-node k3s as a week 7–8 learning milestone.

## Rationale

- Compose keeps weeks 2–6 fast. Eight datastores come up with one command and
  iteration is immediate.
- Migrating *after* the system exists means you encounter the problems
  Kubernetes actually solves — service discovery, config and secret management,
  health gating, resource limits, rolling updates — as problems you already have,
  rather than as abstractions you're told to adopt. This is the single biggest
  pedagogical argument.
- Option 2's dev/prod parity benefit is real but costs several days in weeks 2–4,
  which is where the feature risk is.
- Option 3 is entirely viable for one server and genuinely simpler, but skips the
  orchestration learning that is a stated goal.
- Option 4's PaaS variants remove the infrastructure learning this project exists
  to deliver.

## Consequences

- Dev/prod divergence through week 6. Mitigated by: identical container images in
  both, all configuration via environment variables, and no Compose-only features.
- Week 7–8 carries migration risk. Mitigated by writing the k8s manifests
  incrementally from week 5 (one service at a time, unvalidated) rather than all
  at once.
- Two deployment descriptions to maintain. Accepted; the Compose file is
  dev-only and can diverge.
- Single-node k3s has no real high availability. Documented as a known limitation
  rather than solved — multi-node is explicitly out of scope.
