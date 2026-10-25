# ADR-0006: HLS with AAC, three renditions, two-second segments

**Status:** Accepted · **Date:** 2026-10-25

## Context

Audio delivery is the core technical function. The choice determines adaptive
behaviour, seek granularity, CDN cacheability, access control, and whether
synchronized room playback is achievable at all.

## Options considered

1. **Progressive download** — a single file served with HTTP byte-range support
2. **HLS** — segmented, multi-rendition, `hls.js` on the client
3. **DASH** — segmented, broader codec support, no native Safari support
4. **HLS + real DRM** (Widevine / FairPlay)

## Decision

HLS with AAC-LC. Three renditions at 64, 128 and 256 kbps. **Two-second
segments.** Signed master playlist URLs with a 60-second expiry. Progressive
download retained as a fallback for unsupported clients.

## Rationale

- Segmented delivery gives genuine adaptive bitrate — the client switches
  rendition mid-track as bandwidth changes. Byte-range progressive download
  cannot do this and would make the mobile experience poor.
- Immutable segments are ideal for CDN caching. This is what makes the
  bandwidth model in `03-capacity-and-cost.md` work: ~80–90% origin offload for
  free on Cloudflare.
- **Two-second segments specifically because of ADR-0001.** Seek granularity is
  bounded by segment duration; synchronized room playback needs sub-250 ms
  accuracy. A conventional 6–10 second segment length would make the thesis
  feature impossible. This is the clearest example in the project of a product
  decision constraining a media decision five weeks earlier.
- AAC-LC over Opus: AAC has universal browser and iOS support in HLS. Opus is
  technically better at low bitrate but HLS support is patchy. Not worth the risk.
- Option 4 is rejected: real DRM requires a license server and platform
  agreements, and the catalog is Creative Commons, so DRM would be protecting
  content that is licensed to be shared. Token-gated delivery with short-lived
  signed URLs is the honest level of protection here, and the gap will be
  documented rather than hidden.

## Consequences

- Two-second segments mean ~120 segment files per track per rendition, so ~360
  files per track. 5,000 tracks is ~1.8 M objects. MinIO handles this, but the
  flat-prefix layout matters — partition by `tracks/{id[0:2]}/{id}/...` to avoid
  hot prefixes.
- More HTTP requests per minute of playback than longer segments. Mitigated by
  HTTP/2 and HTTP/3 multiplexing at the edge.
- Slightly higher container overhead (~2–3% bitrate) versus longer segments.
  Accepted.
- `hls.js` is required on non-Safari browsers (~45 KB gzip). Safari plays HLS
  natively, which means two code paths to test.
- Signed URL expiry must exceed the longest expected track plus clock skew
  allowance, or the playlist must be refreshable mid-track. Decision: sign the
  *master playlist* for 60 s and let it return relative segment URLs under a
  path-scoped cookie valid for 4 hours.
