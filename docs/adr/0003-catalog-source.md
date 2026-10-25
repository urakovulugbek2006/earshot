# ADR-0003: Creative Commons seed catalog plus user uploads

**Status:** Accepted · **Date:** 2026-10-25

## Context

Streaming commercially licensed music requires per-territory licensing deals
costing millions of dollars. This is an absolute constraint, not a preference.
The app nonetheless needs to feel populated to be demonstrable, and the upload
and transcode pipeline is one of the most valuable things to build.

## Options considered

1. **CC catalog seed + user uploads** (hybrid)
2. **User uploads only** — SoundCloud/Bandcamp model
3. **CC catalog only** — import and serve

## Decision

Option 1. Seed ~2,000 tracks from the Jamendo API (and Free Music Archive as a
secondary source), and build a full upload → transcode → publish pipeline.

## Rationale

- Option 3 skips the ingest pipeline, which is the most instructive part of the
  media engineering work.
- Option 2 leaves the app empty, making search, discovery, charts, and
  recommendations impossible to demonstrate or meaningfully test.
- The hybrid gives realistic data volume for search and analytics *and* the full
  pipeline.
- Both source catalogs expose real metadata (artist, album, genre, tags,
  duration, artwork) so the data model is exercised properly.

## Consequences

- **Attribution is a hard requirement.** CC licenses (mostly BY, BY-SA, BY-NC)
  require visible attribution. The data model needs `license`, `license_url`,
  `attribution_text`, and `source_url` on every track, and the UI must display
  them. Non-negotiable.
- The importer must respect Jamendo API rate limits and be resumable.
- Uploads create a content moderation obligation — an admin review queue moves
  from Should-have toward Must-have if uploads are ever opened publicly. For the
  demo, uploads are restricted to invited accounts.
- Takedown handling and a DMCA-style process must at least be documented, even
  if not built.
- A clear "no commercial music" note belongs in the README so no reviewer
  misreads the project's intent.
